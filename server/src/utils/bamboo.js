// 대나무 물 지급 — 모든 적립이 이 파일 하나를 지난다.
//
// 물을 주는 곳이 픽·응원 댓글·게시판·출석·초대로 흩어져 있어서, 규칙을 각자 두면
// 어디 하나는 반드시 빠진다(선수 계정 제외를 한 군데만 빼먹어도 선수가 물을 받는다).
// 그래서 지급은 grantWater() 하나로만 하고, 예외 판정도 전부 여기서 한다.
//
// 막는 방법은 두 겹이다.
//   1) 코드: 선수 계정·쿨다운·하루 한도·달성 후를 여기서 건다.
//   2) DB: water_logs의 UNIQUE(user_id, source, ref_id)가 최종 방어선이다.
//      코드 검사를 통과해도 같은 활동이면 INSERT가 튕긴다(동시 요청 대비).
//
// 시간은 전부 KST 기준 서버 시간이다. 클라이언트가 보낸 날짜는 쓰지 않는다 —
// 폰 날짜를 어제로 돌리면 출석을 무한히 받을 수 있다.
import { db } from '../db.js';

/* ── 규칙 상수 ── */
export const GOAL = 300;

export const STAGES = [
  { stage: 0, key: 'sprout', name: '죽순',        min: 0,   max: 60  },
  { stage: 1, key: 'young',  name: '어린 대나무', min: 61,  max: 150 },
  { stage: 2, key: 'joint',  name: '마디 생김',   min: 151, max: 250 },
  { stage: 3, key: 'grown',  name: '다 자람',     min: 251, max: 300 },
];

export const AMOUNT = {
  attendance: 2,
  pick:       1,   // 부문당
  pick_bonus: 2,   // 그 대회 전 부문 완료
  comment:    1,   // 하루 2회까지
  board:      1,   // 하루 1회
  invite:     3,   // 7일 활동 확인 후
  streak:     5,   // 10일 연속 출석
};

export const LIMITS = {
  commentPerDay:   2,
  boardPerDay:     1,
  commentMinChars: 10,
  boardMinChars:   20,
  streakEvery:     10,   // 연속 출석 며칠마다 보너스인지
  inviteMinDays:   7,    // 초대받은 사람이 활동해야 하는 일수
  inviteCodeHours: 24,   // 가입 후 초대 코드 입력 유효 시간
  invitePerMonth:  5,
  cooldownDays:    7,    // 죽도 수령 후 재시작까지
};

/* ── KST 시간 ──
   서버는 UTC로 돌지만 출석은 한국 날짜로 끊어야 한다. UTC에 9시간을 더한 뒤
   날짜만 떼는 방식이라 서버 타임존 설정에 영향받지 않는다. */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstNow(at = Date.now()) {
  return new Date(at + KST_OFFSET_MS);
}
/** 'YYYY-MM-DD' (KST) */
export function kstDate(at = Date.now()) {
  return kstNow(at).toISOString().slice(0, 10);
}
/** 'YYYY-MM' (KST) — 월 한도 계산용 */
export function kstMonth(at = Date.now()) {
  return kstDate(at).slice(0, 7);
}
/** KST 날짜 문자열 사이의 일수 차이 (b - a) */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export function stageOf(water) {
  const w = Math.max(0, Math.min(GOAL, water));
  return STAGES.find((s) => w >= s.min && w <= s.max) ?? STAGES[0];
}

/* ── 계정 판별 ──
   선수는 죽도를 쓰는 사람이지 이벤트로 받을 대상이 아니다. 선수 계정에는 물이
   쌓이지 않고 화면에도 대나무가 뜨지 않는다. */
export function isPlayerAccount(user) {
  return user?.role === 'player';
}

/** DB에서 역할을 확인한다 — 토큰만 믿으면 승인 직후 옛 토큰으로 물이 샐 수 있다. */
export async function roleOf(userId) {
  const { rows: [u] } = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ?', args: [userId],
  });
  return u?.role ?? null;
}

/* ── 진행 상태 ── */

