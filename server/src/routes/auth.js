import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const router = Router();

// POST /api/auth/register
// body: { nickname, phone } — phone은 휴대폰 끝 4자리
router.post('/register', async (req, res) => {
  const { nickname, phone } = req.body;
  if (!nickname?.trim())
    return res.status(400).json({ error: '닉네임을 입력해주세요.' });
  if (!phone || !/^\d{4}$/.test(phone))
    return res.status(400).json({ error: '휴대폰 끝 4자리를 숫자로 입력해주세요.' });

  const trimmedNick = nickname.trim().slice(0, 10);
  // 닉네임 + 끝4자리 조합으로 고유 식별 (phone 컬럼의 UNIQUE 제약 활용)
  const phoneKey = `${trimmedNick}_${phone}`;

  const { rows: [existing] } = await db.execute({
    sql:  'SELECT * FROM users WHERE phone = ?',
    args: [phoneKey],
  });

  let user = existing;
  if (!user) {
    await db.execute({
      sql:  'INSERT INTO users (phone, nickname) VALUES (?, ?)',
      args: [phoneKey, trimmedNick],
    });
    const { rows: [newUser] } = await db.execute({
      sql:  'SELECT * FROM users WHERE phone = ?',
      args: [phoneKey],
    });
    user = newUser;
  }

  const token = jwt.sign(
    { userId: user.id, nickname: user.nickname },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );

  res.json({ token, user });
});

// POST /api/auth/kakao — 배포 직전 재활성화 예정
/*
router.post('/kakao', async (req, res) => { ... });
*/

export default router;
