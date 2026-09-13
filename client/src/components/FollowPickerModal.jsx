import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Check, X, Plus } from 'lucide-react';
import { api } from '../api.js';
import { haptic } from '../utils/haptic.js';

/**
 * 응원할 선수 고르기.
 *
 * 가입할 때 3명을 고르게 하는 화면과 같은 명단을 쓴다. 홈에서 '더 찾기'를 눌렀을 때
 * 검색 화면으로 보내면 이름을 알아야 찾을 수 있는데, 팬 입장에서는 누가 있는지부터
 * 모르는 경우가 많다. 그래서 가입 때처럼 명단을 그대로 펼쳐 보여준다.
 *
 * 가입 때와 다른 점은 두 가지다.
 *  - 몇 명을 고르든 상관없다(가입은 3명을 채워야 넘어간다)
 *  - 누르는 즉시 등록된다. 이미 응원 중인 선수는 눌러서 해제할 수 있다.
 */
export default function FollowPickerModal({ open, onClose, followedIds = [] }) {
  const [roster,  setRoster]  = useState(null);
  const [query,   setQuery]   = useState('');
  const [mine,    setMine]    = useState(() => new Set(followedIds));
  const [busyId,  setBusyId]  = useState(null);
  const [error,   setError]   = useState(null);

  useEffect(() => { if (open) setMine(new Set(followedIds)); }, [open, followedIds.join(',')]);

  useEffect(() => {
    if (!open || roster) return;
    api.playersActive()
      .then((r) => setRoster(Array.isArray(r) ? r : (r?.players ?? [])))
      .catch(() => setError('선수 명단을 불러오지 못했습니다.'));
  }, [open, roster]);

  /* 검색어가 없으면 서버가 준 순서를 그대로 쓴다 — 선수 계정으로 최근 접속한 순이다.
     팬 많은 순으로 깔면 이미 팬이 많은 선수만 계속 쌓인다. */
  const candidates = useMemo(() => {
    const term = query.trim().replace(/\s/g, '');
    return (roster ?? [])
      .filter((p) => !term
        || p.name?.replace(/\s/g, '').includes(term)
        || p.team_name?.replace(/\s/g, '').includes(term))
      .slice(0, 60);
  }, [roster, query]);

  const toggle = async (p) => {
    if (busyId) return;
    haptic();
    setBusyId(p.id);
    const on = mine.has(p.id);
    // 눌렀을 때 바로 반응하고, 실패하면 되돌린다
    setMine((prev) => {
      const next = new Set(prev);
      if (on) next.delete(p.id); else next.add(p.id);
      return next;
    });
    try {
      if (on) await api.unfollow(p.id);
      else    await api.follow(p.id);
    } catch {
      setMine((prev) => {
        const next = new Set(prev);
        if (on) next.add(p.id); else next.delete(p.id);
        return next;
      });
      setError('잠시 후 다시 시도해주세요.');
    } finally {
      setBusyId(null);
    }
  };

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <motion.div
        className="relative w-full bg-paper rounded-t-2xl p-5 pb-8"
        style={{ maxWidth: 600, maxHeight: '85vh' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-ink font-bold text-lg">응원할 선수 찾기</h3>
            <p className="text-ink-400 text-sm mt-0.5">
              누르면 바로 응원 목록에 담겨요
            </p>
          </div>
          <button onClick={onClose} className="text-ink-400 p-1 pressable" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 border border-ink-200 px-3 py-2.5 rounded-xl mt-3 bg-white">
          <Search size={15} className="text-ink-400 flex-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="선수 이름 또는 소속팀"
            className="flex-1 text-sm text-ink outline-none bg-transparent placeholder:text-ink-400/60"
          />
        </div>

        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

        <div className="border border-ink-200 rounded-xl bg-white mt-3 overflow-y-auto"
             style={{ maxHeight: '52vh' }}>
          {!roster && !error && (
            <p className="text-ink-400 text-[12px] px-4 py-3">명단 불러오는 중…</p>
          )}
          {candidates.map((p) => {
            const on = mine.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p)}
                disabled={busyId === p.id}
                className={`w-full text-left px-4 py-3 border-b border-ink-200 last:border-0
                            flex items-center gap-2 disabled:opacity-60 ${
                  on ? 'bg-lime' : 'hover:bg-ink-200/20'
                }`}
              >
                <span className="w-5 flex-none flex items-center justify-center">
                  {on ? <Check size={15} className="text-ink" />
                      : <Plus size={15} className="text-ink-400" />}
                </span>
                <span className="text-sm text-ink font-medium flex-none">{p.name}</span>
                <span className="text-[11px] text-ink-400 truncate">{p.team_name}</span>
                {p.fan_count > 0 && (
                  <span className="ml-auto text-[11px] text-ink-400 tabular-nums flex-none">
                    팬 {p.fan_count}
                  </span>
                )}
              </button>
            );
          })}
          {roster && !candidates.length && (
            <p className="text-ink-400 text-[12px] px-4 py-3">찾는 선수가 없습니다.</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-3 rounded-full bg-ink text-white text-sm font-bold pressable"
        >
          {mine.size > 0 ? `${mine.size}명 응원 중 · 완료` : '완료'}
        </button>
      </motion.div>
    </motion.div>
  );
}