/** 없으면 만들어서 돌려준다. */
export async function getProgress(userId) {
  const { rows: [p] } = await db.execute({
    sql: 'SELECT * FROM bamboo_progress WHERE user_id = ?', args: [userId],
  });
  if (p) return p;

  await db.execute({
    sql: 'INSERT OR IGNORE INTO bamboo_progress (user_id) VALUES (?)', args: [userId],
  });
  const { rows: [created] } = await db.execute({
    sql: 'SELECT * FROM bamboo_progress WHERE user_id = ?', args: [userId],
  });
  return created;
}

/** 현재 회차의 실제 물 합계. water_logs가 정본이다. */
export async function sumWater(userId, cycle) {
  const { rows: [r] } = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) AS w FROM water_logs
          WHERE user_id = ? AND cycle = ? AND revoked_at IS NULL`,
    args: [userId, cycle],
  });
  /* 목표를 넘겨 담지 않는다. 마지막 한 번이 목표를 넘길 수 있는데(297에서 연속보너스 +5),
     화면에 '302 / 300'이 뜨면 고장처럼 보인다. 넘친 몫은 버린다. */
  return Math.max(0, Math.min(GOAL, Number(r?.w ?? 0)));
}

/** logs 합계를 progress에 다시 써 넣는다(회수·지급 후 호출). */
export async function syncWater(userId, cycle) {
  const water = await sumWater(userId, cycle);
  const st    = stageOf(water);
  const done  = water >= GOAL;

  await db.execute({
    sql: `UPDATE bamboo_progress
          SET water = ?, stage = ?,
              completed_at = CASE WHEN ? = 1 AND completed_at IS NULL
                                  THEN datetime('now') ELSE completed_at END
          WHERE user_id = ?`,
    args: [water, st.stage, done ? 1 : 0, userId],
  });
  // 회수로 300 아래로 내려가면 달성도 취소된다(죽도 신청은 신청 시점에 다시 검사한다)
  if (!done) {
    await db.execute({
      sql: 'UPDATE bamboo_progress SET completed_at = NULL WHERE user_id = ? AND completed_at IS NOT NULL',
      args: [userId],
    });
  }
  return { water, stage: st };
}

/* ── 지급 ──────────────────────────────────────────────
   반환: { granted, amount, reason }
   reason은 왜 안 줬는지다 — 화면에 그대로 띄우지는 않고 로그·테스트용이다. */
export async function grantWater(userId, { source, refId, amount }) {
  if (!userId || !source || refId === undefined || refId === null)
    return { granted: false, reason: 'bad_args' };

  // 1) 선수 계정은 적립하지 않는다
  if (await roleOf(userId) === 'player') return { granted: false, reason: 'player_account' };

  const p = await getProgress(userId);
  if (!p) return { granted: false, reason: 'no_progress' };

  // 2) 쿨다운 중에는 자라지 않는다 (죽도 받은 직후 1주)
  if (p.cooldown_until && Date.now() < Date.parse(`${p.cooldown_until.replace(' ', 'T')}Z`))
    return { granted: false, reason: 'cooldown' };

  // 3) 이미 다 자랐으면 더 받을 것이 없다
  if (p.water >= GOAL) return { granted: false, reason: 'already_full' };

  const amt = amount ?? AMOUNT[source];
  if (!amt || amt <= 0) return { granted: false, reason: 'bad_amount' };

  // 4) 같은 활동으로 두 번 — UNIQUE가 막는다
  try {
    await db.execute({
      sql: `INSERT INTO water_logs (user_id, cycle, source, amount, ref_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [userId, p.cycle, source, amt, String(refId)],
    });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return { granted: false, reason: 'duplicate' };
    throw e;
  }

  const { water, stage } = await syncWater(userId, p.cycle);
  return { granted: true, amount: amt, water, stage: stage.stage, reason: null };
}

/* 지급을 되돌린다(글·댓글 삭제, 신고 누적). 없으면 조용히 넘어간다.

   글·댓글은 ref_id가 '날짜#대상id' 꼴이라 지울 때는 날짜를 모른다(며칠 전 글일 수 있다).
   그래서 refId(정확히 일치) 대신 targetId(뒤의 #id로 찾기)로도 부를 수 있게 했다. */
