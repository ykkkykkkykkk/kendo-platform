import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { serverError } from '../utils/apiError.js';
import { recalcDojoScore } from '../services/pickService.js';

const router = Router();
router.use(requireAdmin);

function normalize(name) {
  return name.toLowerCase().replace(/\s+/g, '');
}

// ── B-1. 시즌 목록 ───────────────────────────────────────────────
router.get('/seasons', async (_req, res) => {
  try {
    const { rows } = await db.execute(
      'SELECT * FROM seasons ORDER BY start_date DESC'
    );
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

// ── B-1. 시즌 생성 ───────────────────────────────────────────────
router.post('/seasons', async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;
    if (!name || !start_date || !end_date)
      return res.status(400).json({ error: '이름, 시작일, 종료일이 필요합니다.' });

    const { lastInsertRowid } = await db.execute({
      sql:  'INSERT INTO seasons (name, start_date, end_date) VALUES (?, ?, ?)',
      args: [name, start_date, end_date],
    });
    const { rows: [season] } = await db.execute({
      sql: 'SELECT * FROM seasons WHERE id = ?', args: [Number(lastInsertRowid)],
    });
    res.status(201).json(season);
  } catch (e) { serverError(res, e); }
});

// ── B-1. 시즌 종료 + 자동 결산 ──────────────────────────────────
// PUT /api/admin/seasons/:id/finalize
router.put('/seasons/:id/finalize', async (req, res) => {
  try {
    const seasonId = req.params.id;

    const { rows: [season] } = await db.execute({
      sql: 'SELECT * FROM seasons WHERE id = ?', args: [seasonId],
    });
    if (!season) return res.status(404).json({ error: '시즌을 찾을 수 없습니다.' });
    if (season.finalized_at) return res.status(400).json({ error: '이미 종료된 시즌입니다.' });

    // 5명 이상 도장 중 점수 Top 3 계산
    const { rows: top3 } = await db.execute({
      sql: `SELECT id, name, total_score FROM dojos
            WHERE member_count >= 5 AND (season_id = ? OR season_id IS NULL)
            ORDER BY total_score DESC LIMIT 3`,
      args: [seasonId],
    });

    const prizeTiers = ['half_day_clinic', 'two_hour_clinic', 'merchandise'];

    for (let i = 0; i < top3.length; i++) {
      const d = top3[i];
      await db.execute({
        sql: `INSERT OR IGNORE INTO dojo_invitations
              (season_id, dojo_id, rank, total_score, prize_tier)
              VALUES (?, ?, ?, ?, ?)`,
        args: [seasonId, d.id, i + 1, d.total_score, prizeTiers[i]],
      });
    }

    const now = new Date().toISOString();

    // 현재 시즌 비활성화
    await db.execute({
      sql: 'UPDATE seasons SET is_active = 0, finalized_at = ? WHERE id = ?',
      args: [now, seasonId],
    });

    // 다음 시즌 자동 생성 (6개월 후)
    const endDate   = new Date(season.end_date);
    const nextStart = new Date(endDate);
    nextStart.setDate(nextStart.getDate() + 1);
    const nextEnd   = new Date(nextStart);
    nextEnd.setMonth(nextEnd.getMonth() + 6);

    const nextYear   = nextStart.getFullYear();
    const nextHalf   = nextStart.getMonth() < 6 ? '상반기' : '하반기';
    const nextName   = `${nextYear} ${nextHalf}`;

    const fmt = (d) => d.toISOString().slice(0, 10);

    const { lastInsertRowid } = await db.execute({
      sql:  'INSERT INTO seasons (name, start_date, end_date, is_active) VALUES (?, ?, ?, 1)',
      args: [nextName, fmt(nextStart), fmt(nextEnd)],
    });

    res.json({
      finalized: { season_id: Number(seasonId), winners: top3.length },
      next_season: { name: nextName, start_date: fmt(nextStart), end_date: fmt(nextEnd) },
    });
  } catch (e) { serverError(res, e); }
});

// ── B-2. 도장 전체 목록 ──────────────────────────────────────────
router.get('/dojos', async (_req, res) => {
  try {
    const { rows } = await db.execute(
      'SELECT * FROM dojos ORDER BY total_score DESC, member_count DESC'
    );
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

// ── B-2. 도장 수정 ───────────────────────────────────────────────
router.put('/dojos/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '이름이 필요합니다.' });
    await db.execute({
      sql:  'UPDATE dojos SET name = ?, normalized_name = ? WHERE id = ?',
      args: [name.trim(), normalize(name.trim()), req.params.id],
    });
    const { rows: [d] } = await db.execute({
      sql: 'SELECT * FROM dojos WHERE id = ?', args: [req.params.id],
    });
    res.json(d);
  } catch (e) { serverError(res, e); }
});

// ── B-2. 도장 삭제 ───────────────────────────────────────────────
router.delete('/dojos/:id', async (req, res) => {
  try {
    const { rows: [d] } = await db.execute({
      sql: 'SELECT member_count FROM dojos WHERE id = ?', args: [req.params.id],
    });
    if (!d) return res.status(404).json({ error: '도장을 찾을 수 없습니다.' });
    if (d.member_count > 0)
      return res.status(400).json({ error: '소속 멤버가 있는 도장은 삭제할 수 없습니다.' });

    await db.execute({ sql: 'DELETE FROM dojos WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) { serverError(res, e); }
});

// ── B-2. 도장 합치기 ─────────────────────────────────────────────
// POST /api/admin/dojos/merge
// body: { source_id, target_id }  — source를 target으로 합침
router.post('/dojos/merge', async (req, res) => {
  try {
    const { source_id, target_id } = req.body;
    if (!source_id || !target_id || source_id === target_id)
      return res.status(400).json({ error: 'source_id와 target_id가 필요하며 달라야 합니다.' });

    // source 멤버 → target으로 이동
    await db.execute({
      sql: 'UPDATE users SET dojo_id = ? WHERE dojo_id = ?',
      args: [target_id, source_id],
    });

    // source 도장 삭제
    await db.execute({ sql: 'DELETE FROM dojos WHERE id = ?', args: [source_id] });

    // target 재계산
    await recalcDojoScore(target_id);

    const { rows: [target] } = await db.execute({
      sql: 'SELECT * FROM dojos WHERE id = ?', args: [target_id],
    });

    res.json({ success: true, merged_into: target });
  } catch (e) { serverError(res, e); }
});

// ── B-3. 도장 변경 요청 목록 ─────────────────────────────────────
router.get('/dojo-change-requests', async (_req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT u.id AS user_id, u.nickname, u.dojo_change_requested_at,
             d.name AS current_dojo_name
      FROM users u
      LEFT JOIN dojos d ON d.id = u.dojo_id
      WHERE u.dojo_change_requested_at IS NOT NULL
      ORDER BY u.dojo_change_requested_at DESC
    `);

    const parsed = rows.map((r) => {
      const parts = (r.dojo_change_requested_at ?? '').split('|');
      return {
        user_id:        r.user_id,
        nickname:       r.nickname,
        current_dojo:   r.current_dojo_name,
        requested_at:   parts[0] ?? null,
        new_dojo_name:  parts[1] ?? null,
        reason:         parts[2] ?? null,
      };
    });

    res.json(parsed);
  } catch (e) { serverError(res, e); }
});

// ── B-3. 도장 변경 승인 ──────────────────────────────────────────
// POST /api/admin/users/:id/change-dojo
router.post('/users/:id/change-dojo', async (req, res) => {
  try {
    const { new_dojo_name } = req.body;
    if (!new_dojo_name?.trim())
      return res.status(400).json({ error: '새 도장 이름이 필요합니다.' });

    const userId  = req.params.id;
    const normName = normalize(new_dojo_name.trim());

    const { rows: [me] } = await db.execute({
      sql: 'SELECT dojo_id FROM users WHERE id = ?', args: [userId],
    });
    const prevDojoId = me?.dojo_id ?? null;

    let { rows: [dojo] } = await db.execute({
      sql: 'SELECT * FROM dojos WHERE normalized_name = ?', args: [normName],
    });

    if (!dojo) {
      const { lastInsertRowid } = await db.execute({
        sql: 'INSERT INTO dojos (name, normalized_name) VALUES (?, ?)',
        args: [new_dojo_name.trim(), normName],
      });
      const { rows: [created] } = await db.execute({
        sql: 'SELECT * FROM dojos WHERE id = ?', args: [Number(lastInsertRowid)],
      });
      dojo = created;
    }

    await db.execute({
      sql: 'UPDATE users SET dojo_id = ?, dojo_change_requested_at = NULL WHERE id = ?',
      args: [dojo.id, userId],
    });

    if (prevDojoId && prevDojoId !== dojo.id) await recalcDojoScore(prevDojoId);
    await recalcDojoScore(dojo.id);

    res.json({ success: true, new_dojo: dojo });
  } catch (e) { serverError(res, e); }
});

// ── B-4. 초청권 목록 ─────────────────────────────────────────────
router.get('/invitations', async (req, res) => {
  try {
    const { status } = req.query;
    const args = [];
    let where = '';
    if (status) { where = 'WHERE di.status = ?'; args.push(status); }

    const { rows } = await db.execute({
      sql: `SELECT di.*, d.name AS dojo_name, d.member_count,
                   s.name AS season_name,
                   p.name AS matched_player_name
            FROM dojo_invitations di
            JOIN dojos   d ON d.id = di.dojo_id
            JOIN seasons s ON s.id = di.season_id
            LEFT JOIN players p ON p.id = di.matched_player_id
            ${where}
            ORDER BY di.season_id DESC, di.rank ASC`,
      args,
    });
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

// ── B-4. 초청권 업데이트 ─────────────────────────────────────────
router.put('/invitations/:id', async (req, res) => {
  try {
    const { matched_player_id, scheduled_date, status, notes } = req.body;
    const { rows: [inv] } = await db.execute({
      sql: 'SELECT * FROM dojo_invitations WHERE id = ?', args: [req.params.id],
    });
    if (!inv) return res.status(404).json({ error: '초청권을 찾을 수 없습니다.' });

    await db.execute({
      sql: `UPDATE dojo_invitations
            SET matched_player_id = COALESCE(?, matched_player_id),
                scheduled_date    = COALESCE(?, scheduled_date),
                status            = COALESCE(?, status),
                notes             = COALESCE(?, notes)
            WHERE id = ?`,
      args: [matched_player_id ?? null, scheduled_date ?? null,
             status ?? null, notes ?? null, req.params.id],
    });

    const { rows: [updated] } = await db.execute({
      sql: 'SELECT * FROM dojo_invitations WHERE id = ?', args: [req.params.id],
    });
    res.json(updated);
  } catch (e) { serverError(res, e); }
});

export default router;
