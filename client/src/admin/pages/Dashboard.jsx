import { useEffect, useState, useCallback } from 'react';
import { adminGet } from '../adminApi.js';

function StatTile({ label, value, hint }) {
  return (
    <div className="border border-ink-200 p-5">
      <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium uppercase">{label}</p>
      <p className="text-3xl font-bold text-ink tracking-[-0.03em] tabular-nums mt-2">{value ?? '—'}</p>
      {hint && <p className="text-ink-400 text-xs mt-1">{hint}</p>}
    </div>
  );
}

function RecentTable({ title, rows, columns }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-2">{title}</p>
      {rows.length === 0 ? (
        <div className="border border-ink-200 py-8 text-center text-ink-400 text-sm">데이터 없음</div>
      ) : (
        <div className="overflow-x-auto border border-ink-200">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #111111' }}>
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-left text-[10px] font-medium text-ink-400 uppercase tracking-[0.15em]">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-ink-200 last:border-0 hover:bg-ink-200/20">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-ink">
                      {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── 방문자 막대차트 ──────────────────────────────
   흑백 모노톤: 조회수=연회색 전체 막대, 순방문자=잉크(하단), 사이 2px 갭.
   순방문자 ≤ 조회수 가 항상 성립하므로 겹쳐 그려도 의미가 맞음.
   명도 차이로 구분 → 색맹 안전. */
const INK = '#111111';
const GRAY = '#d4d4d4';

function fmtBucket(b, kind) {
  if (!b) return '';
  return kind === 'daily' ? b.slice(5).replace('-', '/') : b.slice(2).replace('-', '.'); // MM/DD | YY.MM
}

function VisitBarChart({ data = [], kind }) {
  const [hover, setHover] = useState(null);
  if (!data.length) return <div className="border border-ink-200 py-10 text-center text-ink-400 text-sm">데이터 없음</div>;

  const H = 210, padT = 14, padB = 30, padL = 38, padR = 8;
  const slotW = kind === 'daily' ? 26 : 54;
  const W = padL + padR + data.length * slotW;
  const plotH = H - padT - padB;
  const maxV = Math.max(1, ...data.map((d) => d.views));
  const yOf = (v) => padT + plotH * (1 - v / maxV);
  const barW = Math.min(slotW * 0.62, 24);
  const hasData = data.some((d) => d.views > 0);

  // 그리드 3단계 (0, 중간, 최대)
  const ticks = [0, Math.round(maxV / 2), maxV];
  const labelEvery = kind === 'daily' ? Math.ceil(data.length / 8) : 1;

  return (
    <div className="relative">
      {/* 범례 */}
      <div className="flex items-center gap-4 mb-2 text-[11px] text-ink-600">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ background: INK }} />순방문자</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ background: GRAY }} />조회수</span>
      </div>

      {!hasData && (
        <div className="absolute inset-0 top-8 flex items-center justify-center text-ink-400 text-sm z-10 pointer-events-none">
          아직 방문 데이터가 없습니다
        </div>
      )}

      <div className="overflow-x-auto">
        <svg width={W} height={H} role="img" aria-label={`${kind === 'daily' ? '일별' : '월별'} 방문자`}>
          {/* 그리드 + y라벨 */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={yOf(t)} x2={W - padR} y2={yOf(t)} stroke="#ececec" strokeWidth="1" />
              <text x={padL - 6} y={yOf(t) + 3} textAnchor="end" fontSize="9" fill="#9a9a9a" className="tabular-nums">{t}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = padL + i * slotW + slotW / 2;
            const x = cx - barW / 2;
            const yViews = yOf(d.views);
            const yUniq = yOf(d.uniques);
            const gap = d.uniques > 0 && d.views > d.uniques ? 2 : 0; // 두 채움 사이 2px 서피스 갭
            return (
              <g key={i}
                 onMouseEnter={() => setHover(i)}
                 onMouseLeave={() => setHover((h) => (h === i ? null : h))}>
                {/* 조회수(연회색) 전체 */}
                {d.views > 0 && (
                  <rect x={x} y={yViews} width={barW} height={Math.max(0, (yUniq - gap) - yViews)} fill={GRAY} rx="1" />
                )}
                {/* 순방문자(잉크) 하단 */}
                {d.uniques > 0 && (
                  <rect x={x} y={yUniq} width={barW} height={padT + plotH - yUniq} fill={INK} rx="1" />
                )}
                {/* 호버 히트영역 */}
                <rect x={padL + i * slotW} y={padT} width={slotW} height={plotH} fill="transparent" />
                {hover === i && <rect x={padL + i * slotW} y={padT} width={slotW} height={plotH} fill="#11111108" />}
                {/* x라벨 */}
                {i % labelEvery === 0 && (
                  <text x={cx} y={H - 12} textAnchor="middle" fontSize="9" fill="#9a9a9a">{fmtBucket(d.bucket, kind)}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 툴팁 */}
      {hover != null && data[hover] && (
        <div className="absolute top-0 right-0 bg-ink text-white text-[11px] px-3 py-2 pointer-events-none shadow-lg">
          <div className="font-semibold mb-0.5">{data[hover].bucket}</div>
          <div>순방문자 <span className="tabular-nums font-bold">{data[hover].uniques}</span></div>
          <div>조회수 <span className="tabular-nums font-bold">{data[hover].views}</span></div>
        </div>
      )}
    </div>
  );
}

/* last_seen_at은 SQLite datetime('now') — UTC인데 타임존 표시가 없다.
   그대로 Date에 넣으면 브라우저가 현지시각으로 읽어 9시간이 어긋난다. */
function agoText(ts) {
  if (!ts) return '';
  const t = new Date(`${String(ts).replace(' ', 'T')}Z`).getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.floor((Date.now() - t) / 60000));
  return min < 1 ? '방금' : `${min}분 전`;
}

export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [visits,  setVisits]  = useState(null);
  const [online,  setOnline]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);
  const [at,      setAt]      = useState(null);   // 마지막으로 불러온 시각

  /* 페이지를 새로 열지 않고도 지금 숫자를 다시 받는다.
     방문·앱 접속은 계속 쌓이므로 띄워둔 화면은 금방 옛날 값이 된다. */
  const load = useCallback(async () => {
    setBusy(true);
    try {
      await Promise.all([
        adminGet('/stats').then(setData).catch(console.error),
        adminGet('/stats/visits').then(setVisits).catch(console.error),
        adminGet('/stats/online').then(setOnline).catch(console.error),
      ]);
      setAt(new Date());
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="p-8 text-ink-400 text-sm">로딩 중...</div>
  );

  const { stats = {}, recentUsers = [], recentPredictions = [] } = data ?? {};

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">DASHBOARD</p>
        <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">대시보드</h1>
        <p className="text-ink-400 text-sm mt-1">전체 현황을 한눈에 확인합니다.</p>
      </div>

      {/* 통계 타일 */}
      <div className="grid grid-cols-4 gap-3 mb-10">
        <StatTile label="가입 사용자"   value={stats.users} />
        <StatTile label="등록 선수"     value={stats.players} />
        <StatTile label="진행중 대회"   value={stats.activeTournaments} />
        <StatTile label="총 예측 수"    value={stats.predictions} />
      </div>

      {/* 현재 접속자 — 새로고침 버튼으로 같이 갱신된다 */}
      <div className="mb-10">
        <div className="flex items-baseline gap-3 mb-3">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">ONLINE — 현재 접속자</p>
          <span className="text-[11px] text-ink-400">
            최근 {online?.window_minutes ?? 10}분 · 회원 {online?.users?.length ?? 0}명
            {online?.guests > 0 && ` · 비로그인 ${online.guests}명`}
          </span>
        </div>

        {online?.users?.length ? (
          <div className="border border-ink-200 divide-y divide-ink-200">
            {online.users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-lime flex-none" />
                <span className="text-ink text-sm font-medium truncate">{u.nickname}</span>
                {u.role === 'player' && (
                  <span className="text-[10px] text-ink-600 border border-ink-200 rounded-full px-1.5 py-0.5 flex-none">
                    선수{u.player_name ? ` · ${u.player_name}` : ''}
                  </span>
                )}
                <span className="text-ink-400 text-xs truncate">{u.dojo_name ?? ''}</span>
                <span className="flex-1" />
                <span className="text-ink-400 text-[11px] tabular-nums flex-none">
                  {agoText(u.last_seen_at)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-ink-200 px-4 py-6 text-ink-400 text-sm">
            최근 {online?.window_minutes ?? 10}분 안에 활동한 회원이 없습니다.
          </div>
        )}

        <p className="text-[11px] text-ink-400 mt-2">
          로그인한 회원만 이름이 뜹니다. 접속 시각은 3분에 한 번 기록돼 그만큼 늦을 수 있습니다.
        </p>
      </div>

      {/* 방문자 통계 */}
      <div className="mb-10">
        <div className="flex items-baseline gap-3 mb-3">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">VISITORS — 방문자 통계</p>
          <button
            onClick={load}
            disabled={busy}
            className="text-[11px] text-ink-600 border border-ink-200 rounded-full px-2.5 py-1
                       hover:border-ink transition-colors disabled:opacity-40"
          >
            {busy ? '불러오는 중…' : '새로고침'}
          </button>
          {at && (
            <span className="text-[11px] text-ink-400 tabular-nums">
              {at.toLocaleTimeString('ko-KR', { hour12: false })} 기준
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-3">
          <StatTile label="오늘 순방문자"   value={visits?.today?.uniques} />
          <StatTile label="오늘 조회수"     value={visits?.today?.views} />
          <StatTile label="이번달 순방문자" value={visits?.month?.uniques} />
          <StatTile label="이번달 조회수"   value={visits?.month?.views} />
        </div>

        {/* 앱/웹 — 순방문자 기준. Play Console 설치 수와 달리 실제로 연 사람만 센다 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatTile label="오늘 앱 접속"     value={visits?.today?.app_uniques} />
          <StatTile label="오늘 웹 접속"     value={visits?.today?.web_uniques} />
          <StatTile label="이번달 앱 접속"   value={visits?.month?.app_uniques} />
          <StatTile label="이번달 웹 접속"   value={visits?.month?.web_uniques} />
        </div>

        {visits?.month?.unknown_uniques > 0 && (
          <p className="text-[11px] text-ink-400 mb-6 -mt-3">
            이번달 {visits.month.unknown_uniques}명은 앱/웹 구분 기록이 남기 전에 방문해 어느 쪽에도 안 잡힙니다.
          </p>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="border border-ink-200 p-5">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">DAILY — 최근 30일 (일별)</p>
            <VisitBarChart data={visits?.daily ?? []} kind="daily" />
          </div>
          <div className="border border-ink-200 p-5">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">MONTHLY — 최근 12개월 (월별)</p>
            <VisitBarChart data={visits?.monthly ?? []} kind="monthly" />
          </div>
        </div>
      </div>

      {/* 최근 데이터 테이블 */}
      <div className="grid grid-cols-2 gap-6">
        <RecentTable
          title="RECENT USERS — 최근 가입자 10명"
          rows={recentUsers}
          columns={[
            { key: 'id',         label: 'ID',      render: (v) => <span className="text-ink-400 tabular-nums">{v}</span> },
            { key: 'nickname',   label: '닉네임',  render: (v) => <span className="font-semibold">{v}</span> },
            { key: 'phone',      label: 'Phone Key' },
            {
              key: 'created_at',
              label: '가입일시',
              render: (v) => <span className="tabular-nums text-ink-600">{v?.replace('T', ' ').slice(0, 16) ?? '—'}</span>,
            },
          ]}
        />

        <RecentTable
          title="RECENT PICKS — 최근 예측 10건"
          rows={recentPredictions}
          columns={[
            { key: 'user_nickname',  label: '유저' },
            { key: 'round',          label: '라운드' },
            {
              key: 'predicted',
              label: '예측 선수',
              render: (v) => <span className="font-semibold text-ink">{v ? <span className="bg-lime px-1">{v}</span> : '—'}</span>,
            },
            {
              key: 'predicted_at',
              label: '일시',
              render: (v) => <span className="tabular-nums text-ink-600">{v?.replace('T', ' ').slice(0, 16) ?? '—'}</span>,
            },
          ]}
        />
      </div>
    </div>
  );
}
