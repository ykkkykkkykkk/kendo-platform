import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';
import { recalcDojoScore } from '../services/pickService.js';

const router = Router();

function normalize(name) {
  return name.toLowerCase().replace(/\s+/g, '');
}

/* 접미사를 뗀 핵심 이름.
   '강인'과 '강인검도관', '동우'와 '동우검도관'은 같은 도장인데 자유 입력이라
   따로 만들어져 왔다. 도장 100개 중 72개가 1명짜리가 된 원인이다. */
function baseName(name) {
  return normalize(name).replace(/(검도관|검도장|검도교실|검도부|관|장)$/, '');
}

/** 이름이 사실상 같은 도장들 (핵심 이름 일치) */
async function findSimilar(name) {
  const base = baseName(name);
  if (!base) return [];
  const { rows } = await db.execute('SELECT id, name, normalized_name, member_count FROM dojos');
  return rows
    .filter((d) => baseName(d.name) === base)
    .sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0));
}

function daysRemaining(endDate) {
  return Math.max(0, Math.ceil((new Date(endDate) - Date.now()) / 86400000));
}

/* ── 8월 도장 이벤트 ────────────────────────────────────────────
 * 관원이 가장 많은 도장에 죽도 10자루.
 *
 * 원래는 '8월 신규 가입 수'로 셌는데 총 관원 수로 바꿨다(2026-08-31).
 * 8월 전부터 회원을 모아온 도장이 신규만 세면 오히려 불리해진다.
 * 기간은 이벤트 노출 기간으로만 남는다 — 집계는 가입 시점을 보지 않는다.
 *
 * 팔로워 수 채우기용 시드 계정(가라팬)은 실제 가입자가 아니라 제외한다.
 */
const EVENT_START = '2026-08-01';
const EVENT_END   = '2026-08-31';
const NOT_SEED    = "(u.phone IS NULL OR u.phone NOT LIKE '검도팬_%')";
// 가입할 때 도장을 안 적어서 '없음'으로 들어간 사람들. 도장을 등록한 게 아니라 집계에서 뺀다.
// (도장 행 자체는 지우지 않는다 — 소속 기록은 그대로 둔다)
const NOT_BLANK   = "d.name NOT IN ('없음', '무소속', '-')";

// GET /api/dojos/august-event — 이벤트 현황 (공개)
router.get('/dojos/august-event', async (req, res) => {
  try {
    const { rows } = await db.execute({
      /* 8월 말까지 가입한 관원만 센다. 총 관원 수로 세면서 상한을 안 두면 9월에도
         숫자가 계속 늘어 발표한 순위가 나중에 뒤집힌다. 상한을 두면 8월 안에는
         결과가 지금과 같고(미래 가입자가 있을 리 없다), 9월 1일부터 그대로 굳는다.
         응답 필드 이름은 new_members 그대로 둔다 — 배너·팝업이 이 이름으로 읽는다. */
      sql: `SELECT d.id, d.name, COUNT(u.id) AS new_members
            FROM dojos d
            JOIN users u ON u.dojo_id = d.id
                        AND date(u.created_at, '+9 hours') <= ?
                        AND ${NOT_SEED}
            WHERE ${NOT_BLANK}
            GROUP BY d.id
            HAVING new_members > 0
            ORDER BY new_members DESC, d.name`,
      args: [EVENT_END],
    });

    res.json({
      start_date: EVENT_START,
      end_date:   EVENT_END,
      // 공동 순위: 같은 인원이면 같은 등수.
      // 5위까지 준다 — 결과 발표 팝업이 등수대로 죽 보여준다.
      top: rows.slice(0, 5).map((r) => ({
        ...r,
        rank: rows.findIndex((x) => x.new_members === r.new_members) + 1,
      })),
      participating_dojos: rows.length,
      total_new_members:   rows.reduce((sum, r) => sum + Number(r.new_members), 0),
    });
  } catch (e) { serverError(res, e, 'august-event'); }
});

// ── A-1. 도장 검색 (자동완성) ────────────────────────────────────
// GET /api/dojos/search?q=강남
router.get('/dojos/search', async (req, res) => {
  try {
    const q = (req.query.q ?? '').trim();
    if (!q) return res.json([]);

    // 접미사를 뗀 이름으로도 찾는다. '강인'을 쳐도 '강인검도관'이 나와야 한다.
    const norm = normalize(q);
    const base = baseName(q);
    const { rows } = await db.execute({
      sql:  `SELECT id, name, member_count
             FROM dojos
             WHERE normalized_name LIKE ? ${base ? 'OR normalized_name LIKE ?' : ''}
             ORDER BY member_count DESC
             LIMIT 10`,
      args: base ? [`%${norm}%`, `%${base}%`] : [`%${norm}%`],
    });
    res.json(rows);
  } catch (e) { serverError(res, e, 'A-1'); }
});

