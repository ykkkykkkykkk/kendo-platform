import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';

/* ── 재사용 테이블 ─────────────────────────────────────── */
function DataTable({ title, rows, columns, emptyMsg = '데이터 없음' }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold text-navy">{title}</h2>
        <span className="text-xs bg-gold/20 text-gold font-semibold px-2 py-0.5 rounded-full">
          {rows.length}건
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="border border-ink-100 rounded-xl py-6 text-center text-ink-400 text-xs">
          {emptyMsg}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-100 shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-ink-50 border-b border-ink-100">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2.5 text-left text-ink-500 font-semibold whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={`border-t border-ink-100 ${i % 2 === 1 ? 'bg-ink-50/40' : ''}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-ink-700 whitespace-nowrap">
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── 요약 카드 ─────────────────────────────────────────── */
function StatCard({ label, value, color = 'text-navy' }) {
  return (
    <div className="bg-white border border-ink-100 rounded-xl p-4 text-center">
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      <p className="text-ink-400 text-xs mt-1">{label}</p>
    </div>
  );
}

/* ── 메인 ──────────────────────────────────────────────── */
export default function Debug() {
  const navigate = useNavigate();

  // 프로덕션에서는 홈으로 튕김
  useEffect(() => {
    if (import.meta.env.PROD) navigate('/', { replace: true });
  }, [navigate]);

  const { data, loading, error } = useFetch(
    () => fetch('/api/debug').then((r) => r.json()),
    [],
  );

  // 프로덕션 빌드에서는 렌더링 자체를 막음
  if (import.meta.env.PROD) return null;

  if (loading) {
    return (
      <main className="page-body px-4 pt-12">
        <div className="flex items-center gap-2 text-ink-400 text-sm">
          <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
          DB 조회 중...
        </div>
      </main>
    );
  }

  if (error || data?.error) {
    return (
      <main className="page-body px-4 pt-12">
        <p className="text-red-500 text-sm">{data?.error ?? String(error)}</p>
      </main>
    );
  }

  const { users = [], follows = [], predictions = [] } = data ?? {};

  return (
    <main className="page-body px-4 pt-12 pb-10">

      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
        <h1 className="text-xl font-black text-navy">Debug Panel</h1>
        <span className="text-[11px] bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-bold">
          DEV ONLY
        </span>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="가입 유저"  value={users.length}       color="text-navy" />
        <StatCard label="팔로우"     value={follows.length}     color="text-gold" />
        <StatCard label="예측"       value={predictions.length} color="text-emerald-600" />
      </div>

      {/* Users */}
      <DataTable
        title="Users"
        rows={users}
        emptyMsg="가입한 사용자 없음"
        columns={[
          { key: 'id',         label: 'ID' },
          { key: 'nickname',   label: '닉네임' },
          { key: 'phone',      label: 'phone key' },
          {
            key: 'created_at',
            label: '가입일시',
            render: (v) => v?.replace('T', ' ').slice(0, 16) ?? '—',
          },
        ]}
      />

      {/* Follows */}
      <DataTable
        title="Follows"
        rows={follows}
        emptyMsg="팔로우 내역 없음"
        columns={[
          { key: 'user_id',        label: 'UID' },
          { key: 'user_nickname',  label: '유저' },
          { key: 'player_id',      label: 'PID' },
          { key: 'player_name',    label: '선수' },
          {
            key: 'created_at',
            label: '일시',
            render: (v) => v?.replace('T', ' ').slice(0, 16) ?? '—',
          },
        ]}
      />

      {/* Predictions */}
      <DataTable
        title="Predictions"
        rows={predictions}
        emptyMsg="예측 내역 없음"
        columns={[
          { key: 'user_nickname',    label: '유저' },
          { key: 'round',            label: '라운드' },
          { key: 'player_a',         label: '선수A' },
          { key: 'player_b',         label: '선수B' },
          {
            key: 'predicted_player',
            label: '예측',
            render: (v) => (
              <span className="font-semibold text-gold">{v ?? '—'}</span>
            ),
          },
          {
            key: 'predicted_at',
            label: '일시',
            render: (v) => v?.replace('T', ' ').slice(0, 16) ?? '—',
          },
        ]}
      />

    </main>
  );
}
