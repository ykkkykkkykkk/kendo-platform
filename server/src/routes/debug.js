import { Router } from 'express';
import { db } from '../db.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

/* GET /api/debug/ip — 요청자 본인의 IP가 어떻게 보이는지 확인한다.
   프록시가 몇 단인지 모르면 trust proxy 값을 잘못 잡아 엉뚱한 주소가 기록된다.
   자기 자신의 접속 정보만 돌려주므로 남의 정보는 새지 않는다. */
router.get('/ip', (req, res) => {
  res.json({
    req_ip:   req.ip,                                   // trust proxy 설정에 따라 결정된 값
    req_ips:  req.ips,                                  // 신뢰 체인에서 추려낸 목록
    x_forwarded_for: req.headers['x-forwarded-for'] ?? null,
    x_real_ip:       req.headers['x-real-ip'] ?? null,
    cf_connecting_ip: req.headers['cf-connecting-ip'] ?? null,
    socket:   req.socket?.remoteAddress ?? null,        // 바로 앞 홉
    trust_proxy_setting: req.app.get('trust proxy'),
  });
});

// GET /api/debug — DB 상태 확인 (프로덕션 차단)
router.get('/', async (_req, res) => {
  if (process.env.NODE_ENV === 'production')
    return res.status(403).json({ error: '프로덕션에서는 접근할 수 없습니다.' });

  try {
    const [
      { rows: users },
      { rows: follows },
      { rows: predictions },
    ] = await Promise.all([
      db.execute(
        `SELECT id, nickname, phone, created_at FROM users ORDER BY created_at DESC`
      ),
      db.execute(
        `SELECT f.user_id, u.nickname AS user_nickname,
                f.player_id, p.name  AS player_name,
                f.created_at
         FROM follows f
         JOIN users   u ON u.id = f.user_id
         JOIN players p ON p.id = f.player_id
         ORDER BY f.created_at DESC`
      ),
      db.execute(
        `SELECT pr.id,
                u.nickname  AS user_nickname,
                pa.name     AS player_a,
                pb.name     AS player_b,
                pw.name     AS predicted_player,
                m.round,
                pr.predicted_at
         FROM predictions pr
         JOIN users   u  ON u.id  = pr.user_id
         JOIN matches m  ON m.id  = pr.match_id
         LEFT JOIN players pa ON pa.id = m.player_a_id
         LEFT JOIN players pb ON pb.id = m.player_b_id
         LEFT JOIN players pw ON pw.id = pr.predicted_winner_player_id
         ORDER BY pr.predicted_at DESC`
      ),
    ]);

    res.json({ users, follows, predictions });
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
