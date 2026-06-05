import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';
import { recalcDojoScore } from '../services/pickService.js';

const router = Router();

function normalize(name) {
  return name.toLowerCase().replace(/\s+/g, '');
}

function daysRemaining(endDate) {
  return Math.max(0, Math.ceil((new Date(endDate) - Date.now()) / 86400000));
}

// ── A-1. 도장 검색 (자동완성) ────────────────────────────────────
// GET /api/dojos/search?q=강남
router.get('/dojos/search', async (req, res) => {
  try {
    const q = (req.query.q ?? '').trim();
    if (!q) return res.json([]);

    const norm = normalize(q);
    const { rows } = await db.execute({
      sql:  `SELECT id, name, member_count
             FROM dojos
             WHERE normalized_name LIKE ?
             ORDER BY member_count DESC
             LIMIT 10`,
      args: [`%${norm}%`],
    });
    res.json(rows);
  } catch (e) { serverError(res, e, 'A-1'); }
});

// ── A-2. 도장 등록 또는 가입 ─────────────────────────────────────
// POST /api/dojos/join
router.post('/dojos/join', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '도장 이름을 입력해주세요.' });

    const normName = normalize(name.trim());
    const userId   = req.user.userId;

    // 현재 소속 도장 확인
    const { rows: [me] } = await db.execute({
      sql: 'SELECT dojo_id FROM users WHERE id = ?', args: [userId],
    });
    const prevDojoId = me?.dojo_id ?? null;

    // 도장 조회 or 생성
    let { rows: [dojo] } = await db.execute({
      sql: 'SELECT * FROM dojos WHERE normalized_name = ?', args: [normName],
    });

    if (!dojo) {
      const { lastInsertRowid } = await db.execute({
        sql:  'INSERT INTO dojos (name, normalized_name) VALUES (?, ?)',
        args: [name.trim(), normName],
      });
      const { rows: [created] } = await db.execute({
        sql: 'SELECT * FROM dojos WHERE id = ?', args: [Number(lastInsertRowid)],
      });
      dojo = created;
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
