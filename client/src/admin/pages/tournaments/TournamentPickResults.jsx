import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, CheckCircle, Loader, Star } from 'lucide-react';
import { adminGet, adminPost } from '../../adminApi.js';

const DIVISION_LABELS = {
  male_individual:   '남자 개인전',
  male_team:         '남자 단체전',
  female_individual: '여자 개인전',
  female_team:       '여자 단체전',
};

const RANKS = [
  { key: 'rank_1st',   label: '🥇 1위' },
  { key: 'rank_2nd',   label: '🥈 2위' },
  { key: 'rank_3rd_a', label: '🥉 3위 A' },
  { key: 'rank_3rd_b', label: '🥉 3위 B' },
];

function DivisionCard({ div, onResultSaved, onFinalized }) {
  const isTeam       = div.division_type.includes('team');
  const participants = div.participants ?? [];
  const isFinalized  = !!div.is_finalized;

  const [form, setForm] = useState({
    rank_1st:   div.rank_1st   ? String(div.rank_1st)   : '',
    rank_2nd:   div.rank_2nd   ? String(div.rank_2nd)   : '',
    rank_3rd_a: div.rank_3rd_a ? String(div.rank_3rd_a) : '',
    rank_3rd_b: div.rank_3rd_b ? String(div.rank_3rd_b) : '',
  });
  const [saving,     setSaving]     = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const pLabel = (p) =>
    isTeam ? (p.team_name ?? '—') : `${p.player_name ?? '?'} (${p.team_name ?? '—'})`;

  const hasResult = !!(div.rank_1st || form.rank_1st);

  const handleSave = async () => {
    const { rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b } = form;
    if (!rank_1st || !rank_2nd || !rank_3rd_a || !rank_3rd_b) {
      setError('4개 순위를 모두 선택해주세요.'); return;
    }
    const vals = [rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b];
    if (new Set(vals).size !== 4) { setError('중복된 선수/팀이 있습니다.'); return; }

    setSaving(true); setError(''); setSuccess('');
    const res  = await adminPost(`/divisions/${div.id}/result`, {
      rank_1st:   Number(rank_1st),
      rank_2nd:   Number(rank_2nd),
      rank_3rd_a: Number(rank_3rd_a),
      rank_3rd_b: Number(rank_3rd_b),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess(`점수 계산 완료 — 픽 ${data.picks_updated}개 업데이트됨`);
      onResultSaved(div.id, form);
    } else {
      setError(data.error ?? '저장 실패');
    }
    setSaving(false);
  };

  const handleFinalize = async () => {
    if (!window.confirm('이 부문 결과를 확정합니다.\n확정 후에는 수정할 수 없습니다.')) return;
    setFinalizing(true); setError('');
    const res  = await adminPost(`/divisions/${div.id}/result/finalize`, {});
    const data = await res.json();
    if (res.ok) {
      onFinalized(div.id);
    } else {
      setError(data.error ?? '확정 실패');
    }
    setFinalizing(false);
  };

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${
      isFinalized ? 'border-emerald-300' : 'border-gray-200'
    }`}>
      {/* 헤더 */}
      <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
        isFinalized ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <h3 className="font-bold text-gray-900">
          {DIVISION_LABELS[div.division_type] ?? div.division_type}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">참가 {participants.length}명</span>
          {isFinalized && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700
                             bg-emerald-100 px-2 py-0.5 rounded-full">
              <CheckCircle size={11} /> 확정완료
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {participants.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">등록된 참가자가 없습니다.</p>
        ) : (
          <>
            <div className="space-y-2.5">
              {RANKS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-500 w-20 flex-shrink-0">
                    {label}
                  </span>
                  <select
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    disabled={isFinalized}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:border-indigo-400
                               disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">— 선택 —</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>{pLabel(p)}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {error   && <p className="text-red-500 text-xs mt-3">{error}</p>}
            {success && <p className="text-emerald-600 text-xs font-medium mt-3">✅ {success}</p>}

            {!isFinalized && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2
                             rounded-xl text-sm font-semibold hover:bg-indigo-700
                             disabled:opacity-50 transition-colors"
                >
                  {saving
                    ? <Loader size={14} className="animate-spin" />
                    : <Trophy size={14} />}
                  {saving ? '계산 중...' : '점수 계산'}
                </button>

                {hasResult && (
                  <button
                    onClick={handleFinalize}
                    disabled={finalizing}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2
                               rounded-xl text-sm font-semibold hover:bg-emerald-700
                               disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle size={14} />
                    {finalizing ? '처리 중...' : '결과 확정'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function TournamentPickResults() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [divisions,  setDivisions]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [winners,    setWinners]    = useState(null);

  useEffect(() => {
    Promise.all([
      adminGet(`/tournaments/${id}`),
      adminGet(`/tournaments/${id}/divisions`),
    ]).then(([t, divs]) => {
      setTournament(t);
      setDivisions(Array.isArray(divs) ? divs : []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleResultSaved = (divId, form) => {
    setDivisions((prev) => prev.map((d) =>
      d.id === divId
        ? { ...d, rank_1st: Number(form.rank_1st), rank_2nd: Number(form.rank_2nd),
                  rank_3rd_a: Number(form.rank_3rd_a), rank_3rd_b: Number(form.rank_3rd_b) }
        : d
    ));
  };

  const handleFinalized = (divId) => {
    setDivisions((prev) => prev.map((d) =>
      d.id === divId ? { ...d, is_finalized: 1 } : d
    ));
  };

  const allFinalized = divisions.length > 0 && divisions.every((d) => d.is_finalized);

  const handleFinalizeTournament = async () => {
    if (!window.confirm('모든 부문이 확정됐습니다.\n대회를 종료하고 수상자를 결정합니다.')) return;
    setFinalizing(true);
    const res  = await adminPost(`/tournaments/${id}/finalize`, {});
    const data = await res.json();
    if (res.ok) {
      setWinners(data.winners ?? []);
    } else {
      alert(data.error ?? '종료 처리 실패');
    }
    setFinalizing(false);
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">로딩 중...</div>;
  if (!tournament) return <div className="p-8 text-red-400 text-sm">대회를 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* 상단 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/tournaments')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"
        >
          <ChevronLeft size={16} />목록
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 text-lg">{tournament.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            픽 결과 입력 · {divisions.length}개 부문
          </p>
        </div>
      </div>

      {/* 수상자 결과 */}
      {winners && (
        <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
          <h2 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
            <Star size={16} /> 대회 종료 — 수상자
          </h2>
          {winners.length === 0 ? (
            <p className="text-amber-700 text-sm">참여자가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {winners.map((w) => (
                <div key={w.rank} className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-amber-700 w-12">
                    {w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'} {w.rank}등
                  </span>
                  <span className="font-semibold text-gray-900">{w.nickname}</span>
                  <span className="text-gray-500">{w.total_score.toLocaleString()}점</span>
                  <span className="ml-auto text-amber-700 font-medium">{w.prize}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 부문 카드 목록 */}
      {divisions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-gray-600">등록된 부문이 없습니다.</p>
          <p className="text-sm mt-1">픽 대회를 시작하려면 부문을 먼저 등록해야 합니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {divisions.map((div) => (
            <DivisionCard
              key={div.id}
              div={div}
              onResultSaved={handleResultSaved}
              onFinalized={handleFinalized}
            />
          ))}

          {/* 대회 종료 버튼 */}
          {allFinalized && !winners && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleFinalizeTournament}
                disabled={finalizing}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white
                           py-3.5 rounded-2xl text-sm font-bold hover:bg-amber-600
                           disabled:opacity-50 transition-colors shadow-md"
              >
                {finalizing
                  ? <Loader size={16} className="animate-spin" />
                  : <Trophy size={16} />}
                {finalizing ? '처리 중...' : '대회 종료 + 수상자 발표'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
