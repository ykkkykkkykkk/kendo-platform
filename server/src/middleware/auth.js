import jwt from 'jsonwebtoken';
import { db } from '../db.js';

/**
 * 요청자의 IP. Render 프록시 뒤라 req.ip는 X-Forwarded-For에서 온다
 * (index.js의 trust proxy 설정에 기댄다).
 * IPv4-mapped IPv6(::ffff:1.2.3.4)는 보기 불편해서 IPv4로 되돌린다.
 */
export function clientIp(req) {
  const ip = req.ip ?? req.socket?.remoteAddress ?? null;
  if (!ip) return null;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

/**
 * 로그인한 회원의 최근 접속 시각과 IP를 남긴다.
 *
 * 요청마다 UPDATE를 날리면 부담되므로 마지막 기록이 10분보다 오래됐을 때만 쓴다.
 * (WHERE로 걸러서 대부분의 요청은 아무 행도 건드리지 않는다)
 * 응답을 늦추지 않도록 기다리지 않고, 실패해도 요청 처리에는 영향을 주지 않는다.
 */
export function touchLastSeen(userId, ip = null) {
  if (!userId) return;
  db.execute({
    sql: `UPDATE users SET last_seen_at = datetime('now'),
                           last_ip = COALESCE(?, last_ip)
          WHERE id = ?
            AND (last_seen_at IS NULL OR last_seen_at < datetime('now', '-10 minutes'))`,
    args: [ip, userId],
  }).catch(() => { /* 접속 기록 실패가 요청을 막을 이유는 없다 */ });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: '인증이 필요합니다.' });

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    touchLastSeen(req.user.userId, clientIp(req));
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}
