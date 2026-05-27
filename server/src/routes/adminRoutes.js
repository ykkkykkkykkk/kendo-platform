import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { serverError } from '../utils/apiError.js';
import { checkUrls } from '../utils/validateUrl.js';

const router = Router();
router.use(requireAdmin);

/* ════════════════════════════════════════
   대시보드
════════════════════════════════════════ */

router.get('/stats', async (_req, res) => {
  try {
    const [usersR, playersR, tournamentsR, predictionsR, recentUsersR, recentPredR] =
      await Promise.all([
        db.execute('SELECT COUNT(*) AS cnt FROM users'),
        db.execute('SELECT COUNT(*) AS cnt FROM players'),
        db.execute("SELECT COUNT(*) AS cnt FROM tournaments WHERE status != '종료'"),
        db.execute('SELECT COUNT(*) AS cnt FROM predictions'),
        db.execute(
          'SELECT id, nickname, phone, created_at FROM users ORDER BY created_at DESC LIMIT 10'
        ),
        db.execute(`
          SELECT pr.id, u.nickname AS user_nickname,
                 pa.name AS player_a, pb.name AS player_b,
                 pw.name AS predicted, m.round, pr.predicted_at
          FROM predictions pr
          JOIN users   u  ON u.id  = pr.user_id
          JOIN matches m  ON m.id  = pr.match_id
          LEFT JOIN players pa ON pa.id = m.player_a_id
          LEFT JOIN players pb ON pb.id = m.player_b_id
          LEFT JOIN players pw ON pw.id = pr.predicted_winner_player_id
          ORDER BY pr.predicted_at DESC LIMIT 10
        `),
      ]);

    res.json({
      stats: {
        users:             usersR.rows[0].cnt,
        players:           playersR.rows[0].cnt,
        activeTournaments: tournamentsR.rows[0].cnt,
        predictions:       predictionsR.rows[0].cnt,
      },
      recentUsers:       recentUsersR.rows,
      recentPredictions: recentPredR.rows,
    });
  } catch (e) { serverError(res, e); }
});

/* ════════════════════════════════════════
   팀 CRUD (목록은 드롭다운 + 관리 겸용)
════════════════════════════════════════ */

router.get('/teams', async (_req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT *,
             (SELECT COUNT(*) FROM players WHERE players.team_id = teams.id) AS player_count
      FROM teams ORDER BY championships DESC
    `);
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

router.get('/teams/:id', async (req, res) => {
  try {
    const { rows: [t] } = await db.execute({ sql: 'SELECT * FROM teams WHERE id = ?', args: [req.params.id] });
    if (!t) return res.status(404).json({ error: '팀을 찾을 수 없습니다.' });
    res.json(t);
  } catch (e) { serverError(res, e); }
});

router.post('/teams', async (req, res) => {
  try {
    const { name, slug, region, founded_year, logo_url, color_primary, championships } = req.body;
    if (!name?.trim() || !slug?.trim())
      return res.status(400).json({ error: '팀명과 슬러그는 필수입니다.' });
    const urlErrT = checkUrls(req.body, ['logo_url']);
    if (urlErrT) return res.status(400).json({ error: urlErrT });
    await db.execute({
      sql: `INSERT INTO teams (name, slug, region, founded_year, logo_url, color_primary, championships)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [name.trim(), slug.trim(), region || null, founded_year || null,
             logo_url || null, color_primary || '#0A1F44', championships || 0],
    });
    const { rows: [t] } = await db.execute({ sql: 'SELECT * FROM teams WHERE slug = ?', args: [slug.trim()] });
    res.status(201).json(t);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: '슬러그가 이미 존재합니다.' });
    serverError(res, e);
  }
});

router.put('/teams/:id', async (req, res) => {
  try {
    const { name, slug, region, founded_year, logo_url, color_primary, championships } = req.body;
    await db.execute({
      sql: `UPDATE teams SET name=?, slug=?, region=?, founded_year=?, logo_url=?, color_primary=?, championships=? WHERE id=?`,
      args: [name, slug, region || null, founded_year || null,
             logo_url || null, color_primary || '#0A1F44', championships || 0, req.params.id],
    });
    const { rows: [t] } = await db.execute({ sql: 'SELECT * FROM teams WHERE id = ?', args: [req.params.id] });
    res.json(t);
  } catch (e) { serverError(res, e); }
});

