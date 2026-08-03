import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Check } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

/**
 * "저 선수입니다" 신청.
 *
 * 선수 200명이 이미 DB에 있으므로 본인이 명단에서 고르기만 하면 된다.
 * 승인은 관리자가 하므로 아무나 선수가 되지 않는다.
 * 팬으로 쓰던 계정도 그대로 전환되어 팔로우·픽이 유지된다.
 */
export default function PlayerClaimModal({ onClose, onDone }) {
  const { showToast } = useToast();
  const [players, setPlayers] = useState([]);
  const [q, setQ]         = useState('');
  const [picked, setPick] = useState(null);
  const [note, setNote]   = useState('');
  const [busy, setBusy]   = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    api.players()
      .then((r) => setPlayers(Array.isArray(r) ? r : (r?.players ?? [])))
      .catch(() => setPlayers([]));
  }, []);

  const term = q.trim().replace(/\s/g, '');
  const found = term
    ? players.filter((p) =>
        p.name?.replace(/\s/g, '').includes(term) ||
        p.team_name?.replace(/\s/g, '').includes(term)).slice(0, 30)
    : [];

  const submit = async () => {
    if (!picked) { showToast('본인 이름을 골라주세요.', 'error'); return; }
    setBusy(true);
    try {
      const res  = await api.claimPlayer({ player_id: picked.id, note: note.trim() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '신청에 실패했습니다.');
      showToast('신청 완료! 확인 후 알려드릴게요.', 'success');
      onDone?.();
      onClose();
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 z-[85] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-mobile bg-paper rounded-t-2xl px-6 pt-5 pb-10 max-h-[86vh] overflow-y-auto"
        style={{ borderTop: '1.5px solid #111111' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="선수 신청"
      >
        <div className="flex items-start">
          <div className="flex-1">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">PLAYER</p>
            <h2 className="text-xl font-bold text-ink tracking-[-0.02em] mt-1">저 선수입니다</h2>
            <p className="text-ink-400 text-[12px] mt-1.5 leading-[1.55]">
              명단에서 본인을 골라주세요. 확인 후 선수 계정으로 바꿔드립니다.
            </p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="text-ink-400 pressable mt-1">
            <X size={18} />
          </button>
        </div>

        {picked ? (
          <div className="mt-4 border border-ink px-4 py-3 rounded-xl flex items-center gap-2">
            <Check size={15} className="text-ink flex-none" />
            <div className="min-w-0 flex-1">
              <p className="text-ink font-bold text-sm truncate">{picked.name}</p>
              <p className="text-ink-400 text-[11px]">
                {picked.team_name ?? '팀 없음'}{picked.dan_grade ? ` · ${picked.dan_grade}단` : ''}
              </p>
            </div>
            <button onClick={() => { setPick(null); setQ(''); }} className="text-ink-400 text-xs underline">
              다시 고르기
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border border-ink-200 px-3 py-2.5 mt-4 rounded-xl">
              <Search size={15} className="text-ink-400 flex-none" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="본인 이름 또는 소속팀"
                className="flex-1 text-sm text-ink outline-none bg-transparent placeholder:text-ink-400/60"
              />
            </div>

            <div ref={listRef} className="mt-2 max-h-52 overflow-y-auto">
              {found.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPick(p)}
                  className="w-full text-left px-3 py-2.5 border-b border-ink-200 last:border-0
                             hover:bg-ink-200/20 flex items-center gap-2"
                >
                  <span className="text-sm text-ink font-medium">{p.name}</span>
                  <span className="text-[11px] text-ink-400">
                    {p.team_name ?? '팀 없음'}{p.dan_grade ? ` · ${p.dan_grade}단` : ''}
                  </span>
                </button>
              ))}
              {term && !found.length && (
                <p className="text-ink-400 text-[12px] py-3">
                  찾는 이름이 없나요? 명단에 아직 없는 선수일 수 있습니다. 운영자에게 문의해주세요.
                </p>
              )}
            </div>
          </>
        )}

        <label className="text-xs font-medium text-ink-600 mt-4 mb-1 block">
          본인 확인에 도움이 될 내용 <span className="text-ink-400/60">(선택)</span>
        </label>
        <textarea
          rows={2}
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 8월 대회 5단부 출전, 인스타 @아이디"
          className="w-full border border-ink-200 px-3 py-2.5 rounded-xl text-sm text-ink
                     outline-none focus:border-ink placeholder:text-ink-400/60 resize-none"
        />

        <button
          onClick={submit}
          disabled={!picked || busy}
          className="w-full mt-4 bg-lime hover:bg-lime-dark disabled:opacity-40 text-ink font-bold
                     text-[14px] py-3.5 rounded-full pressable"
        >
          {busy ? '신청 중…' : '신청하기'}
        </button>
        <p className="text-ink-400 text-[11px] text-center mt-2.5 leading-[1.5]">
          승인되면 팬에게 소식을 올리고 질문에 답할 수 있어요.<br />
          지금까지 하신 팔로우·픽은 그대로 남습니다.
        </p>
      </motion.div>
    </motion.div>
  );
}
