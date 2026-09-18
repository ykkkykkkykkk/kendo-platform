// 대나무 키우기 — 내 진행 상황 · 출석 · 죽도 신청.
//
// 홈 카드와 헤더 배지도 GET /api/bamboo 하나를 같이 쓴다. 홈에 들어올 때마다 요청이
// 하나 더 늘면 그만큼 첫 화면이 늦어져서, 미션 상태·남은 물까지 한 번에 내려준다.
//
// 물 지급은 여기서 하지 않는다(출석만 예외). 픽·응원·게시판은 각자의 서버 로직 안에서
// utils/bamboo.js를 부른다 — 클라이언트가 '나 픽했어요' 하고 물을 달라고 할 수 없어야 한다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';
import {
  GOAL, STAGES, AMOUNT, LIMITS,
  kstDate, kstMonth, stageOf, getProgress, sumWater, syncWater,
  countToday, markAttendance, roleOf, daysBetween,
  inviteCodeOf, useInviteCode, processInviteRewards, INVITE_MIN_ATTENDANCE,
} from '../utils/bamboo.js';
import crypto from 'crypto';

const router = Router();

/** 선수 계정에 돌려주는 비활성 응답 — 화면은 이걸 보고 대나무를 통째로 숨긴다. */
const DISABLED = {
  enabled: false,
  reason:  'player_account',
  message: '대나무 키우기는 팬 회원 전용 기능입니다.',
};

/* 지금 픽을 받는 대회. 홈과 같은 기준(부문별 마감 시각)으로 본다. */
async function openTournament() {
  const { rows } = await db.execute(`
    SELECT td.id AS division_id, td.label, td.sort_order,
           COALESCE(td.pick_deadline, t.pick_deadline) AS deadline,
           t.id AS tournament_id, t.name, t.slug
    FROM tournament_divisions td
    JOIN tournaments t ON t.id = td.tournament_id
    WHERE t.status != '종료'
    ORDER BY td.sort_order, td.id
  `);
  const now  = Date.now();
  const open = rows.filter((d) => d.deadline && new Date(d.deadline).getTime() > now);
  if (!open.length) return null;

  // 가장 먼저 마감되는 대회 하나만 본다
  const firstId = open.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0].tournament_id;
  const divs = open.filter((d) => d.tournament_id === firstId)
                   .sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: firstId, name: divs[0].name, slug: divs[0].slug,
    divisions: divs.map((d) => ({ id: d.division_id, label: d.label })),
  };
}

/** 오늘의 미션 상태 + 남은 물 개수를 만든다. */
async function todayMissions(userId) {
  const today = kstDate();

  const [{ rows: att }, commentUsed, { rows: board }] = await Promise.all([
    db.execute({
      sql: `SELECT 1 FROM water_logs WHERE user_id = ? AND source = 'attendance' AND ref_id = ?`,
      args: [userId, today],
    }),
    countToday(userId, 'comment'),
    db.execute({
      sql: `SELECT 1 FROM water_logs WHERE user_id = ? AND source = 'board'
              AND revoked_at IS NULL AND ref_id LIKE ?`,
      args: [userId, `${today}%`],
    }),
  ]);

  const tour = await openTournament();
  let pick = null;
  if (tour) {
    const ids = tour.divisions.map((d) => d.id);
    const ph  = ids.map(() => '?').join(',');
    const { rows: done } = await db.execute({
      sql: `SELECT ref_id FROM water_logs
            WHERE user_id = ? AND source = 'pick' AND revoked_at IS NULL
              AND ref_id IN (${ph})`,
      args: [userId, ...ids.map(String)],
    });
    const doneIds = new Set(done.map((r) => Number(r.ref_id)));
    const { rows: bonus } = await db.execute({
      sql: `SELECT 1 FROM water_logs WHERE user_id = ? AND source = 'pick_bonus' AND ref_id = ?`,
      args: [userId, String(tour.id)],
    });
    pick = {
      tournament_id:   tour.id,
      tournament_name: tour.name,
      tournament_slug: tour.slug,
      total:           ids.length,
      done:            doneIds.size,
      divisions:       tour.divisions.map((d) => ({ ...d, done: doneIds.has(d.id) })),
      bonus_done:      bonus.length > 0,
      bonus_amount:    AMOUNT.pick_bonus,
    };
  }

  const missions = {
    attendance: { done: att.length > 0, amount: AMOUNT.attendance },
    comment:    { used: commentUsed, max: LIMITS.commentPerDay, amount: AMOUNT.comment },
    board:      { done: board.length > 0, amount: AMOUNT.board },
    pick,
  };

  // 오늘 더 받을 수 있는 물의 양
  let remaining = 0;
  if (!missions.attendance.done) remaining += AMOUNT.attendance;
  remaining += (LIMITS.commentPerDay - commentUsed) * AMOUNT.comment;
  if (!missions.board.done) remaining += AMOUNT.board;
  if (pick) {
    remaining += (pick.total - pick.done) * AMOUNT.pick;
    if (!pick.bonus_done && pick.total > 0) remaining += AMOUNT.pick_bonus;
  }

  return { missions, remaining };
}