router.delete('/teams/:id', async (req, res) => {
  try {
    const id = req.params.id;
    // 소속 선수 team_id 를 null 로 (또는 거절)
    const { rows: [cnt] } = await db.execute({ sql: 'SELECT COUNT(*) AS c FROM players WHERE team_id = ?', args: [id] });
    if (cnt.c > 0) return res.status(409).json({ error: `소속 선수 ${cnt.c}명이 있습니다. 선수를 먼저 이동하세요.` });
    await db.execute({ sql: 'DELETE FROM teams WHERE id = ?', args: [id] });
    res.json({ deleted: true });
  } catch (e) { serverError(res, e); }
});

/* ════════════════════════════════════════
   클리닉 CRUD (관리자용)
════════════════════════════════════════ */

router.get('/clinics', async (req, res) => {
  try {
    const { status } = req.query;
    const { rows } = await db.execute({
      sql: `SELECT c.*, p.name AS player_name, p.slug AS player_slug
            FROM clinics c
            JOIN players p ON p.id = c.player_id
            ${status ? 'WHERE c.status = ?' : ''}
            ORDER BY c.scheduled_at DESC`,
      args: status ? [status] : [],
    });
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

router.get('/clinics/:id', async (req, res) => {
  try {
    const { rows: [c] } = await db.execute({ sql: 'SELECT * FROM clinics WHERE id = ?', args: [req.params.id] });
    if (!c) return res.status(404).json({ error: '클리닉을 찾을 수 없습니다.' });
    res.json(c);
  } catch (e) { serverError(res, e); }
});

router.post('/clinics', async (req, res) => {
  try {
    const { player_id, title, description, scheduled_at, venue, capacity, remaining_slots, price_krw, status } = req.body;
    if (!player_id || !title?.trim())
      return res.status(400).json({ error: '강사 선수와 제목은 필수입니다.' });
    const remaining = remaining_slots !== undefined && remaining_slots !== '' ? remaining_slots : capacity;
    const r = await db.execute({
      sql: `INSERT INTO clinics (player_id, title, description, scheduled_at, venue, capacity, remaining_slots, price_krw, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [player_id, title.trim(), description || null, scheduled_at || null, venue || null,
             capacity || null, remaining, price_krw || null, status || '모집중'],
    });
    const { rows: [c] } = await db.execute({ sql: 'SELECT * FROM clinics WHERE id = ?', args: [Number(r.lastInsertRowid)] });
    res.status(201).json(c);
  } catch (e) { serverError(res, e); }
});

router.put('/clinics/:id', async (req, res) => {
  try {
    const { player_id, title, description, scheduled_at, venue, capacity, remaining_slots, price_krw, status } = req.body;
    await db.execute({
      sql: `UPDATE clinics SET player_id=?, title=?, description=?, scheduled_at=?, venue=?,
            capacity=?, remaining_slots=?, price_krw=?, status=? WHERE id=?`,
      args: [player_id, title, description || null, scheduled_at || null, venue || null,
             capacity || null, remaining_slots, price_krw || null, status, req.params.id],
    });
    const { rows: [c] } = await db.execute({ sql: 'SELECT * FROM clinics WHERE id = ?', args: [req.params.id] });
    res.json(c);
  } catch (e) { serverError(res, e); }
});

router.delete('/clinics/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM clinic_bookings WHERE clinic_id = ?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM clinics WHERE id = ?', args: [req.params.id] });
    res.json({ deleted: true });
  } catch (e) { serverError(res, e); }
});

/* ════════════════════════════════════════
   스폰서십 CRUD
════════════════════════════════════════ */

router.get('/sponsorships', async (req, res) => {
  try {
    const { tournament_id } = req.query;
    const { rows } = await db.execute({
      sql: `SELECT s.*, t.name AS tournament_name
            FROM sponsorships s
            JOIN tournaments t ON t.id = s.tournament_id
            ${tournament_id ? 'WHERE s.tournament_id = ?' : ''}
            ORDER BY s.id DESC`,
      args: tournament_id ? [tournament_id] : [],
    });
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

router.post('/sponsorships', async (req, res) => {
  try {
    const { tournament_id, sponsor_name, sponsor_logo, reward_name, reward_image, reward_value_krw, reward_quantity, claim_condition } = req.body;
    if (!tournament_id || !sponsor_name?.trim() || !reward_name?.trim())
      return res.status(400).json({ error: '대회, 스폰서명, 상품명은 필수입니다.' });
    const urlErrS = checkUrls(req.body, ['sponsor_logo', 'reward_image']);
    if (urlErrS) return res.status(400).json({ error: urlErrS });
    const r = await db.execute({
      sql: `INSERT INTO sponsorships (tournament_id, sponsor_name, sponsor_logo, reward_name, reward_image, reward_value_krw, reward_quantity, claim_condition)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [tournament_id, sponsor_name.trim(), sponsor_logo || null, reward_name.trim(),
             reward_image || null, reward_value_krw || null, reward_quantity || null, claim_condition || null],
    });
    const { rows: [s] } = await db.execute({ sql: 'SELECT * FROM sponsorships WHERE id = ?', args: [Number(r.lastInsertRowid)] });
    res.status(201).json(s);
  } catch (e) { serverError(res, e); }
});

router.put('/sponsorships/:id', async (req, res) => {
  try {
    const { tournament_id, sponsor_name, sponsor_logo, reward_name, reward_image, reward_value_krw, reward_quantity, claim_condition } = req.body;
    await db.execute({
      sql: `UPDATE sponsorships SET tournament_id=?, sponsor_name=?, sponsor_logo=?, reward_name=?,
            reward_image=?, reward_value_krw=?, reward_quantity=?, claim_condition=? WHERE id=?`,
      args: [tournament_id, sponsor_name, sponsor_logo || null, reward_name,
             reward_image || null, reward_value_krw || null, reward_quantity || null, claim_condition || null, req.params.id],
    });
    const { rows: [s] } = await db.execute({ sql: 'SELECT * FROM sponsorships WHERE id = ?', args: [req.params.id] });
    res.json(s);
  } catch (e) { serverError(res, e); }
});

router.delete('/sponsorships/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM sponsorships WHERE id = ?', args: [req.params.id] });
    res.json({ deleted: true });
  } catch (e) { serverError(res, e); }
});

