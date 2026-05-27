import { useEffect, useState } from 'react';
import { Users, UserCheck, Trophy, Target } from 'lucide-react';
import { adminGet } from '../adminApi.js';

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl p-6 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900">{value ?? '—'}</p>
        <p className="text-gray-500 text-sm mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function RecentTable({ title, rows, columns }) {
  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">데이터 없음</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {columns.map((c) => (
                  <th key={c.key} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  {columns.map((c) => (
                    <td key={c.key} className="px-6 py-3 text-gray-700">
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
    <div className="p-8 text-gray-500 text-sm">로딩 중...</div>
  );

  const { stats = {}, recentUsers = [], recentPredictions = [] } = data ?? {};

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500 text-sm mt-1">전체 현황을 한눈에 확인합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="가입 사용자"   value={stats.users}             icon={Users}     color="bg-blue-500" />
        <StatCard label="등록 선수"     value={stats.players}           icon={UserCheck} color="bg-emerald-500" />
        <StatCard label="진행중 대회"   value={stats.activeTournaments} icon={Trophy}    color="bg-amber-500" />
        <StatCard label="총 예측 수"    value={stats.predictions}       icon={Target}    color="bg-purple-500" />
      </div>

      {/* 최근 데이터 테이블 */}
      <div className="grid grid-cols-2 gap-6">
        <RecentTable
          title="최근 가입자 10명"
          rows={recentUsers}
          columns={[
            { key: 'id',         label: 'ID' },
            { key: 'nickname',   label: '닉네임' },
            { key: 'phone',      label: 'Phone Key' },
            {
              key: 'created_at',
              label: '가입일시',
              render: (v) => v?.replace('T', ' ').slice(0, 16) ?? '—',
            },
          ]}
        />

        <RecentTable
          title="최근 예측 10건"
          rows={recentPredictions}
          columns={[
            { key: 'user_nickname',  label: '유저' },
            { key: 'round',          label: '라운드' },
            {
              key: 'predicted',
              label: '예측 선수',
              render: (v) => <span className="font-semibold text-amber-600">{v ?? '—'}</span>,
            },
            {
              key: 'predicted_at',
              label: '일시',
              render: (v) => v?.replace('T', ' ').slice(0, 16) ?? '—',
            },
          ]}
        />
      </div>
    </div>
  );
}
