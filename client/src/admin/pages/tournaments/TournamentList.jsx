import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Trophy, Star, Users, Lock, Unlock } from 'lucide-react';
import { adminGet, adminPost, adminDelete } from '../../adminApi.js';

const STATUS_TABS = ['전체', '예정', '진행', '종료'];
const STATUS_BADGE = {
  예정: 'border border-ink-200 text-ink-600',
  진행: 'bg-lime text-ink',
  종료: 'border border-ink-200 text-ink-400',
};

/* 픽 가능 여부는 pick_deadline 하나로 결정된다 (서버 picks.js와 같은 판정).
   값이 없으면 '마감 미정'이라 계속 픽할 수 있는 상태다. */
const isPickClosed = (t) =>
  !!t.pick_deadline && Date.now() > new Date(t.pick_deadline).getTime();

const fmtDeadline = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function TournamentList() {
  const navigate = useNavigate();
  const [list,    setList]    = useState([]);
  const [tab,     setTab]     = useState('전체');
  const [loading, setLoading] = useState(true);
  const [busyId,  setBusyId]  = useState(null);   // 픽 마감/재개 요청 중인 대회

  useEffect(() => {
    adminGet('/tournaments')
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === '전체' ? list : list.filter((t) => t.status === tab);

  const handleDelete = async (t) => {
    if (!window.confirm(`"${t.name}" 대회를 삭제합니다.\n매치·예측 데이터도 모두 삭제됩니다.`)) return;
    const res = await adminDelete(`/tournaments/${t.id}`);
    if (res.ok) setList((prev) => prev.filter((x) => x.id !== t.id));
    else alert('삭제 실패');
  };

  // 픽 마감: 회원들이 지금부터 픽을 못 넣게 한다. 이미 낸 픽은 그대로 남는다.
  const handleTogglePicks = async (t) => {
    const closed = isPickClosed(t);
    const msg = closed
      ? `"${t.name}" 픽 마감을 해제합니다.\n회원들이 다시 픽을 넣거나 바꿀 수 있게 됩니다.\n\n※ 원래 잡아둔 마감 시각은 복원되지 않고 '마감 미정'이 됩니다.`
      : `"${t.name}" 픽을 지금 즉시 마감합니다.\n회원들이 더 이상 픽을 넣거나 바꿀 수 없습니다.\n\n이미 제출된 픽은 그대로 유지됩니다.`;
    if (!window.confirm(msg)) return;

    setBusyId(t.id);
    try {
      const res = await adminPost(`/tournaments/${t.id}/${closed ? 'reopen' : 'close'}-picks`);
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        alert(error ?? (closed ? '마감 해제 실패' : '픽 마감 실패'));
        return;
      }
      const updated = await res.json();
      setList((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...updated } : x)));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">TOURNAMENTS</p>
          <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">대회 관리</h1>
          <p className="text-ink-400 text-sm mt-1">총 {list.length}개</p>
        </div>
        <button
          onClick={() => navigate('/admin/tournaments/new')}
          className="flex items-center gap-2 bg-ink text-white px-4 py-2.5
                     rounded-full text-sm font-medium hover:bg-ink/90 transition-colors"
        >
          <Plus size={16} />
          새 대회 등록
        </button>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-1 mb-4">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === s
                ? 'bg-ink text-white'
                : 'border border-ink-200 text-ink-600 hover:border-ink'
            }`}
          >
            {s}
            {s !== '전체' && (
              <span className="ml-1.5 text-xs opacity-70">
                {list.filter((x) => x.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="border border-ink-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-ink-400 text-sm">로딩 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #111111' }}>
                {['ID','대회명','시작일','종료일','종목','상태','픽','매치 수',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-ink-400 uppercase tracking-[0.15em] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-200/20">
                  <td className="px-4 py-3 text-ink-400 text-xs tabular-nums">{t.id}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{t.name}</td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{t.start_date ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{t.end_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-ink-200 text-ink-600">
                      {t.tournament_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[t.status] ?? 'border border-ink-200 text-ink-600'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isPickClosed(t) ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-ink-200 text-ink-400">
                        마감
                      </span>
                    ) : t.pick_deadline ? (
                      <span className="text-xs text-ink-600 tabular-nums" title={`마감 예정: ${fmtDeadline(t.pick_deadline)}`}>
                        {fmtDeadline(t.pick_deadline)}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-400">마감 미정</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{t.match_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* 실제 대진표(bracket_matches) 결과 입력.
                          옛 matches 테이블용 화면은 /matches 경로에 그대로 남아 있다. */}
                      <button
                        onClick={() => navigate(`/admin/tournaments/${t.id}/bracket`)}
                        className="flex items-center gap-1 text-xs text-ink border border-ink-200
                                   hover:border-ink px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        <Trophy size={12} />
                        대진표
                      </button>
                      <button
                        onClick={() => navigate(`/admin/tournaments/${t.id}/user-picks`)}
                        className="flex items-center gap-1 text-xs text-ink border border-ink-200
                                   hover:border-ink px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        <Users size={12} />
                        회원 픽
                      </button>
                      <button
                        onClick={() => handleTogglePicks(t)}
                        disabled={busyId === t.id}
                        title={
                          isPickClosed(t)
                            ? `마감됨: ${fmtDeadline(t.pick_deadline)} — 누르면 다시 픽 가능`
                            : '지금 즉시 픽을 마감합니다'
                        }
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full
                                    transition-colors disabled:opacity-40 ${
                          isPickClosed(t)
                            ? 'text-ink-400 border border-ink-200 hover:border-ink hover:text-ink'
                            : 'text-ink border border-ink-200 hover:border-ink'
                        }`}
                      >
                        {isPickClosed(t) ? <Unlock size={12} /> : <Lock size={12} />}
                        {busyId === t.id ? '처리 중' : isPickClosed(t) ? '픽 재개' : '픽 마감'}
                      </button>
                      <button
                        onClick={() => navigate(`/admin/tournaments/${t.id}/picks`)}
                        className="flex items-center gap-1 text-xs text-ink border border-ink-200
                                   hover:border-ink px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        <Star size={12} />
                        픽 결과
                      </button>
                      <button
                        onClick={() => navigate(`/admin/tournaments/${t.id}/edit`)}
                        className="flex items-center gap-1 text-xs text-ink border border-ink-200
                                   hover:border-ink px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        <Pencil size={12} />
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="flex items-center gap-1 text-xs text-red-600 border border-red-200
                                   hover:bg-red-50 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        <Trash2 size={12} />
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-ink-400 text-sm">
                    {tab === '전체' ? '등록된 대회가 없습니다.' : `${tab} 상태의 대회가 없습니다.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