/* ════════════════════════════════════════
   선수 CRUD
════════════════════════════════════════ */

// GET /api/admin/players?team=&dan=
router.get('/players', async (req, res) => {
  try {
    const { team, dan } = req.query;
    const conditions = [];
    const args       = [];
    if (team) { conditions.push('p.team_id = ?');   args.push(team); }
    if (dan)  { conditions.push('p.dan_grade = ?'); args.push(dan);  }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await db.execute({
      sql: `SELECT p.*, t.name AS team_name,
                   ps.total_matches, ps.wins, ps.losses, ps.championships_won
            FROM players p
            JOIN teams t ON t.id = p.team_id
            LEFT JOIN player_stats ps ON ps.player_id = p.id
            ${where}
            ORDER BY t.name, p.name`,
      args,
    });
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

// POST /api/admin/players
router.post('/players', async (req, res) => {
  try {
    const {
      name, name_en, slug, team_id, dan_grade, birth_year, height_cm,
      position, bio, instagram_url, youtube_url, profile_image_url,
    } = req.body;

    if (!name?.trim() || !slug?.trim() || !team_id)
      return res.status(400).json({ error: '이름, 슬러그, 소속팀은 필수입니다.' });

    const urlErr = checkUrls(req.body, ['instagram_url', 'youtube_url', 'profile_image_url']);
    if (urlErr) return res.status(400).json({ error: urlErr });

    await db.execute({
      sql: `INSERT INTO players
              (name, name_en, slug, team_id, dan_grade, birth_year, height_cm,
               position, bio, instagram_url, youtube_url, profile_image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        name.trim(), name_en || null, slug.trim(), team_id,
        dan_grade || null, birth_year || null, height_cm || null,
        position || null, bio || null, instagram_url || null,
        youtube_url || null, profile_image_url || null,
      ],
    });

    const { rows: [player] } = await db.execute({
      sql:  'SELECT * FROM players WHERE slug = ?',
      args: [slug.trim()],
    });
    res.status(201).json(player);
  } catch (e) {
    if (e.message?.includes('UNIQUE'))
      return res.status(409).json({ error: '슬러그가 이미 존재합니다.' });
    serverError(res, e);
  }
});

// PUT /api/admin/players/:id
router.put('/players/:id', async (req, res) => {
  try {
    const {
      name, name_en, slug, team_id, dan_grade, birth_year, height_cm,
      position, bio, instagram_url, youtube_url, profile_image_url,
    } = req.body;

    const urlErrP = checkUrls(req.body, ['instagram_url', 'youtube_url', 'profile_image_url']);
    if (urlErrP) return res.status(400).json({ error: urlErrP });

    await db.execute({
      sql: `UPDATE players SET
              name = ?, name_en = ?, slug = ?, team_id = ?,
              dan_grade = ?, birth_year = ?, height_cm = ?,
              position = ?, bio = ?, instagram_url = ?, youtube_url = ?, profile_image_url = ?
            WHERE id = ?`,
      args: [
        name, name_en || null, slug, team_id,
        dan_grade || null, birth_year || null, height_cm || null,
        position || null, bio || null, instagram_url || null,
        youtube_url || null, profile_image_url || null,
        req.params.id,
      ],
    });

    const { rows: [player] } = await db.execute({
      sql:  'SELECT * FROM players WHERE id = ?',
      args: [req.params.id],
    });
    res.json(player);
  } catch (e) { serverError(res, e); }
});

// DELETE /api/admin/players/:id  (cascade 수동 처리)
router.delete('/players/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // 클리닉 예약 → 클리닉 → 팔로우 → 예측(null) → 매치(null) → 장비 → 통계 → 선수
    const { rows: clinics } = await db.execute({
      sql: 'SELECT id FROM clinics WHERE player_id = ?', args: [id],
    });
    for (const { id: cid } of clinics)
      await db.execute({ sql: 'DELETE FROM clinic_bookings WHERE clinic_id = ?', args: [cid] });

    await db.execute({ sql: 'DELETE FROM clinics     WHERE player_id = ?',           args: [id] });
    await db.execute({ sql: 'DELETE FROM follows      WHERE player_id = ?',           args: [id] });
    await db.execute({ sql: 'UPDATE predictions SET predicted_winner_player_id = NULL WHERE predicted_winner_player_id = ?', args: [id] });
    await db.execute({ sql: 'UPDATE matches SET player_a_id    = NULL WHERE player_a_id    = ?', args: [id] });
    await db.execute({ sql: 'UPDATE matches SET player_b_id    = NULL WHERE player_b_id    = ?', args: [id] });
    await db.execute({ sql: 'UPDATE matches SET winner_player_id = NULL WHERE winner_player_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM player_gear  WHERE player_id = ?',           args: [id] });
    await db.execute({ sql: 'DELETE FROM player_stats WHERE player_id = ?',           args: [id] });
    await db.execute({ sql: 'DELETE FROM players      WHERE id = ?',                  args: [id] });

    res.json({ deleted: true });
  } catch (e) { serverError(res, e); }
});

/* ════════════════════════════════════════
   장비 CRUD
════════════════════════════════════════ */

// GET /api/admin/players/:id/gear
router.get('/players/:id/gear', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql:  'SELECT * FROM player_gear WHERE player_id = ? ORDER BY display_order, id',
      args: [req.params.id],
    });
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

// POST /api/admin/players/:id/gear
router.post('/players/:id/gear', async (req, res) => {
  try {
    const { category, brand, model_name, price_krw, product_url, image_url, display_order } = req.body;
    const urlErrG = checkUrls(req.body, ['product_url', 'image_url']);
    if (urlErrG) return res.status(400).json({ error: urlErrG });
    await db.execute({
      sql: `INSERT INTO player_gear
              (player_id, category, brand, model_name, price_krw, product_url, image_url, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [req.params.id, category, brand || null, model_name,
             price_krw || null, product_url || null, image_url || null, display_order ?? 0],
    });
    const { rows: [gear] } = await db.execute({
      sql:  'SELECT * FROM player_gear WHERE player_id = ? ORDER BY id DESC LIMIT 1',
      args: [req.params.id],
    });
    res.status(201).json(gear);
  } catch (e) { serverError(res, e); }
});

// PUT /api/admin/gear/:id
router.put('/gear/:id', async (req, res) => {
  try {
    const { category, brand, model_name, price_krw, product_url, image_url, display_order } = req.body;
    await db.execute({
      sql: `UPDATE player_gear SET
              category = ?, brand = ?, model_name = ?, price_krw = ?,
              product_url = ?, image_url = ?, display_order = ?
            WHERE id = ?`,
      args: [category, brand || null, model_name, price_krw || null,
             product_url || null, image_url || null, display_order ?? 0, req.params.id],
    });
    const { rows: [gear] } = await db.execute({
      sql: 'SELECT * FROM player_gear WHERE id = ?', args: [req.params.id],
    });
    res.json(gear);
  } catch (e) { serverError(res, e); }
});

// DELETE /api/admin/gear/:id
router.delete('/gear/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM player_gear WHERE id = ?', args: [req.params.id] });
    res.json({ deleted: true });
  } catch (e) { serverError(res, e); }
});