export async function revokeWater(userId, { source, refId, targetId, note }) {
  if (!userId) return { revoked: false };

  const byTarget = refId === undefined || refId === null;
  const r = await db.execute({
    sql: `UPDATE water_logs SET revoked_at = datetime('now'), revoke_note = ?
          WHERE user_id = ? AND source = ? AND revoked_at IS NULL
            AND ref_id ${byTarget ? 'LIKE ?' : '= ?'}`,
    args: [note ?? null, userId, source, byTarget ? `%#${targetId}` : String(refId)],
  });
  if (!r.rowsAffected) return { revoked: false };

  const p = await getProgress(userId);
  await syncWater(userId, p.cycle);
  return { revoked: true, count: r.rowsAffected };
}

/* ── 하루 한도 ──
   ref_id에 날짜를 넣어 UNIQUE로 막는 방식(출석·게시판)과 달리, 응원 댓글은 하루 2회라
   '오늘 몇 개 받았는지'를 세야 한다. 회수된 것은 한도에서도 빠진다 —
   지운 댓글이 자리를 차지하고 있으면 그날은 더 못 받는 게 되어버린다. */
export async function countToday(userId, source) {
  const day = kstDate();
  const { rows: [r] } = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM water_logs
          WHERE user_id = ? AND source = ? AND revoked_at IS NULL AND ref_id LIKE ?`,
    args: [userId, source, `${day}%`],
  });
  return Number(r?.n ?? 0);
}

/* ── 활동별 지급 ─────────────────────────────────────── */

/** 선수 응원 댓글. 10자 이상 · 하루 2회 · 직전 3개와 거의 같으면 제외. */
export async function grantForComment(userId, { commentId, content }) {
  const text = String(content ?? '').trim();
  if (text.length < LIMITS.commentMinChars) return { granted: false, reason: 'too_short' };

  if (await roleOf(userId) === 'player') return { granted: false, reason: 'player_account' };

  const used = await countToday(userId, 'comment');
  if (used >= LIMITS.commentPerDay) return { granted: false, reason: 'daily_limit' };

  // 직전 3개와 거의 같은 내용이면 주지 않는다(복붙 도배 방지)
  const { rows: recent } = await db.execute({
    sql: `SELECT content FROM post_comments
          WHERE user_id = ? AND id <> ? ORDER BY id DESC LIMIT 3`,
    args: [userId, commentId],
  });
  if (recent.some((r) => nearlySame(r.content, text)))
    return { granted: false, reason: 'repetitive' };

  // ref_id에 날짜를 넣어 하루 단위로 묶는다(#1, #2가 그날의 두 번)
  return grantWater(userId, {
    source: 'comment',
    refId:  `${kstDate()}#${commentId}`,
  });
}

/** 게시판 글. 20자 이상 · 하루 1회. */
export async function grantForBoardPost(userId, { postId, content, title }) {
  const text = `${String(title ?? '')} ${String(content ?? '')}`.trim();
  if (text.length < LIMITS.boardMinChars) return { granted: false, reason: 'too_short' };

  // 하루 1회는 ref_id를 날짜로 고정해 UNIQUE가 막게 한다.
  // 어떤 글로 받았는지는 revoke를 위해 알아야 하므로 글 id도 함께 남긴다.
  const existing = await db.execute({
    sql: `SELECT id FROM water_logs
          WHERE user_id = ? AND source = 'board' AND revoked_at IS NULL AND ref_id LIKE ?`,
    args: [userId, `${kstDate()}%`],
  });
  if (existing.rows.length) return { granted: false, reason: 'daily_limit' };

  return grantWater(userId, { source: 'board', refId: `${kstDate()}#${postId}` });
}

/** 픽. 부문당 +1, 그 대회의 모든 부문을 채우면 보너스 +2.
    부문 id·대회 id를 ref_id로 쓰므로 픽을 고쳐도 물은 한 번만 나간다. */
