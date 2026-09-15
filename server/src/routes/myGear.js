// 선수 본인이 자기 장비를 고친다.
//
// 지금까지 장비는 관리자만 넣을 수 있었다. 선수가 202명이고 장비는 바꿔 쓰기도 하는데,
// 그때마다 관리자에게 부탁해야 했다. 영상·사진을 본인이 올리는 것과 같은 자리에 둔다.
//
// 대상 선수는 토큰의 playerId로 정한다 — 남의 장비를 건드릴 길이 없다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';
import { checkUrls } from '../utils/validateUrl.js';

export const myGearRouter = Router();
myGearRouter.use(requireAuth);

const CATEGORIES = ['죽도', '호구', '도복', '하카마', '기타'];
const MAX_PER_PLAYER = 12;

/** 선수 계정이 아니면 본인 장비 자체가 없다. */
function myPlayerId(req, res) {
  const pid = req.user?.playerId;
  if (req.user?.role !== 'player' || !pid) {
    res.status(403).json({ error: '선수 계정만 사용할 수 있습니다.' });
    return null;
  }
  return pid;
}

const listGear = (pid) => db.execute({
  sql: 'SELECT * FROM player_gear WHERE player_id = ? ORDER BY display_order, id',
  args: [pid],
}).then((r) => r.rows);

/** 입력값 다듬기. 문제가 있으면 문자열(오류)을 돌려준다. */
function clean(body) {
  const category   = String(body?.category ?? '').trim();
  const model_name = String(body?.model_name ?? '').trim().slice(0, 60);
  const brand      = String(body?.brand ?? '').trim().slice(0, 40);
  const product_url = String(body?.product_url ?? '').trim();

  if (!CATEGORIES.includes(category)) return `종류는 ${CATEGORIES.join('·')} 중에서 골라주세요.`;
  if (!model_name) return '모델명을 입력해주세요.';

  const urlErr = checkUrls({ product_url }, ['product_url']);
  if (urlErr) return '상품 주소가 올바르지 않습니다.';

  // 가격은 비워둘 수 있다. 숫자가 아니면 그냥 비운 것으로 본다.
  const price = Number(String(body?.price_krw ?? '').replace(/[^\d]/g, ''));
  return {
    category, model_name,
    brand:       brand || null,
    price_krw:   Number.isFinite(price) && price > 0 ? price : null,
    product_url: product_url || null,
  };
}

// GET /api/me/gear
myGearRouter.get('/gear', async (req, res) => {
  try {
    const pid = myPlayerId(req, res); if (!pid) return;
    res.json(await listGear(pid));
  } catch (e) { serverError(res, e, 'my-gear'); }
});

// POST /api/me/gear
myGearRouter.post('/gear', async (req, res) => {
  try {
    const pid = myPlayerId(req, res); if (!pid) return;

    const g = clean(req.body);
    if (typeof g === 'string') return res.status(400).json({ error: g });

    const { rows: [{ n }] } = await db.execute({
      sql: 'SELECT COUNT(*) AS n FROM player_gear WHERE player_id = ?', args: [pid],
    });
    if (Number(n) >= MAX_PER_PLAYER)
      return res.status(400).json({ error: `장비는 ${MAX_PER_PLAYER}개까지 등록할 수 있습니다.` });

    await db.execute({
      sql: `INSERT INTO player_gear
              (player_id, category, brand, model_name, price_krw, product_url, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [pid, g.category, g.brand, g.model_name, g.price_krw, g.product_url, Number(n)],
    });
    res.status(201).json(await listGear(pid));
  } catch (e) { serverError(res, e, 'my-gear-add'); }
});

// PUT /api/me/gear/:id
myGearRouter.put('/gear/:id', async (req, res) => {
  try {
    const pid = myPlayerId(req, res); if (!pid) return;

    const g = clean(req.body);
    if (typeof g === 'string') return res.status(400).json({ error: g });

    /* player_id를 조건에 같이 넣어 남의 장비는 건드릴 수 없게 한다.
       (id만 맞으면 고쳐지는 구조였다면 다른 선수 장비도 바꿀 수 있다) */
    const r = await db.execute({
      sql: `UPDATE player_gear SET category = ?, brand = ?, model_name = ?,
                                   price_krw = ?, product_url = ?
            WHERE id = ? AND player_id = ?`,
      args: [g.category, g.brand, g.model_name, g.price_krw, g.product_url, req.params.id, pid],
    });
    if (!r.rowsAffected) return res.status(404).json({ error: '내 장비에서 찾을 수 없습니다.' });

    res.json(await listGear(pid));
  } catch (e) { serverError(res, e, 'my-gear-edit'); }
});

// DELETE /api/me/gear/:id
myGearRouter.delete('/gear/:id', async (req, res) => {
  try {
    const pid = myPlayerId(req, res); if (!pid) return;
    const r = await db.execute({
      sql: 'DELETE FROM player_gear WHERE id = ? AND player_id = ?',
      args: [req.params.id, pid],
    });
    if (!r.rowsAffected) return res.status(404).json({ error: '내 장비에서 찾을 수 없습니다.' });
    res.json(await listGear(pid));
  } catch (e) { serverError(res, e, 'my-gear-del'); }
});

export default myGearRouter;