/* ════════════════════════════════════════
   대회 CRUD
════════════════════════════════════════ */

// GET /api/admin/tournaments
router.get('/tournaments', async (_req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT t.*,
             (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id) AS match_count
      FROM tournaments t
      ORDER BY t.start_date DESC
    `);
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

// GET /api/admin/tournaments/:id
router.get('/tournaments/:id', async (req, res) => {
  try {
    const { rows: [t] } = await db.execute({ sql: 'SELECT * FROM tournaments WHERE id = ?', args: [req.params.id] });
    if (!t) return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });
    res.json(t);
  } catch (e) { serverError(res, e); }
});

// POST /api/admin/tournaments
router.post('/tournaments', async (req, res) => {
  try {
    const { name, slug, start_date, end_date, venue, host_organization, tournament_type, poster_image_url, status } = req.body;
    if (!name?.trim() || !slug?.trim())
      return res.status(400).json({ error: '대회명과 슬러그는 필수입니다.' });
    await db.execute({
      sql: `INSERT INTO tournaments (name, slug, start_date, end_date, venue, host_organization, tournament_type, poster_image_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [name.trim(), slug.trim(), start_date || null, end_date || null, venue || null,
             host_organization || null, tournament_type || '개인전', poster_image_url || null, status || '예정'],
    });
    const { rows: [t] } = await db.execute({ sql: 'SELECT * FROM tournaments WHERE slug = ?', args: [slug.trim()] });
    res.status(201).json(t);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: '슬러그가 이미 존재합니다.' });
    serverError(res, e);
  }
});

