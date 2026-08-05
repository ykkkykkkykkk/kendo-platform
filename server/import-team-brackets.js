// 남자 단체전(7인조·5인조) 대진 트리 등록.
// 하계단체전7인조.jpg / 하계단체전5인조.jpg 의 선과 경기번호 그대로.
//
// 검증 근거: 경기 수가 팀수-1과 정확히 일치하고(18팀→17경기, 19팀→18경기),
// 가운데 결승 번호도 종이와 같다(7인조 9, 5인조 10).
//
// 사용: node import-team-brackets.js            → 미리보기
//       node import-team-brackets.js --apply    → 반영
import { createClient } from '@libsql/client';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

// seed = 대진표 배정번호. p(n) = 그 번호 팀, w(n) = n경기 승자
const p = (n) => ({ seed: n });
const w = (n) => ({ from: n });

const PLAN = [
  {
    label: '남자단체7인조',
    A: [ // 왼쪽 (배정번호 1~9)
      { no: 1, d: 1, a: p(6),  b: p(7)  },   // 울산 vs 달서
      { no: 2, d: 1, a: p(1),  b: p(2)  },   // 제주 vs 부산
      { no: 3, d: 1, a: p(3),  b: p(4)  },   // 인천 vs 전북
      { no: 4, d: 2, a: p(5),  b: w(1)  },   // 구미 vs 1경기 승자
      { no: 5, d: 1, a: p(8),  b: p(9)  },   // 수원 vs 창원
      { no: 6, d: 2, a: w(2),  b: w(3)  },
      { no: 7, d: 3, a: w(4),  b: w(5)  },
      { no: 8, d: 4, a: w(6),  b: w(7), groupFinal: true },
    ],
    B: [ // 오른쪽 (배정번호 10~18)
      { no: 1, d: 1, a: p(12), b: p(13) },   // 남양주 vs 부천
      { no: 2, d: 1, a: p(10), b: p(11) },   // 인제 vs 무안
      { no: 3, d: 2, a: w(1),  b: p(14) },   // 1경기 승자 vs 대전
      { no: 4, d: 1, a: p(15), b: p(16) },   // 광명 vs 청주
      { no: 5, d: 1, a: p(17), b: p(18) },   // 광주 vs 용인
      { no: 6, d: 3, a: w(2),  b: w(3)  },
      { no: 7, d: 2, a: w(4),  b: w(5)  },
      { no: 8, d: 4, a: w(6),  b: w(7), groupFinal: true },
    ],
    finalNo: 9,
  },
  {
    label: '남자단체5인조',
    A: [ // 왼쪽 (배정번호 1~9)
      { no: 1, d: 1, a: p(6),  b: p(7)  },   // 용인 vs 인천
      { no: 2, d: 1, a: p(1),  b: p(2)  },   // 대전 vs 부천
      { no: 3, d: 1, a: p(3),  b: p(4)  },   // 구미 vs 수원
      { no: 4, d: 2, a: p(5),  b: w(1)  },   // 광주 vs 1경기 승자
      { no: 5, d: 1, a: p(8),  b: p(9)  },   // 청주 vs 인제
      { no: 6, d: 2, a: w(2),  b: w(3)  },
      { no: 7, d: 3, a: w(4),  b: w(5)  },
      { no: 8, d: 4, a: w(6),  b: w(7), groupFinal: true },
    ],
    B: [ // 오른쪽 (배정번호 10~19)
      { no: 1, d: 1, a: p(12), b: p(13) },   // 부산 vs 충남
      { no: 2, d: 1, a: p(16), b: p(17) },   // 남양주 vs 울산
      { no: 3, d: 1, a: p(10), b: p(11) },   // 광명 vs 무안
      { no: 4, d: 2, a: w(1),  b: p(14) },   // 1경기 승자 vs 달서
      { no: 5, d: 2, a: p(15), b: w(2)  },   // 창원 vs 2경기 승자
      { no: 6, d: 1, a: p(18), b: p(19) },   // 전북 vs 제주
      { no: 7, d: 3, a: w(3),  b: w(4)  },
      { no: 8, d: 3, a: w(5),  b: w(6)  },
      { no: 9, d: 4, a: w(7),  b: w(8), groupFinal: true },
    ],
    finalNo: 10,
  },
];

const COURT = { A: '1경기장', B: '2경기장' };
const problems = [];
const jobs = [];

