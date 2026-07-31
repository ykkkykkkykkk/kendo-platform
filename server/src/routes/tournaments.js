import { Router } from 'express';
import { db } from '../db.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// GET /api/tournaments
router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.execute(
      `SELECT * FROM tournaments ORDER BY start_date DESC`
    );
    res.json(rows);
  } catch (e) {
    serverError(res, e);
  }
});

// GET /api/tournaments/:slug/draw — 공개 대진표 (로그인 불필요)
// 부문 → 조(경기장) → 경기번호 순으로 실제 대진을 돌려준다.
// 각 경기의 양쪽은 선수(kind:'player')이거나 앞선 경기의 승자(kind:'from')다.
router.get('/:slug/draw', async (req, res) => {
  try {
    const { rows: [tournament] } = await db.execute({
      sql:  'SELECT id, name, slug, venue, status, start_date, end_date FROM tournaments WHERE slug = ?',
      args: [req.params.slug],
    });
    if (!tournament) return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });

    const { rows: divisions } = await db.execute({
      sql: `SELECT id, division_type, label, participant_count
            FROM tournament_divisions
            WHERE tournament_id = ? ORDER BY sort_order, id`,
      args: [tournament.id],
    });

    const { rows: matches } = await db.execute({
      sql: `SELECT bm.id, bm.division_id, bm.group_label, bm.court_label,
                   bm.match_number, bm.round_depth, bm.is_group_final, bm.is_final,
                   bm.status, bm.score_a, bm.score_b,
                   bm.a_participant_id, bm.b_participant_id, bm.winner_participant_id,
                   pa.name AS a_name, pa.slug AS a_slug, dpa.seed_number AS a_seed, ta.name AS a_team,
                   pb.name AS b_name, pb.slug AS b_slug, dpb.seed_number AS b_seed, tb.name AS b_team,
                   ma.match_number AS a_from_number, ma.group_label AS a_from_group,
                   ma.is_group_final AS a_from_is_group_final,
                   mb.match_number AS b_from_number, mb.group_label AS b_from_group,
                   mb.is_group_final AS b_from_is_group_final,
                   pw.name AS winner_name, pw.slug AS winner_slug
            FROM bracket_matches bm
            JOIN tournament_divisions td ON td.id = bm.division_id
            LEFT JOIN division_participants dpa ON dpa.id = bm.a_participant_id
            LEFT JOIN players pa ON pa.id = dpa.player_id
            LEFT JOIN teams   ta ON ta.id = pa.team_id
            LEFT JOIN division_participants dpb ON dpb.id = bm.b_participant_id
            LEFT JOIN players pb ON pb.id = dpb.player_id
            LEFT JOIN teams   tb ON tb.id = pb.team_id
            LEFT JOIN bracket_matches ma ON ma.id = bm.a_from_match_id
            LEFT JOIN bracket_matches mb ON mb.id = bm.b_from_match_id
            LEFT JOIN division_participants dpw ON dpw.id = bm.winner_participant_id
            LEFT JOIN players pw ON pw.id = dpw.player_id
            WHERE td.tournament_id = ?
            ORDER BY td.sort_order, bm.group_label, bm.match_number`,
      args: [tournament.id],
    });

    // 조 결승 승자를 가리킬 때는 '{조}조 우승'으로 구분한다 —
    // A조·B조의 조 결승은 경기번호가 같아서 '28경기 승자'만으로는 구분이 안 된다.
    const sideOf = (participantId, name, slug, team, seed, from) => {
      // participant_id로 비교해야 한다 — 동명이인이 실제로 있다(5단부 이창훈 2명).
      if (name) return { kind: 'player', participant_id: participantId, name, slug, team, seed };
      if (from.number == null) return { kind: 'tbd' };
      return from.isGroupFinal && from.group
        ? { kind: 'group_winner', group: from.group, number: from.number }
        : { kind: 'from', number: from.number, group: from.group };
    };

    const shape = (m) => ({
      id:             m.id,
      number:         m.match_number,
      round_depth:    m.round_depth,
      is_group_final: !!m.is_group_final,
      is_final:       !!m.is_final,
      status:         m.status,
      score_a:        m.score_a,
      score_b:        m.score_b,
      a:              sideOf(m.a_participant_id, m.a_name, m.a_slug, m.a_team, m.a_seed,
                             { number: m.a_from_number, group: m.a_from_group, isGroupFinal: !!m.a_from_is_group_final }),
      b:              sideOf(m.b_participant_id, m.b_name, m.b_slug, m.b_team, m.b_seed,
                             { number: m.b_from_number, group: m.b_from_group, isGroupFinal: !!m.b_from_is_group_final }),
      // 승자 강조는 participant_id로 판단한다 (이름 비교는 동명이인 때문에 틀린다)
      winner_participant_id: m.winner_participant_id,
      winner:         m.winner_name ? { name: m.winner_name, slug: m.winner_slug } : null,
      // 대진 연결선을 그리려면 이 경기의 승자가 어디서 왔는지 알아야 한다
      a_from_number:  m.a_from_number,
      b_from_number:  m.b_from_number,
    });

    const result = divisions.map((d) => {
      const mine = matches.filter((m) => m.division_id === d.id);
      const groupNames = [...new Set(mine.filter((m) => m.group_label).map((m) => m.group_label))].sort();
      return {
        id:                d.id,
        division_type:     d.division_type,
        label:             d.label,
        participant_count: d.participant_count,
        max_round:         mine.length ? Math.max(...mine.map((m) => m.round_depth)) : 0,
        groups: groupNames.map((g) => {
          const gm = mine.filter((m) => m.group_label === g);
          return {
            group:   g,
            court:   gm[0]?.court_label ?? null,
            matches: gm.map(shape),
          };
        }),
        final: mine.filter((m) => m.is_final).map(shape)[0] ?? null,
      };
    });

    res.json({ ...tournament, divisions: result });
  } catch (e) {
    serverError(res, e);
  }
});