// PUT /api/admin/tournaments/:id
router.put('/tournaments/:id', async (req, res) => {
  try {
    const { name, slug, start_date, end_date, venue, host_organization, tournament_type, poster_image_url, status } = req.body;
    await db.execute({
      sql: `UPDATE tournaments SET name=?, slug=?, start_date=?, end_date=?, venue=?,
            host_organization=?, tournament_type=?, poster_image_url=?, status=? WHERE id=?`,
      args: [name, slug, start_date || null, end_date || null, venue || null,
             host_organization || null, tournament_type, poster_image_url || null, status, req.params.id],
    });
    const { rows: [t] } = await db.execute({ sql: 'SELECT * FROM tournaments WHERE id = ?', args: [req.params.id] });
    res.json(t);
  } catch (e) { serverError(res, e); }
});

// DELETE /api/admin/tournaments/:id
router.delete('/tournaments/:id', async (req, res) => {
  const tid = req.params.id;
  try {
    const { rows: mids } = await db.execute({ sql: 'SELECT id FROM matches WHERE tournament_id = ?', args: [tid] });
    for (const { id: mid } of mids)
      await db.execute({ sql: 'DELETE FROM predictions WHERE match_id = ?', args: [mid] });
    await db.execute({ sql: 'DELETE FROM matches      WHERE tournament_id = ?', args: [tid] });
    await db.execute({ sql: 'DELETE FROM sponsorships WHERE tournament_id = ?', args: [tid] });
    await db.execute({ sql: 'DELETE FROM tournaments  WHERE id = ?',            args: [tid] });
    res.json({ deleted: true });
  } catch (e) { serverError(res, e); }
});

/* ════════════════════════════════════════
   매치 조회
════════════════════════════════════════ */