// ── A-2. 도장 등록 또는 가입 ─────────────────────────────────────
// POST /api/dojos/join
router.post('/dojos/join', requireAuth, async (req, res) => {
  try {
    // dojo_id로 고르는 게 기본. name은 목록에 없는 도장을 새로 만들 때만 쓴다.
    const { dojo_id, name, create_new } = req.body;
    if (!dojo_id && !name?.trim())
      return res.status(400).json({ error: '도장을 골라주세요.' });

    const userId = req.user.userId;

    // 현재 소속 도장 확인
    const { rows: [me] } = await db.execute({
      sql: 'SELECT dojo_id FROM users WHERE id = ?', args: [userId],
    });
    const prevDojoId = me?.dojo_id ?? null;

    let dojo;
    if (dojo_id) {
      const { rows: [found] } = await db.execute({
        sql: 'SELECT * FROM dojos WHERE id = ?', args: [dojo_id],
      });
      if (!found) return res.status(404).json({ error: '그런 도장이 없습니다.' });
      dojo = found;
    } else {
      const normName = normalize(name.trim());
      const { rows: [exact] } = await db.execute({
        sql: 'SELECT * FROM dojos WHERE normalized_name = ?', args: [normName],
      });
      dojo = exact;

      if (!dojo) {
        // 이름만 조금 다른 같은 도장이 이미 있으면 새로 만들지 않고 되묻는다.
        // ('강인'과 '강인검도관'이 따로 생기던 문제)
        const similar = await findSimilar(name.trim());
        if (similar.length && !create_new) {
          return res.status(409).json({
            error: '이미 등록된 도장이 있습니다. 맞는 도장을 골라주세요.',
            similar,
          });
        }
        const { lastInsertRowid } = await db.execute({
          sql:  'INSERT INTO dojos (name, normalized_name) VALUES (?, ?)',
          args: [name.trim(), normName],
        });
        const { rows: [created] } = await db.execute({
          sql: 'SELECT * FROM dojos WHERE id = ?', args: [Number(lastInsertRowid)],
        });
        dojo = created;
      }
    }

    // 이미 같은 도장이면 그냥 반환
    if (prevDojoId === dojo.id) return res.json({ dojo });

    // 유저 도장 업데이트
    await db.execute({
      sql: 'UPDATE users SET dojo_id = ? WHERE id = ?', args: [dojo.id, userId],
    });

    // 이전 도장 member_count 재계산
    if (prevDojoId) await recalcDojoScore(prevDojoId);

    // 새 도장 score + member_count 재계산
    await recalcDojoScore(dojo.id);

    const { rows: [updated] } = await db.execute({
      sql: 'SELECT * FROM dojos WHERE id = ?', args: [dojo.id],
    });

    res.json({ dojo: updated });
  } catch (e) { serverError(res, e, 'A-2'); }
});