export async function grantForPick(userId, divisionId) {
  const first = await grantWater(userId, { source: 'pick', refId: String(divisionId) });

  // 이 부문이 속한 대회의 부문을 전부 픽했는지 본다
  const { rows: [div] } = await db.execute({
    sql: 'SELECT tournament_id FROM tournament_divisions WHERE id = ?', args: [divisionId],
  });
  if (!div) return { pick: first, bonus: null };

  const { rows: [count] } = await db.execute({
    sql: `SELECT
            (SELECT COUNT(*) FROM tournament_divisions WHERE tournament_id = ?) AS total,
            (SELECT COUNT(*) FROM tournament_picks tp
               JOIN tournament_divisions td ON td.id = tp.division_id
              WHERE td.tournament_id = ? AND tp.user_id = ?) AS mine`,
    args: [div.tournament_id, div.tournament_id, userId],
  });

  let bonus = null;
  if (Number(count.total) > 0 && Number(count.mine) >= Number(count.total))
    bonus = await grantWater(userId, { source: 'pick_bonus', refId: String(div.tournament_id) });

  return { pick: first, bonus };
}

/** 두 글이 사실상 같은지 — 공백·문장부호를 털고 비교한다. */
export function nearlySame(a, b) {
  const norm = (s) => String(s ?? '').replace(/[\s.,!?~♡♥ㅋㅎ]/g, '').toLowerCase();
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // 한쪽이 다른 쪽에 통째로 들어가고 길이 차가 작으면 같은 것으로 본다
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return long.includes(short) && short.length / long.length > 0.8;
}

/* ── 초대 ────────────────────────────────────────────
   즉시 지급하지 않는다. 가입만 시키고 버리는 계정이 제일 흔한 어뷰징이라,
   초대받은 사람이 실제로 쓰기 시작한 뒤에 준다.

   '7일 이상 활동'을 날짜만으로 보면 가입만 해두고 7일을 흘려보내도 통과한다.
   그래서 7일 경과 + 출석 3일 이상을 함께 본다. */
export const INVITE_MIN_ATTENDANCE = 3;

/** 초대 코드. 없으면 만들어 준다. 헷갈리는 글자(0/O/1/I)는 뺀다. */
export async function inviteCodeOf(userId) {
  const { rows: [u] } = await db.execute({
    sql: 'SELECT invite_code FROM users WHERE id = ?', args: [userId],
  });
  if (u?.invite_code) return u.invite_code;

  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let tries = 0; tries < 8; tries++) {
    const code = Array.from({ length: 6 }, () =>
      ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
    try {
      await db.execute({
        sql: 'UPDATE users SET invite_code = ? WHERE id = ? AND invite_code IS NULL',
        args: [code, userId],
      });
      const { rows: [check] } = await db.execute({
        sql: 'SELECT invite_code FROM users WHERE id = ?', args: [userId],
      });
      if (check?.invite_code) return check.invite_code;
    } catch (e) {
      if (!e.message?.includes('UNIQUE')) throw e;   // 충돌이면 다시 뽑는다
    }
  }
  return null;
}

/** 코드 입력. 가입 24시간 이내에만 유효하다. */
export async function useInviteCode(userId, code, ipHash) {
  const clean = String(code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(clean)) return { ok: false, reason: 'bad_code' };

  const { rows: [me] } = await db.execute({
    sql: 'SELECT id, created_at, invite_code FROM users WHERE id = ?', args: [userId],
  });
  if (!me) return { ok: false, reason: 'no_user' };
  if (me.invite_code === clean) return { ok: false, reason: 'self' };

  const ageHours = (Date.now() - Date.parse(`${String(me.created_at).replace(' ', 'T')}Z`)) / 3600000;
  if (!(ageHours < LIMITS.inviteCodeHours)) return { ok: false, reason: 'too_late' };

  const { rows: [inviter] } = await db.execute({
    sql: 'SELECT id FROM users WHERE invite_code = ?', args: [clean],
  });
  if (!inviter) return { ok: false, reason: 'not_found' };
  if (inviter.id === userId) return { ok: false, reason: 'self' };

  try {
    await db.execute({
      sql: 'INSERT INTO invites (inviter_id, invitee_id, ip_hash) VALUES (?, ?, ?)',
      args: [inviter.id, userId, ipHash ?? null],
    });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return { ok: false, reason: 'already' };
    throw e;
  }
  return { ok: true, inviterId: inviter.id };
}

