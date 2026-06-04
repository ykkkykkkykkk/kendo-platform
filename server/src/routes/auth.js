import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';

const router = Router();

// POST /api/auth/register — 팬 가입/로그인
// body: { nickname, phone, home_dojo? }
router.post('/register', async (req, res) => {
  const { nickname, phone, home_dojo } = req.body;
  if (!nickname?.trim())
    return res.status(400).json({ error: '닉네임을 입력해주세요.' });
  if (!phone || !/^\d{4}$/.test(phone))
    return res.status(400).json({ error: '휴대폰 끝 4자리를 숫자로 입력해주세요.' });

  const trimmedNick = nickname.trim().slice(0, 10);
  const phoneKey    = `${trimmedNick}_${phone}`;

  const { rows: [existing] } = await db.execute({
    sql:  'SELECT * FROM users WHERE phone = ?',
    args: [phoneKey],
  });

  let user = existing;
  if (!user) {
    await db.execute({
      sql:  'INSERT INTO users (phone, nickname, home_dojo) VALUES (?, ?, ?)',
      args: [phoneKey, trimmedNick, home_dojo?.trim() || null],
    });
    const { rows: [newUser] } = await db.execute({
      sql:  'SELECT * FROM users WHERE phone = ?',
      args: [phoneKey],
    });
    user = newUser;
  }

  const token = jwt.sign(
    { userId: user.id, nickname: user.nickname, role: user.role ?? 'fan' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );

  res.json({ token, user });
});

// POST /api/auth/player-login — 선수 로그인
// body: { username, password }
router.post('/player-login', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password)
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });

  const { rows: [user] } = await db.execute({
    sql:  "SELECT * FROM users WHERE username = ? AND role = 'player'",
    args: [username.trim()],
  });

  if (!user || !user.password_hash)
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid)
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

  const token = jwt.sign(
    { userId: user.id, nickname: user.nickname, role: 'player', playerId: user.player_id },
    process.env.JWT_SECRET,
    { expiresIn: '90d' },
  );

  res.json({ token, user });
});

export default router;
