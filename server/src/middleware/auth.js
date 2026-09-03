import jwt from 'jsonwebtoken';
import { db } from '../db.js';

/** 10.x / 172.16~31.x / 192.168.x / 127.x / ::1 — 인터넷에 없는 주소. 이게 잡히면 잘못 읽은 것이다. */
function isPrivate(ip) {
  return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd)/i.test(ip);
}

/**
 * 요청자의 IP.
 *
 * Render 앞에 Cloudflare가 있어 X-Forwarded-For가 세 단이다. index.js의
 * trust proxy 설정으로 req.ip가 맨 앞(실제 사용자)을 가리키게 해두었지만,
 * 체인 길이가 달라지면 사설 주소가 잡힐 수 있다. Cloudflare가 직접 넣어주는
 * cf-connecting-ip를 먼저 보고, 그게 없을 때만 req.ip를 쓴다.
 * 그래도 사설 주소면 잘못 읽은 것이므로 기록하지 않는다(엉뚱한 값으로 같은 IP처럼
 * 묶여 중복 가입으로 오해하는 게 기록이 없는 것보다 나쁘다).
 */
export function clientIp(req) {
  const raw = req.headers['cf-connecting-ip']
           ?? req.ip
           ?? req.socket?.remoteAddress
           ?? null;
  if (!raw) return null;
  const ip = String(raw).startsWith('::ffff:') ? String(raw).slice(7) : String(raw);
  return isPrivate(ip) ? null : ip;
}

/**
 * 로그인한 회원의 최근 접속 시각과 IP를 남긴다.
 *
 * 요청마다 UPDATE를 날리면 부담되므로 마지막 기록이 일정 시간보다 오래됐을 때만 쓴다.
 * (WHERE로 걸러서 대부분의 요청은 아무 행도 건드리지 않는다)
 * 응답을 늦추지 않도록 기다리지 않고, 실패해도 요청 처리에는 영향을 주지 않는다.
 *
 * 간격을 10분에서 3분으로 줄였다 — 어드민의 '현재 접속자'가 10분 간격으로만
 * 갱신되면 방금 들어온 사람이 한참 안 보인다. 활동 중인 회원 수십 명 규모라
 * 3분마다 한 번씩 늘어나는 쓰기는 부담이 되지 않는다.
 */
const TOUCH_EVERY = '-3 minutes';

export function touchLastSeen(userId, ip = null) {
  if (!userId) return;
  db.execute({
    sql: `UPDATE users SET last_seen_at = datetime('now'),
                           last_ip = COALESCE(?, last_ip)
          WHERE id = ?
            AND (last_seen_at IS NULL OR last_seen_at < datetime('now', ?))`,
    args: [ip, userId, TOUCH_EVERY],
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