// GET /api/tournaments/:slug
router.get('/:slug', async (req, res) => {
  try {
    const { rows: [tournament] } = await db.execute({
      sql:  'SELECT * FROM tournaments WHERE slug = ?',
      args: [req.params.slug],
    });
    if (!tournament) return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });

    const { rows: matches } = await db.execute({
      sql: `SELECT
              m.*,
              pa.name AS player_a_name, pa.slug AS player_a_slug,
              ta.name AS team_a_name,   ta.color_primary AS team_a_color,
              pb.name AS player_b_name, pb.slug AS player_b_slug,
              tb.name AS team_b_name,   tb.color_primary AS team_b_color,
              wp.name AS winner_name,   wt.name AS winner_team_name,
              (SELECT COUNT(*) FROM predictions pr
               WHERE pr.match_id = m.id AND pr.predicted_winner_player_id = m.player_a_id
              ) AS predict_a_count,
              (SELECT COUNT(*) FROM predictions pr
               WHERE pr.match_id = m.id AND pr.predicted_winner_player_id = m.player_b_id
              ) AS predict_b_count
            FROM matches m
            LEFT JOIN players pa ON pa.id = m.player_a_id
            LEFT JOIN players pb ON pb.id = m.player_b_id
            LEFT JOIN teams   ta ON ta.id = m.team_a_id
            LEFT JOIN teams   tb ON tb.id = m.team_b_id
            LEFT JOIN players wp ON wp.id = m.winner_player_id
            LEFT JOIN teams   wt ON wt.id = m.winner_team_id
            WHERE m.tournament_id = ?
            ORDER BY CASE m.round
              WHEN '16강' THEN 1 WHEN '8강' THEN 2
              WHEN '4강'  THEN 3 WHEN '결승' THEN 4
              WHEN '예선' THEN 0 END,
              m.bracket_position`,
      args: [tournament.id],
    });

    const bracket = matches.reduce((acc, m) => {
      (acc[m.round] = acc[m.round] ?? []).push(m);
      return acc;
    }, {});

    res.json({ ...tournament, bracket });
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
