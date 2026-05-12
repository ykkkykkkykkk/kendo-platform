import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// POST /api/auth/kakao
// body: { accessToken: string }
router.post('/kakao', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: '액세스 토큰이 없습니다.' });

  // 카카오 서버에서 사용자 정보 검증
  const kakaoRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!kakaoRes.ok) return res.status(401).json({ error: '카카오 인증 실패' });

  const kakaoUser = await kakaoRes.json();
  const kakaoId   = String(kakaoUser.id);
  const nickname  = kakaoUser.kakao_account?.profile?.nickname
    ?? `검도팬_${kakaoId.slice(-4)}`;

  // phone 컬럼을 카카오 ID 식별자로 활용 (간단 버전)
  const phoneKey = `kakao_${kakaoId}`;

  const { rows: [existing] } = await db.execute({
    sql:  'SELECT * FROM users WHERE phone = ?',
    args: [phoneKey],
  });
  if (existing) return res.json({ user: existing });

  await db.execute({
    sql:  'INSERT INTO users (phone, nickname) VALUES (?, ?)',
    args: [phoneKey, nickname],
  });
  const { rows: [user] } = await db.execute({
    sql:  'SELECT * FROM users WHERE phone = ?',
    args: [phoneKey],
  });
  res.status(201).json({ user });
});

export default router;