// ── A-3. 내 도장 정보 ────────────────────────────────────────────
// GET /api/dojos/my
router.get('/dojos/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { rows: [me] } = await db.execute({
      sql: 'SELECT dojo_id FROM users WHERE id = ?', args: [userId],
    });
    if (!me?.dojo_id) return res.json({ dojo: null, season: null });

    const { rows: [dojo] } = await db.execute({
      sql: 'SELECT * FROM dojos WHERE id = ?', args: [me.dojo_id],
    });

    const { rows: [season] } = await db.execute(
      "SELECT * FROM seasons WHERE is_active = 1 LIMIT 1"
    );

    // 내 기여 점수
    const { rows: [myRow] } = await db.execute({
      sql: `SELECT COALESCE(SUM(tp.score), 0) AS my_score
            FROM tournament_picks tp
            WHERE tp.user_id = ?
              AND tp.created_at >= ?
              AND tp.created_at <= ?`,
      args: [userId,
             season?.start_date ?? '2000-01-01',
             (season?.end_date ?? '2099-12-31') + ' 23:59:59'],
    });

    // 현재 순위 (5명 이상 도장 중)
    const { rows: above } = await db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM dojos
            WHERE total_score > ? AND member_count >= 5
              AND id != ?`,
      args: [dojo.total_score, dojo.id],
    });
    const currentRank = dojo.member_count >= 5 ? Number(above[0].cnt) + 1 : null;

    res.json({
      dojo: { ...dojo, current_rank: currentRank },
      season: season ? {
        name:          season.name,
        end_date:      season.end_date,
        days_remaining: daysRemaining(season.end_date),
      } : null,
      is_qualified:    dojo.member_count >= 5,
      my_contribution: Number(myRow.my_score),
    });
  } catch (e) { serverError(res, e, 'A-3'); }
});

// ── A-4. 도장 랭킹 ───────────────────────────────────────────────
// GET /api/dojos/ranking?season_id=current
router.get('/dojos/ranking', async (req, res) => {
  try {
    const userId = req.headers.authorization
      ? (() => { try { return JSON.parse(atob(req.headers.authorization.split('.')[1])).userId; } catch { return null; } })()
      : null;

    const { rows: [season] } = await db.execute(
      "SELECT * FROM seasons WHERE is_active = 1 LIMIT 1"
    );

    // 5명 이상 도장만 랭킹
    const { rows: ranked } = await db.execute({
      sql:  `SELECT d.id, d.name, d.member_count, d.total_score
             FROM dojos d
             WHERE d.member_count >= 5
             ORDER BY d.total_score DESC, d.member_count DESC
             LIMIT 50`,
      args: [],
    });

    const ranking = await Promise.all(ranked.map(async (d, i) => {
      // 상위 기여자 3명
      const { rows: topUsers } = await db.execute({
        sql: `SELECT u.nickname, COALESCE(SUM(tp.score), 0) AS score
              FROM users u
              LEFT JOIN tournament_picks tp ON tp.user_id = u.id
                AND tp.created_at >= ?
                AND tp.created_at <= ?
              WHERE u.dojo_id = ?
              GROUP BY u.id
              ORDER BY score DESC LIMIT 3`,
        args: [season?.start_date ?? '2000-01-01',
               (season?.end_date ?? '2099-12-31') + ' 23:59:59',
               d.id],
      });
      return {
        rank:             i + 1,
        dojo_id:          d.id,
        name:             d.name,
        member_count:     d.member_count,
        total_score:      d.total_score,
        top_contributors: topUsers.map((u) => u.nickname),
      };
    }));

    // 내 도장 위치
    let myDojo = null;
    if (userId) {
      const { rows: [me] } = await db.execute({
        sql: 'SELECT dojo_id FROM users WHERE id = ?', args: [userId],
      });
      if (me?.dojo_id) {
        const { rows: [md] } = await db.execute({
          sql: 'SELECT id, name, member_count, total_score FROM dojos WHERE id = ?',
          args: [me.dojo_id],
        });
        if (md) {
          const inRanking = ranking.find((r) => r.dojo_id === md.id);
          const { rows: above } = await db.execute({
            sql: `SELECT COUNT(*) AS cnt FROM dojos
                  WHERE total_score > ? AND member_count >= 5`,
            args: [md.total_score],
          });
          myDojo = {
            rank:         md.member_count >= 5 ? Number(above[0].cnt) + 1 : null,
            dojo_id:      md.id,
            name:         md.name,
            member_count: md.member_count,
            total_score:  md.total_score,
            is_qualified: md.member_count >= 5,
            in_ranking:   !!inRanking,
          };
        }
      }
    }

    res.json({ season, ranking, my_dojo: myDojo });
  } catch (e) { serverError(res, e, 'A-4'); }
});

// ── A-5. 도장 변경 요청 ──────────────────────────────────────────
// POST /api/dojos/change-request
router.post('/dojos/change-request', requireAuth, async (req, res) => {
  try {
    const { new_dojo_name, reason } = req.body;
    if (!new_dojo_name?.trim()) return res.status(400).json({ error: '새 도장 이름을 입력해주세요.' });

    const now = new Date().toISOString();
    await db.execute({
      sql: `UPDATE users
            SET dojo_change_requested_at = ?,
                home_dojo = COALESCE(home_dojo, '')
            WHERE id = ?`,
      args: [now + '|' + new_dojo_name.trim() + '|' + (reason ?? ''), req.user.userId],
    });

    res.json({ success: true, message: '운영자 확인 후 처리됩니다.' });
  } catch (e) { serverError(res, e, 'A-5'); }
});

// ── A-6. 지난 시즌 결과 ──────────────────────────────────────────
// GET /api/seasons/past?limit=4
router.get('/seasons/past', async (req, res) => {
  try {
    const limit = Math.min(10, parseInt(req.query.limit) || 4);

    const { rows: seasons } = await db.execute({
      sql: `SELECT * FROM seasons
            WHERE is_active = 0 AND finalized_at IS NOT NULL
            ORDER BY end_date DESC LIMIT ?`,
      args: [limit],
    });

    const result = await Promise.all(seasons.map(async (s) => {
      const { rows: winners } = await db.execute({
        sql: `SELECT di.rank, di.total_score, di.prize_tier, di.status,
                     d.name AS dojo_name
              FROM dojo_invitations di
              JOIN dojos d ON d.id = di.dojo_id
              WHERE di.season_id = ?
              ORDER BY di.rank ASC`,
        args: [s.id],
      });
      return { season_name: s.name, end_date: s.end_date, winners };
    }));

    res.json(result);
  } catch (e) { serverError(res, e, 'A-6'); }
});

export default router;