// GET /api/admin/tournaments/:id/matches
router.get('/tournaments/:id/matches', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `SELECT m.*,
                   pa.name AS player_a_name, pa.slug AS player_a_slug,
                   pb.name AS player_b_name, pb.slug AS player_b_slug,
                   pw.name AS winner_name
            FROM matches m
            LEFT JOIN players pa ON pa.id = m.player_a_id
            LEFT JOIN players pb ON pb.id = m.player_b_id
            LEFT JOIN players pw ON pw.id = m.winner_player_id
            WHERE m.tournament_id = ?
            ORDER BY CASE m.round
              WHEN '16강' THEN 1 WHEN '8강' THEN 2
              WHEN '4강'  THEN 3 WHEN '결승' THEN 4 ELSE 0 END,
              m.bracket_position`,
      args: [req.params.id],
    });
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

/* ════════════════════════════════════════
   대진표 일괄 생성
════════════════════════════════════════ */

// POST /api/admin/tournaments/:id/matches/generate
// body: { type: "16강"|"8강", players: [...playerIds], match_type: "개인전"|"단체전" }
router.post('/tournaments/:id/matches/generate', async (req, res) => {
  const tid = req.params.id;
  try {
    const { type, players, match_type = '개인전' } = req.body;

    // 이미 매치가 있으면 거부
    const { rows: [cnt] } = await db.execute({
      sql: 'SELECT COUNT(*) AS c FROM matches WHERE tournament_id = ?', args: [tid],
    });
    if (cnt.c > 0)
      return res.status(409).json({ error: '이미 대진표가 있습니다. 전체 삭제 후 재생성하세요.' });

    // 중복 선수 검사
    const valid = players.filter(Boolean).map(Number);
    if (new Set(valid).size < valid.length)
      return res.status(400).json({ error: '같은 선수를 중복 선택할 수 없습니다.' });

    // 결승 → 상위 라운드 → 하위 라운드 순서로 생성 (parent_match_id를 즉시 연결)
    const ins = async (round, pos, a, b, parentId) => {
      const r = await db.execute({
        sql: `INSERT INTO matches (tournament_id, match_type, round, bracket_position,
               player_a_id, player_b_id, parent_match_id, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, '예정')`,
        args: [tid, match_type, round, pos, a || null, b || null, parentId || null],
      });
      return Number(r.lastInsertRowid);
    };

    if (type === '16강') {
      if (valid.length !== 16)
        return res.status(400).json({ error: '16강은 선수 16명이 필요합니다.' });

      const fin = await ins('결승', 1, null, null, null);
      const sf1 = await ins('4강',  1, null, null, fin);
      const sf2 = await ins('4강',  2, null, null, fin);
      const qf1 = await ins('8강',  1, null, null, sf1);
      const qf2 = await ins('8강',  2, null, null, sf1);
      const qf3 = await ins('8강',  3, null, null, sf2);
      const qf4 = await ins('8강',  4, null, null, sf2);

      await ins('16강', 1, valid[0],  valid[1],  qf1);
      await ins('16강', 2, valid[2],  valid[3],  qf1);
      await ins('16강', 3, valid[4],  valid[5],  qf2);
      await ins('16강', 4, valid[6],  valid[7],  qf2);
      await ins('16강', 5, valid[8],  valid[9],  qf3);
      await ins('16강', 6, valid[10], valid[11], qf3);
      await ins('16강', 7, valid[12], valid[13], qf4);
      await ins('16강', 8, valid[14], valid[15], qf4);

    } else if (type === '8강') {
      if (valid.length !== 8)
        return res.status(400).json({ error: '8강은 선수 8명이 필요합니다.' });

      const fin = await ins('결승', 1, null, null, null);
      const sf1 = await ins('4강',  1, null, null, fin);
      const sf2 = await ins('4강',  2, null, null, fin);

      await ins('8강', 1, valid[0], valid[1], sf1);
      await ins('8강', 2, valid[2], valid[3], sf1);
      await ins('8강', 3, valid[4], valid[5], sf2);
      await ins('8강', 4, valid[6], valid[7], sf2);

    } else {
      return res.status(400).json({ error: 'type은 "16강" 또는 "8강"이어야 합니다.' });
    }

    // 생성된 전체 매치 반환
    const { rows } = await db.execute({
      sql: `SELECT m.*, pa.name AS player_a_name, pb.name AS player_b_name
            FROM matches m
            LEFT JOIN players pa ON pa.id = m.player_a_id
            LEFT JOIN players pb ON pb.id = m.player_b_id
            WHERE m.tournament_id = ?
            ORDER BY CASE m.round
              WHEN '16강' THEN 1 WHEN '8강' THEN 2
              WHEN '4강'  THEN 3 WHEN '결승' THEN 4 ELSE 0 END,
              m.bracket_position`,
      args: [tid],
    });
    res.status(201).json(rows);
  } catch (e) { serverError(res, e); }
});

