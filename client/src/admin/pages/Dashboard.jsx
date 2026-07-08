import { useEffect, useState } from 'react';
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

export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGet('/stats')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