for (const plan of PLAN) {
  const { rows: [div] } = await db.execute({
    sql: 'SELECT id, label, participant_count FROM tournament_divisions WHERE tournament_id = 2 AND label = ?',
    args: [plan.label],
  });
  if (!div) { problems.push(`${plan.label}: 부문이 없습니다`); continue; }

  const { rows: parts } = await db.execute({
    sql: `SELECT dp.id, dp.seed_number, t.name AS team
          FROM division_participants dp LEFT JOIN teams t ON t.id = dp.team_id
          WHERE dp.division_id = ? ORDER BY dp.seed_number`,
    args: [div.id],
  });
  const bySeed = Object.fromEntries(parts.map((x) => [x.seed_number, x]));

  const { rows: [{ n: existing }] } = await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM bracket_matches WHERE division_id = ?', args: [div.id],
  });
  if (existing) { problems.push(`${plan.label}: 이미 대진 ${existing}경기가 있습니다`); continue; }

  // 모든 배정번호가 실제 참가팀과 이어지는지, 빠진 팀이 없는지 확인
  const used = new Set();
  for (const g of ['A', 'B']) {
    for (const m of plan[g]) {
      for (const side of [m.a, m.b]) {
        if (side.seed == null) continue;
        if (!bySeed[side.seed]) problems.push(`${plan.label} ${g}조 ${m.no}경기: 배정번호 ${side.seed} 참가팀 없음`);
        if (used.has(side.seed)) problems.push(`${plan.label}: 배정번호 ${side.seed} 중복 사용`);
        used.add(side.seed);
      }
    }
  }
  for (const x of parts) if (!used.has(x.seed_number))
    problems.push(`${plan.label}: ${x.seed_number}번 ${x.team} 이 대진에 없음`);

  const total = plan.A.length + plan.B.length + 1;
  if (total !== parts.length - 1)
    problems.push(`${plan.label}: 경기 ${total}개인데 ${parts.length}팀이면 ${parts.length - 1}개여야 함`);

  jobs.push({ plan, div, bySeed, parts });
}

for (const { plan, div, bySeed, parts } of jobs) {
  console.log(`\n═══ ${plan.label} (division ${div.id}) · ${parts.length}팀 · ${plan.A.length + plan.B.length + 1}경기 ═══`);
  for (const g of ['A', 'B']) {
    console.log(`  [${g}조 / ${COURT[g]}]`);
    for (const m of plan[g]) {
      const nm = (s) => s.seed != null ? (bySeed[s.seed]?.team ?? `?${s.seed}`) : `${s.from}경기 승자`;
      console.log(`    ${String(m.no).padStart(2)}경기 (${m.d}R) ${nm(m.a)} vs ${nm(m.b)}${m.groupFinal ? '  ← 조결승' : ''}`);
    }
  }
  console.log(`  결승 ${plan.finalNo}경기: A조 우승 vs B조 우승`);
}

if (problems.length) {
  console.error(`\n❌ 문제 ${problems.length}건 — 아무것도 넣지 않습니다.`);
  for (const x of problems) console.error('   · ' + x);
  process.exit(1);
}
if (!APPLY) { console.log('\n(미리보기 — 반영 안 됨. 실행: --apply)'); process.exit(0); }

for (const { plan, div, bySeed } of jobs) {
  const idOf = {};   // `${group}-${no}` → bracket_matches.id

  for (const g of ['A', 'B']) {
    for (const m of plan[g]) {
      const side = (s) => s.seed != null
        ? { participant: bySeed[s.seed].id, from: null }
        : { participant: null, from: idOf[`${g}-${s.from}`] };
      const A = side(m.a), B = side(m.b);

      const r = await db.execute({
        sql: `INSERT INTO bracket_matches
                (division_id, group_label, court_label, match_number, round_depth,
                 is_group_final, is_final,
                 a_participant_id, b_participant_id, a_from_match_id, b_from_match_id)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        args: [div.id, g, COURT[g], m.no, m.d, m.groupFinal ? 1 : 0,
               A.participant, B.participant, A.from, B.from],
      });
      idOf[`${g}-${m.no}`] = Number(r.lastInsertRowid);
    }
  }

  // 부문 결승: 조결승 승자끼리
  await db.execute({
    sql: `INSERT INTO bracket_matches
            (division_id, group_label, court_label, match_number, round_depth,
             is_group_final, is_final, a_from_match_id, b_from_match_id)
          VALUES (?, NULL, NULL, ?, ?, 0, 1, ?, ?)`,
    args: [div.id, plan.finalNo, 5,
           idOf[`A-${plan.A[plan.A.length - 1].no}`],
           idOf[`B-${plan.B[plan.B.length - 1].no}`]],
  });

  console.log(`✅ ${plan.label} — ${plan.A.length + plan.B.length + 1}경기 등록`);
}
console.log('\n완료.');
process.exit(0);
