import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader } from 'lucide-react';
import { adminGet } from '../../adminApi.js';

/**
 * 회원들이 입력한 픽 조회 (관리자 전용, 읽기만).
 * 사용자용 /divisions/:id/all-picks는 마감 뒤에만 열리고 집계만 주므로 여기서 따로 본다.
 */
export default function TournamentPicks() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [divFilter, setDiv]   = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const d = await adminGet(`/picks?tournament_id=${id}`);
    setData(d);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center gap-2 text-ink-400 py-12"><Loader size={16} className="animate-spin" /> 불러오는 중…</div>;
  }

  const picks = data?.picks ?? [];
  const tops  = data?.top_picks ?? [];

  const divisions = [...new Map(picks.map((p) => [p.division_id, p.division_label])).entries()]
    .map(([id2, label]) => ({ id: id2, label }));
  const shown = divFilter === 'all' ? picks : picks.filter((p) => String(p.division_id) === String(divFilter));

  const byUser = new Set(picks.map((p) => p.user_id)).size;

  const cell = (name, team) =>
    name ? <><span className="text-ink">{name}</span> <span className="text-ink-400 text-[11px]">{team}</span></> : <span className="text-ink-400">—</span>;

  return (
    <div>
      <button onClick={() => navigate('/admin/tournaments')} className="flex items-center gap-1 text-ink-600 text-sm mb-4 pressable">
        <ChevronLeft size={16} /> 대회 목록
      </button>

      <h1 className="text-2xl font-bold text-ink mb-1">회원 픽 조회</h1>
      <p className="text-ink-400 text-sm mb-5">{byUser}명이 총 {picks.length}건 입력했습니다.</p>

      {/* 부문별 1위 픽 집계 */}
      {tops.length > 0 && (
        <div className="mb-6 border border-ink-200">
          <div className="px-4 py-2.5 border-b border-ink-200">
            <h2 className="text-[12px] font-bold text-ink">우승 후보 (1위로 뽑힌 횟수)</h2>
          </div>
          <div className="p-4 flex flex-wrap gap-x-6 gap-y-3">
            {divisions.map((d) => {
              const rows = tops.filter((t) => t.division_id === d.id).slice(0, 5);
              if (!rows.length) return null;
              return (
                <div key={d.id} className="min-w-[190px]">
                  <p className="text-[11px] font-bold text-ink-600 mb-1.5">{d.label}</p>
                  {rows.map((t, i) => (
                    <div key={t.player_name + i} className="flex items-baseline gap-2 py-0.5 text-[13px]">
                      <span className="text-ink">{t.player_name}</span>
                      <span className="text-ink-400 text-[10px]">{t.team_name}</span>
                      <span className="flex-1" />
                      <span className="tabular-nums font-semibold text-ink">{t.n}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 부문 필터 */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setDiv('all')}
          className={`px-3 py-1.5 text-[12px] font-medium border ${divFilter === 'all' ? 'bg-ink text-white border-ink' : 'bg-paper text-ink-600 border-ink-200'}`}
        >
          전체 {picks.length}
        </button>
        {divisions.map((d) => (
          <button
            key={d.id}
            onClick={() => setDiv(String(d.id))}
            className={`px-3 py-1.5 text-[12px] font-medium border ${String(divFilter) === String(d.id) ? 'bg-ink text-white border-ink' : 'bg-paper text-ink-600 border-ink-200'}`}
          >
            {d.label} {picks.filter((p) => p.division_id === d.id).length}
          </button>
        ))}
      </div>

      <div className="border border-ink-200 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-ink-200 text-left text-[11px] tracking-wider text-ink-400">
              <th className="px-4 py-3 font-medium">회원</th>
              <th className="px-4 py-3 font-medium">부문</th>
              <th className="px-4 py-3 font-medium">1위</th>
              <th className="px-4 py-3 font-medium">2위</th>
              <th className="px-4 py-3 font-medium">3위 A</th>
              <th className="px-4 py-3 font-medium">3위 B</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">점수</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-200/20">
                <td className="px-4 py-3">
                  <span className="font-semibold text-ink">{p.nickname}</span>
                  {p.home_dojo && <span className="ml-1.5 text-[10px] text-ink-400">{p.home_dojo}</span>}
                </td>
                <td className="px-4 py-3 text-ink-600">{p.division_label}</td>
                <td className="px-4 py-3">{cell(p.pick1, p.pick1_team)}</td>
                <td className="px-4 py-3">{cell(p.pick2, p.pick2_team)}</td>
                <td className="px-4 py-3">{cell(p.pick3a, p.pick3a_team)}</td>
                <td className="px-4 py-3">{cell(p.pick3b, p.pick3b_team)}</td>
                <td className="px-4 py-3 text-[11px] text-ink-400">{p.is_locked ? '확정' : '저장됨'}</td>
                <td className="px-4 py-3 tabular-nums text-ink-600">{p.score}</td>
              </tr>
            ))}
            {!shown.length && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-400 text-sm">입력된 픽이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