// DELETE /api/admin/tournaments/:id/matches (전체 삭제 → 재생성 가능)
router.delete('/tournaments/:id/matches', async (req, res) => {
  try {
    const { rows: mids } = await db.execute({
      sql: 'SELECT id FROM matches WHERE tournament_id = ?', args: [req.params.id],
    });
    for (const { id: mid } of mids)
      await db.execute({ sql: 'DELETE FROM predictions WHERE match_id = ?', args: [mid] });
    await db.execute({ sql: 'DELETE FROM matches WHERE tournament_id = ?', args: [req.params.id] });
    res.json({ deleted: mids.length });
  } catch (e) { serverError(res, e); }
});

/* ════════════════════════════════════════
   매치 편집 / 결과 입력
════════════════════════════════════════ */

// PUT /api/admin/matches/:id (일시·선수 수정)
router.put('/matches/:id', async (req, res) => {
  try {
    const { scheduled_at, player_a_id, player_b_id, status } = req.body;
    await db.execute({
      sql: `UPDATE matches SET scheduled_at=?, player_a_id=?, player_b_id=?, status=? WHERE id=?`,
      args: [scheduled_at || null, player_a_id || null, player_b_id || null, status || '예정', req.params.id],
    });
    const { rows: [m] } = await db.execute({ sql: 'SELECT * FROM matches WHERE id = ?', args: [req.params.id] });
    res.json(m);
  } catch (e) { serverError(res, e); }
});

// PUT /api/admin/matches/:id/result (결과 입력 + 다음 라운드 자동 진출)
router.put('/matches/:id/result', async (req, res) => {
  const matchId = req.params.id;
  try {
    const { winner_player_id, score_a, score_b } = req.body;

    // 현재 매치 결과 저장
    await db.execute({
      sql: `UPDATE matches SET winner_player_id=?, score_a=?, score_b=?, status='종료' WHERE id=?`,
      args: [winner_player_id, score_a ?? null, score_b ?? null, matchId],
    });

    // 현재 매치 조회
    const { rows: [match] } = await db.execute({
      sql: 'SELECT * FROM matches WHERE id = ?', args: [matchId],
    });

    // 결승이면 더 이상 진출 없음
    if (!match.parent_match_id) {
      const { rows: [updated] } = await db.execute({ sql: 'SELECT * FROM matches WHERE id = ?', args: [matchId] });
      return res.json({ match: updated, advanced: null });
    }

    // 같은 부모를 공유하는 형제 매치 조회 (bracket_position 오름차순)
    const { rows: siblings } = await db.execute({
      sql: 'SELECT id, bracket_position FROM matches WHERE parent_match_id = ? ORDER BY bracket_position ASC',
      args: [match.parent_match_id],
    });

    // 현재 매치가 siblings 중 첫 번째면 → player_a, 아니면 → player_b
    const isFirst = siblings[0]?.id === Number(matchId);
    const slot    = isFirst ? 'player_a_id' : 'player_b_id';

    await db.execute({
      sql:  `UPDATE matches SET ${slot} = ? WHERE id = ?`,
      args: [winner_player_id, match.parent_match_id],
    });

    const { rows: [updated] } = await db.execute({ sql: 'SELECT * FROM matches WHERE id = ?', args: [matchId] });
    const { rows: [parent]  } = await db.execute({ sql: 'SELECT * FROM matches WHERE id = ?', args: [match.parent_match_id] });
    res.json({ match: updated, advanced: { matchId: match.parent_match_id, slot, parent } });
  } catch (e) { serverError(res, e); }
});

export default router;