/* 아직 보상하지 않은 초대 중 조건을 채운 것에 물을 준다.
   따로 배치를 돌리지 않고, 초대한 사람이 대나무 화면을 열 때 확인한다 —
   기다리는 사람이 직접 볼 때 처리되면 되고, 안 열면 급할 것도 없다. */
export async function processInviteRewards(inviterId) {
  const { rows: pending } = await db.execute({
    sql: `SELECT i.id, i.invitee_id, i.invited_at,
                 (SELECT COUNT(DISTINCT ref_id) FROM water_logs w
                   WHERE w.user_id = i.invitee_id AND w.source = 'attendance'
                     AND w.revoked_at IS NULL) AS attend_days
          FROM invites i
          WHERE i.inviter_id = ? AND i.rewarded_at IS NULL`,
    args: [inviterId],
  });
  if (!pending.length) return { rewarded: 0, pending: 0 };

  // 이번 달에 이미 몇 명분을 줬는지 — 월 5명(15점)까지
  const month = kstMonth();
  const { rows: [{ n: usedThisMonth }] } = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM invites
          WHERE inviter_id = ? AND rewarded_at IS NOT NULL
            AND strftime('%Y-%m', datetime(rewarded_at, '+9 hours')) = ?`,
    args: [inviterId, month],
  });

  let slots = Math.max(0, LIMITS.invitePerMonth - Number(usedThisMonth));
  let rewarded = 0, waiting = 0;

  for (const inv of pending) {
    const days = daysBetween(kstDate(Date.parse(`${String(inv.invited_at).replace(' ', 'T')}Z`)), kstDate());
    const eligible = days >= LIMITS.inviteMinDays &&
                     Number(inv.attend_days) >= INVITE_MIN_ATTENDANCE;
    if (!eligible) { waiting++; continue; }
    if (slots <= 0) { waiting++; continue; }   // 이번 달 한도 — 다음 달에 다시 본다

    const r = await grantWater(inviterId, { source: 'invite', refId: String(inv.invitee_id) });
    if (r.granted || r.reason === 'duplicate') {
      await db.execute({
        sql: "UPDATE invites SET rewarded_at = datetime('now') WHERE id = ?", args: [inv.id],
      });
      if (r.granted) { rewarded++; slots--; }
    } else {
      waiting++;   // 만수위·쿨다운 등 — 나중에 다시 본다
    }
  }
  return { rewarded, pending: waiting, monthly_left: slots };
}

/* ── 출석 ──
   연속 판정은 마지막 출석일과의 날짜 차이로만 한다. 어제면 이어지고, 이틀 이상이면 끊긴다. */
export async function markAttendance(userId) {
  if (await roleOf(userId) === 'player') return { granted: false, reason: 'player_account' };

  const today = kstDate();
  const p = await getProgress(userId);

  if (p.last_attendance_date === today)
    return { granted: false, reason: 'already_today', streak: p.streak_days };

  const gap    = p.last_attendance_date ? daysBetween(p.last_attendance_date, today) : null;
  const streak = gap === 1 ? p.streak_days + 1 : 1;

  const res = await grantWater(userId, { source: 'attendance', refId: today });
  if (!res.granted) return { ...res, streak: p.streak_days };

  await db.execute({
    sql: 'UPDATE bamboo_progress SET streak_days = ?, last_attendance_date = ? WHERE user_id = ?',
    args: [streak, today, userId],
  });

  /* 10일마다 보너스.
     ref_id는 '몇 번째 10일'이 아니라 '보너스를 받은 날짜'다. 구간 번호를 쓰면
     연속이 한 번 끊긴 뒤 다시 10일을 채워도 같은 번호라 보너스가 안 나온다
     (10일 → 끊김 → 다시 10일인데 무보상). 날짜를 쓰면 다시 채운 사람도 받고,
     하루에 두 번 받을 수는 없으니 어뷰징도 막힌다. */
  let bonus = null;
  if (streak > 0 && streak % LIMITS.streakEvery === 0) {
    const b = await grantWater(userId, { source: 'streak', refId: today });
    if (b.granted) bonus = b.amount;
  }

  const water = await sumWater(userId, p.cycle);
  return { granted: true, amount: res.amount, bonus, streak, water };
}
