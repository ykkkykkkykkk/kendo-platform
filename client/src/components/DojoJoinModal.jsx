import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';

/**
 * 도장이 없는 로그인 회원이 바로 도장에 가입하는 모달.
 *
 * DojoChangeModal은 '이미 소속이 있는' 사람이 옮길 때 쓰는 승인 요청(1~2일)이라
 * 처음 등록하는 경우에는 맞지 않는다. 여기서는 POST /dojos/join으로 즉시 반영한다.
 * 검색에 없는 이름을 넣으면 서버가 도장을 새로 만든다.
 */
export default function DojoJoinModal({ onClose, onSuccess }) {
  const { showToast } = useToast();
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected,    setSelected]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (query.trim().length < 1) { setSuggestions([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const res = await api.dojoSearch(query.trim());
      setSuggestions(Array.isArray(res) ? res : []);
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  const submit = async () => {
    const name = (selected || query).trim();
    if (!name || loading) return;
    haptic();
    setLoading(true);
    try {
      const res  = await api.joinDojo(name);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`${data.dojo?.name ?? name} 가입 완료!`, 'success');
      onSuccess?.(data.dojo);
      onClose();
    } catch (e) {
      showToast(e.message || '가입 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <motion.div
        className="relative w-full max-w-mobile bg-paper rounded-t-2xl px-6 pt-5 pb-10"
        style={{ borderTop: '1.5px solid #111111' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="도장 등록"
      >
        <div className="flex items-start">
          <div className="flex-1">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">MY DOJO</p>
            <h2 className="text-xl font-bold text-ink tracking-[-0.02em] mt-1">우리 도장 등록</h2>
          </div>
          <button onClick={onClose} aria-label="닫기" className="text-ink-400 pressable mt-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 border border-ink-200 px-3 py-2.5 mt-4 rounded-xl">
          <Search size={15} className="text-ink-400 flex-none" />
          <input
            autoFocus
            type="text"
            maxLength={30}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="도장 검색 또는 직접 입력"
            className="flex-1 text-sm text-ink outline-none bg-transparent placeholder:text-ink-400/60"
          />
        </div>

        {suggestions.length > 0 && (
          <div className="mt-2 border border-ink-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
            {suggestions.map((d) => (
              <button
                key={d.id}
                onClick={() => { setSelected(d.name); setQuery(d.name); setSuggestions([]); }}
                className="w-full text-left px-3 py-2.5 border-b border-ink-200 last:border-0
                           hover:bg-ink-200/20 flex items-center gap-2"
              >
                <span className="text-sm text-ink flex-1">{d.name}</span>
                <span className="text-[11px] text-ink-400 tabular-nums">{d.member_count ?? 0}명</span>
              </button>
            ))}
          </div>
        )}

        {query.trim() && !suggestions.length && !selected && (
          <p className="text-ink-400 text-[11px] mt-2">
            검색 결과가 없으면 <span className="text-ink font-medium">{query.trim()}</span> 도장을 새로 만듭니다.
          </p>
        )}

        <button
          onClick={submit}
          disabled={!query.trim() || loading}
          className="w-full bg-lime hover:bg-lime-dark disabled:opacity-40 text-ink font-bold
                     text-[14px] py-3.5 rounded-full mt-4 pressable"
        >
          {loading ? '등록 중…' : '등록하기'}
        </button>
      </motion.div>
    </motion.div>
  );
}
