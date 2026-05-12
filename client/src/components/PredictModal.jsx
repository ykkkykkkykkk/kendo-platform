import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function PredictModal({ match, onClose, onSuccess }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const options = [
    { id: match.player_a_id, name: match.player_a_name },
    { id: match.player_b_id, name: match.player_b_name },
  ].filter((o) => o.id && o.name);

  const submit = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/predictions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId:                   user.id,
          matchId:                  match.id,
          predictedWinnerPlayerId:  selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess(data);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-mobile bg-white rounded-t-2xl px-6 pt-4 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-navy font-black text-base mb-1">경기 예측</h2>
        <p className="text-sub text-xs mb-5">승리할 선수를 선택하세요</p>

        <div className="flex gap-3 mb-5">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              className={`flex-1 py-4 rounded-xl border-2 font-bold text-sm transition-all
                ${selected === o.id
                  ? 'border-navy bg-navy text-white'
                  : 'border-gray-200 text-navy bg-card'}`}
            >
              {o.name}
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 text-xs text-center mb-3">{error}</p>}

        <button
          onClick={submit}
          disabled={!selected || loading}
          className="w-full bg-navy text-white font-bold py-3.5 rounded-xl text-sm
                     disabled:opacity-40 active:opacity-80"
        >
          {loading ? '제출 중...' : '예측 완료'}
        </button>
      </div>
    </div>
  );
}