// GET /api/bamboo — 홈 카드·헤더 배지·전체 화면이 모두 이걸 쓴다
router.get('/bamboo', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (await roleOf(userId) === 'player') return res.json(DISABLED);

    const p = await getProgress(userId);
    // 사본이 어긋났을 수 있으니 읽을 때 한 번 맞춘다(회수는 다른 경로에서도 일어난다)
    const { water, stage } = await syncWater(userId, p.cycle);

    const { missions, remaining } = await todayMissions(userId);

    const cooldownLeft = p.cooldown_until
      ? Math.max(0, Math.ceil((Date.parse(`${p.cooldown_until.replace(' ', 'T')}Z`) - Date.now()) / 86400000))
      : 0;

    // 진행 중인 죽도 신청
    const { rows: [request] } = await db.execute({
      sql: `SELECT id, status, size, admin_note, created_at, approved_at, shipped_at
            FROM shinai_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      args: [userId],
    });

    /* 초대 보상은 여기서 정산한다 — 조건(7일 경과 + 출석 3일)을 채운 초대에만 물이 간다.
       배치를 따로 돌리지 않고 초대한 사람이 이 화면을 열 때 확인한다. */
    const inviteResult = await processInviteRewards(userId).catch(() => null);
    const code = await inviteCodeOf(userId).catch(() => null);
    const { rows: [inv] } = await db.execute({
      sql: `SELECT COUNT(*) AS total,
                   SUM(CASE WHEN rewarded_at IS NOT NULL THEN 1 ELSE 0 END) AS rewarded
            FROM invites WHERE inviter_id = ?`,
      args: [userId],
    });

    // 정산으로 물이 늘었을 수 있다
    const finalWater = inviteResult?.rewarded ? await sumWater(userId, p.cycle) : water;

    /* 아직 코드를 넣을 수 있는가 — 가입 24시간 이내이고, 이미 넣은 적이 없어야 한다. */
    const { rows: [me] } = await db.execute({
      sql: `SELECT u.created_at,
                   (SELECT COUNT(*) FROM invites WHERE invitee_id = u.id) AS used
            FROM users u WHERE u.id = ?`,
      args: [userId],
    });
    const ageHours = me
      ? (Date.now() - Date.parse(`${String(me.created_at).replace(' ', 'T')}Z`)) / 3600000
      : Infinity;
    const canEnter  = Number(me?.used ?? 0) === 0 && ageHours < LIMITS.inviteCodeHours;
    const hoursLeft = Math.max(0, Math.ceil(LIMITS.inviteCodeHours - ageHours));

    const streak = p.streak_days ?? 0;
    res.json({
      enabled:  true,
      invite: {
        code,
        total:     Number(inv?.total ?? 0),
        rewarded:  Number(inv?.rewarded ?? 0),
        waiting:   inviteResult?.pending ?? 0,
        just_rewarded: inviteResult?.rewarded ?? 0,
        amount:    AMOUNT.invite,
        min_days:  LIMITS.inviteMinDays,
        min_attendance: INVITE_MIN_ATTENDANCE,
        monthly_max: LIMITS.invitePerMonth,
        /* 지금 코드를 넣을 수 있는 사람인지. 화면이 이걸 보고 가입 직후에만 안내를 띄운다.
           24시간을 넘기면 영영 못 넣으므로, 스스로 /bamboo까지 찾아 들어오길 기다리면 늦는다. */
        can_enter:  canEnter,
        hours_left: canEnter ? hoursLeft : 0,
      },
      water: finalWater,
      goal:     GOAL,
      stage:    stageOf(finalWater).stage,
      stage_key: stageOf(finalWater).key,
      stage_name: stageOf(finalWater).name,
      stages:   STAGES,
      remaining_to_goal: Math.max(0, GOAL - finalWater),
      streak_days: streak,
      streak_next_bonus: streak > 0 || p.last_attendance_date
        ? LIMITS.streakEvery - (streak % LIMITS.streakEvery)
        : LIMITS.streakEvery,
      streak_bonus_amount: AMOUNT.streak,
      last_attendance_date: p.last_attendance_date,
      started:  !!p.last_attendance_date || finalWater > 0,
      completed: finalWater >= GOAL,
      cooldown_days_left: cooldownLeft,
      today: { date: kstDate(), remaining, missions },
      request: request ?? null,
    });
  } catch (e) { serverError(res, e, 'bamboo'); }
});

// POST /api/bamboo/attendance — 서버 시간(KST) 기준. 폰 날짜는 쓰지 않는다.
router.post('/bamboo/attendance', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (await roleOf(userId) === 'player') return res.status(403).json(DISABLED);

    const r = await markAttendance(userId);
    if (!r.granted) {
      const msg = {
        already_today: '오늘은 이미 물을 주셨어요.',
        cooldown:      '아직 쉬는 기간이에요.',
        already_full:  '대나무가 이미 다 자랐어요.',
        duplicate:     '오늘은 이미 물을 주셨어요.',
      }[r.reason] ?? '지금은 물을 줄 수 없어요.';
      return res.status(400).json({ error: msg, reason: r.reason });
    }

    const p = await getProgress(userId);
    res.json({
      ok: true, amount: r.amount, bonus: r.bonus, streak: r.streak,
      water: p.water, stage: stageOf(p.water).stage,
    });
  } catch (e) { serverError(res, e, 'bamboo-attendance'); }
});

/* POST /api/bamboo/invite — 초대 코드 입력 (가입 24시간 이내).
   물은 여기서 나가지 않는다. 초대받은 사람이 7일 이상 쓰기 시작한 뒤에야
   초대한 사람에게 간다(processInviteRewards). */
router.post('/bamboo/invite', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (await roleOf(userId) === 'player') return res.status(403).json(DISABLED);

    /* IP는 해시로만 남긴다. 나중에 '같은 곳에서 여럿 가입'을 관리자에게 보여주기 위한
       것이고 차단에는 쓰지 않는다 — 도장 와이파이를 같이 쓰는 관원이 통째로 잡힌다. */
    const ip = String(req.headers['x-forwarded-for'] ?? req.ip ?? '').split(',')[0].trim();
    const ipHash = ip
      ? crypto.createHash('sha256').update(`bamboo:${ip}`).digest('hex').slice(0, 16)
      : null;

    const r = await useInviteCode(userId, req.body?.code, ipHash);
    if (!r.ok) {
      const msg = {
        bad_code:  '초대 코드는 영문·숫자 6자리예요.',
        not_found: '그런 초대 코드가 없어요.',
        self:      '본인 코드는 입력할 수 없어요.',
        already:   '이미 초대 코드를 입력했어요.',
        too_late:  `초대 코드는 가입 후 ${LIMITS.inviteCodeHours}시간 안에만 입력할 수 있어요.`,
      }[r.reason] ?? '초대 코드를 확인해주세요.';
      return res.status(400).json({ error: msg, reason: r.reason });
    }
    res.json({
      ok: true,
      message: `초대 코드를 등록했어요. ${LIMITS.inviteMinDays}일 이상 활동하시면 초대한 분께 물이 갑니다.`,
    });
  } catch (e) { serverError(res, e, 'bamboo-invite'); }
});

/* ════════════ 죽도 신청 ════════════ */

const SIZES = ['소도(3.6척)', '3.7척', '3.8척', '3.9척'];

// POST /api/shinai/request
router.post('/shinai/request', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (await roleOf(userId) === 'player') return res.status(403).json(DISABLED);

    const p = await getProgress(userId);
    const water = await sumWater(userId, p.cycle);
    if (water < GOAL)
      return res.status(400).json({ error: `물 ${GOAL}을 모아야 신청할 수 있어요. (지금 ${water})` });

    const name    = String(req.body?.name ?? '').trim().slice(0, 30);
    const phone   = String(req.body?.phone ?? '').replace(/[^\d-]/g, '').slice(0, 20);
    const address = String(req.body?.address ?? '').trim().slice(0, 200);
    const size    = String(req.body?.size ?? '').trim();

    if (!name)    return res.status(400).json({ error: '이름을 입력해주세요.' });
    if (phone.replace(/\D/g, '').length < 10)
      return res.status(400).json({ error: '연락처를 정확히 입력해주세요.' });
    if (address.length < 10) return res.status(400).json({ error: '배송지를 자세히 입력해주세요.' });
    if (!SIZES.includes(size))
      return res.status(400).json({ error: '죽도 규격을 선택해주세요.', sizes: SIZES });

    // 처리 중인 신청이 이미 있으면 새로 받지 않는다
    const { rows: [live] } = await db.execute({
      sql: `SELECT id, status FROM shinai_requests
            WHERE user_id = ? AND status IN ('pending','approved') ORDER BY id DESC LIMIT 1`,
      args: [userId],
    });
    if (live) return res.status(409).json({ error: '이미 신청이 접수되어 있어요.', request_id: live.id });

    /* 같은 연락처·주소는 6개월에 1회. 계정을 새로 만들어도 받는 사람이 같으면 막힌다.
       (숫자만 남겨 비교한다 — '010-1234-5678'과 '01012345678'은 같은 번호다) */
    const phoneKey = phone.replace(/\D/g, '');
    const addrKey  = address.replace(/\s/g, '');
    const { rows: dupes } = await db.execute({
      sql: `SELECT id, created_at, REPLACE(REPLACE(phone,'-',''),' ','') AS pk,
                   REPLACE(address,' ','') AS ak
            FROM shinai_requests
            WHERE status IN ('approved','shipped')
              AND created_at >= datetime('now', '-6 months')`,
      args: [],
    });
    if (dupes.some((d) => d.pk === phoneKey || d.ak === addrKey))
      return res.status(409).json({ error: '같은 연락처 또는 배송지는 6개월에 한 번만 신청할 수 있어요.' });

    const { lastInsertRowid } = await db.execute({
      sql: `INSERT INTO shinai_requests (user_id, cycle, name, phone, address, size)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [userId, p.cycle, name, phone, address, size],
    });

    res.status(201).json({ ok: true, id: Number(lastInsertRowid), status: 'pending' });
  } catch (e) { serverError(res, e, 'shinai-request'); }
});

// GET /api/shinai/my
router.get('/shinai/my', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `SELECT id, status, size, admin_note, created_at, approved_at, shipped_at
            FROM shinai_requests WHERE user_id = ? ORDER BY id DESC`,
      args: [req.user.userId],
    });
    res.json({ requests: rows, sizes: SIZES });
  } catch (e) { serverError(res, e, 'shinai-my'); }
});

export { SIZES };
export default router;
