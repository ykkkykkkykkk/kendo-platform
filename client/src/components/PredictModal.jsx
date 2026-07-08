import { useState } from 'react';
import { authPost } from '../api.js';

export default function PredictModal({ match, onClose, onSuccess }) {
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
      const res = await authPost('/predictions', {
        matchId:                 match.id,
        predictedWinnerPlayerId: selected,
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
        <div className="w-10 h-1 bg-ink-200 rounded-full mx-auto mb-5" />
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-1">PREDICT</p>
        <h2 className="text-ink font-bold text-base mb-1 tracking-tight">경기 예측</h2>
        <p className="text-ink-400 text-xs mb-5">승리할 선수를 선택하세요</p>

        <div className="flex gap-3 mb-5">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              className={`flex-1 py-4 border font-bold text-sm transition-all
                ${selected === o.id
                  ? 'border-ink bg-ink text-white'
                  : 'border-ink-200 text-ink bg-paper'}`}
            >
              {o.name}
            </button>
          ))}
        </div>

        {error && <p className="text-ink text-xs text-center mb-3 font-semibold">{error}</p>}

        <button
          onClick={submit}
          disabled={!selected || loading}
          className="w-full bg-lime hover:bg-lime-dark text-ink font-medium py-3.5 rounded-full text-sm
                     disabled:opacity-40 pressable"
        >
          {loading ? '제출 중...' : '예측 완료'}
        </button>
      </div>
    </div>
  );
}
