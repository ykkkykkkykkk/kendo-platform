// 홈 대시보드가 쓰는 요약 한 방.
//
// 홈은 앱을 열면 제일 먼저 뜨는 화면이라 요청이 여러 개로 갈라지면 그만큼 늦게 채워진다.
// 대회·내 점수·도장·응원 선수·최근 글을 한 번에 만들어 준다.
//
// 로그인하지 않아도 열린다 — 비로그인 화면도 숫자(대회·최근 글)는 채워져야 하기 때문이다.
// 토큰이 있으면 '내 것'이 붙는다.
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

/** 토큰이 있으면 사용자 id, 없거나 깨졌으면 null. 비로그인도 그냥 통과시킨다. */
function optionalUserId(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET).userId ?? null;
  } catch { return null; }
}

/* 누가 열어도 같은 값(대회·최근 글)은 잠깐 담아 둔다.
   홈은 앱을 열 때마다 불리는데 이 부분은 몇 초 사이에 바뀌지 않는다. */
const CACHE_MS = 30_000;
let publicCache = { at: 0, data: null };

async function publicPart() {
  if (publicCache.data && Date.now() - publicCache.at < CACHE_MS) return publicCache.data;

  /* 픽을 아직 받는 대회. 부문마다 마감이 다를 수 있어(023) 부문 단위로 본다.
     시각 비교는 앱 전체가 쓰는 방식(JS Date)을 그대로 따른다 — SQL에서 비교하면
     저장된 문자열 형식에 따라 결과가 달라진다. */
  const { rows: divisions } = await db.execute(`
    SELECT td.id AS division_id, td.division_type,
           COALESCE(td.pick_deadline, t.pick_deadline) AS deadline,
           t.id AS tournament_id, t.name, t.slug, t.status, t.start_date
    FROM tournament_divisions td
    JOIN tournaments t ON t.id = td.tournament_id
    WHERE t.status != '종료'
  `);

  const now = Date.now();
  const open = divisions
    .filter((d) => d.deadline && new Date(d.deadline).getTime() > now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  let tournament = null;
  if (open.length) {
    const first = open[0];                       // 가장 먼저 마감되는 부문이 급한 것
    const mine  = open.filter((d) => d.tournament_id === first.tournament_id);
    tournament = {
      id:            first.tournament_id,
      name:          first.name,
      slug:          first.slug,
      deadline:      first.deadline,
      open_division_ids: mine.map((d) => d.division_id),
      // 단체전이 열려 있으면 그걸 안내 문구에 쓴다
      has_team_division: mine.some((d) => d.division_type.endsWith('_team')),
    };
  }

  // 진행 중인 대회가 없을 때 대신 보여줄 최근 대회 — 홈에 빈칸을 남기지 않는다
  const { rows: [recent] } = await db.execute(`
    SELECT id, name, slug FROM tournaments
    ORDER BY (start_date IS NULL), start_date DESC, id DESC LIMIT 1
  `);

  const { rows: news } = await db.execute(`
    SELECT b.id, b.title, b.comment_count, b.created_at, u.nickname
    FROM board_posts b
    JOIN users u ON u.id = b.user_id
    WHERE b.is_blinded = 0
    ORDER BY b.id DESC LIMIT 3
  `);

  const data = { tournament, recent_tournament: recent ?? null, news };
  publicCache = { at: Date.now(), data };
  return data;
}

// GET /api/home/summary
router.get('/home/summary', async (req, res) => {
  try {
    const userId = optionalUserId(req);
    const base   = await publicPart();

    if (!userId) return res.json({ ...base, user: null });

    const { rows: [user] } = await db.execute({
      sql: `SELECT u.id, u.nickname, u.dojo_id, d.name AS dojo_name,
                   d.member_count, d.total_score
            FROM users u LEFT JOIN dojos d ON d.id = u.dojo_id
            WHERE u.id = ?`,
      args: [userId],
    });
    if (!user) return res.json({ ...base, user: null });

    /* 내 점수. '이번 주'는 최근 7일 안에 한 픽으로 얻은 점수다 —
       점수가 매겨진 시각은 따로 남지 않아 픽한 시각을 기준으로 센다. */
    const { rows: [score] } = await db.execute({
      sql: `SELECT COALESCE(SUM(score), 0) AS total,
                   COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-7 days')
                                     THEN score ELSE 0 END), 0) AS week,
                   COUNT(*) AS pick_count
            FROM tournament_picks WHERE user_id = ?`,
      args: [userId],
    });

    // 내가 이 대회에 이미 픽했는지 — 버튼 문구가 바뀐다
    let myPicked = false;
    if (base.tournament?.open_division_ids?.length) {
      const ids = base.tournament.open_division_ids;
      const { rows: [p] } = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM tournament_picks
              WHERE user_id = ? AND division_id IN (${ids.map(() => '?').join(',')})`,
        args: [userId, ...ids],
      });
      myPicked = Number(p.n) > 0;
    }

    /* 도장 순위. 랭킹은 5명 이상인 도장만 센다(도장 랭킹 화면과 같은 기준). */
    let dojo = null;
    if (user.dojo_id) {
      const { rows: [above] } = await db.execute({
        sql: `SELECT COUNT(*) AS cnt FROM dojos
              WHERE total_score > ? AND member_count >= 5`,
        args: [user.total_score ?? 0],
      });
      dojo = {
        id:           user.dojo_id,
        name:         user.dojo_name,
        member_count: user.member_count ?? 0,
        total_score:  user.total_score ?? 0,
        qualified:    (user.member_count ?? 0) >= 5,
        rank:         (user.member_count ?? 0) >= 5 ? Number(above.cnt) + 1 : null,
      };
    }

    // 응원 중인 선수 — 얼굴이 있으면 얼굴로 보여준다
    const { rows: follows } = await db.execute({
      sql: `SELECT p.id, p.name, p.slug, p.face_image_url, p.profile_image_url, t.color_primary
            FROM follows f
            JOIN players p ON p.id = f.player_id
            LEFT JOIN teams t ON t.id = p.team_id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC LIMIT 12`,
      args: [userId],
    });

    /* 아무도 응원하지 않는 사람에게는 추천 선수를 보여준다.
       팬 많은 순으로 깔면 이미 팬이 많은 선수만 계속 쌓이므로, 선수 계정으로
       최근 활동한 선수를 앞에 둔다(선수 목록 API와 같은 기준). */
    let suggested = [];
    if (!follows.length) {
      const { rows } = await db.execute(`
        SELECT p.id, p.name, p.slug, p.face_image_url, p.profile_image_url,
               t.name AS team_name, t.color_primary
        FROM players p
        JOIN teams t ON t.id = p.team_id
        LEFT JOIN users u ON u.player_id = p.id AND u.role = 'player'
        ORDER BY (u.last_seen_at IS NULL), u.last_seen_at DESC, p.id
        LIMIT 3
      `);
      suggested = rows;
    }

    res.json({
      ...base,
      user: { id: user.id, nickname: user.nickname },
      score: {
        total: Number(score.total), week: Number(score.week),
        pick_count: Number(score.pick_count),
      },
      my_picked: myPicked,
      dojo,
      follows,
      suggested,
    });
  } catch (e) { serverError(res, e, 'home-summary'); }
});

export default router;
