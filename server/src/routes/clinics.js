import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// GET /api/clinics?player_id=X — 강습 목록 (공개)
router.get('/', async (req, res) => {
  try {
    const { player_id } = req.query;
    const { rows } = await db.execute({
      sql: player_id
        ? `SELECT c.*, p.name AS player_name, p.slug AS player_slug
           FROM clinics c
           JOIN players p ON p.id = c.player_id
           WHERE c.player_id = ? AND c.status != '종료'
           ORDER BY c.scheduled_at`
        : `SELECT c.*, p.name AS player_name, p.slug AS player_slug
           FROM clinics c
           JOIN players p ON p.id = c.player_id
           WHERE c.status != '종료'
           ORDER BY c.scheduled_at`,
      args: player_id ? [player_id] : [],
    });
    res.json(rows);
  } catch (e) {
    serverError(res, e);
  }
});

// GET /api/clinics/my-bookings?player_id=X — 내 예약 목록 clinic_id 배열 (인증 필요)
router.get('/my-bookings', requireAuth, async (req, res) => {
  try {
    const { player_id } = req.query;
    const { rows } = await db.execute({
      sql: player_id
        ? `SELECT cb.clinic_id FROM clinic_bookings cb
           JOIN clinics c ON c.id = cb.clinic_id
           WHERE cb.user_id = ? AND c.player_id = ?`
        : `SELECT clinic_id FROM clinic_bookings WHERE user_id = ?`,
      args: player_id ? [req.user.userId, player_id] : [req.user.userId],
    });
    res.json(rows.map((r) => r.clinic_id));
  } catch (e) {
    serverError(res, e);
  }
});

// POST /api/clinics/:id/booking — 강습 예약 (인증 필요)
router.post('/:id/booking', requireAuth, async (req, res) => {
  const clinicId = req.params.id;
  const userId   = req.user.userId;

  try {
    const { rows: [clinic] } = await db.execute({
      sql:  'SELECT * FROM clinics WHERE id = ?',
      args: [clinicId],
    });
    if (!clinic) return res.status(404).json({ error: '강습을 찾을 수 없습니다.' });
    if (clinic.status === '마감' || clinic.status === '종료')
      return res.status(400).json({ error: '마감된 강습입니다.' });
    if (clinic.remaining_slots !== null && clinic.remaining_slots <= 0)
      return res.status(400).json({ error: '잔여 자리가 없습니다.' });

    await db.execute({
      sql:  'INSERT INTO clinic_bookings (clinic_id, user_id) VALUES (?, ?)',
      args: [clinicId, userId],
    });

    // 잔여 자리 감소 (remaining_slots가 설정된 경우만)
    if (clinic.remaining_slots !== null) {
      await db.execute({
        sql:  'UPDATE clinics SET remaining_slots = remaining_slots - 1 WHERE id = ?',
        args: [clinicId],
      });
      if (clinic.remaining_slots - 1 <= 0) {
        await db.execute({
          sql:  "UPDATE clinics SET status = '마감' WHERE id = ?",
          args: [clinicId],
        });
      }
    }

    const { rows: [booking] } = await db.execute({
      sql:  'SELECT * FROM clinic_bookings WHERE clinic_id = ? AND user_id = ?',
      args: [clinicId, userId],
    });
    res.status(201).json(booking);
  } catch (e) {
    if (e.message?.includes('UNIQUE'))
      return res.status(409).json({ error: '이미 예약하셨습니다.' });
    serverError(res, e);
  }
});

// DELETE /api/clinics/:id/booking — 예약 취소 (인증 필요)
router.delete('/:id/booking', requireAuth, async (req, res) => {
  try {
    const clinicId = req.params.id;
    const userId   = req.user.userId;

    const { rows: [booking] } = await db.execute({
      sql:  'SELECT * FROM clinic_bookings WHERE clinic_id = ? AND user_id = ?',
      args: [clinicId, userId],
    });
    if (!booking) return res.status(404).json({ error: '예약 내역이 없습니다.' });

    await db.execute({
      sql:  'DELETE FROM clinic_bookings WHERE clinic_id = ? AND user_id = ?',
      args: [clinicId, userId],
    });

    // 잔여 자리 복구
    await db.execute({
      sql:  `UPDATE clinics
             SET remaining_slots = remaining_slots + 1,
                 status = CASE WHEN status = '마감' THEN '모집중' ELSE status END
             WHERE id = ? AND remaining_slots IS NOT NULL`,
      args: [clinicId],
    });

    res.json({ cancelled: true });
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
