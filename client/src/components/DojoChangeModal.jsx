import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';

export default function DojoChangeModal({ currentDojo, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [query,       setQuery]      = useState('');
  const [suggestions, setSuggestions]= useState([]);
  const [selected,    setSelected]   = useState('');
  const [reason,      setReason]     = useState('');
  const [loading,     setLoading]    = useState(false);
  const [done,        setDone]       = useState(false);
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

  const handleSubmit = async () => {
    const name = selected || query.trim();
    if (!name) return;
    haptic();
    setLoading(true);
    try {
      const res  = await api.dojoChangeRequest({ new_dojo_name: name, reason });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      showToast('변경 요청 완료. 1-2일 내 처리됩니다.', 'success');
      setTimeout(() => { onSuccess?.(); onClose(); }, 1500);
    } catch (e) {
      showToast(e.message || '요청 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
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
      >
        {/* 핸들 + X */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-10 h-1 bg-ink-200 rounded-full" />
          <button onClick={onClose} className="absolute right-0 w-8 h-8 rounded-full border border-ink-200 flex items-center justify-center text-ink-400 pressable">
            <X size={15} />
          </button>
        </div>

        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-1">DOJO</p>
        <h2 className="text-ink font-bold text-lg mb-1 tracking-tight">도장 변경 요청</h2>
        <p className="text-ink-400 text-xs mb-5">운영자 확인 후 처리됩니다 (1-2일 소요)</p>

        {/* 현재 도장 */}
        {currentDojo && (
          <div className="mb-4 px-3 py-2 border border-ink-200">
            <p className="text-ink-400 text-[10px] uppercase tracking-[0.15em] mb-0.5">현재 도장</p>
            <p className="text-ink text-sm font-semibold">{currentDojo}</p>
          </div>
        )}

        {/* 새 도장 검색 */}
        <div className="mb-3 relative">
          <label className="text-xs font-medium text-ink-400 mb-1 block">새 도장 이름</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="도장 검색 또는 새 이름 입력"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(''); }}
              className="w-full bg-paper border border-ink-200 pl-9 pr-4 py-3 text-sm text-ink
                         placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
            />
          </div>
          <AnimatePresence>
            {suggestions.length > 0 && !selected && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute z-10 top-full left-0 right-0 mt-1 bg-paper border border-ink overflow-hidden shadow-lg"
              >
                {suggestions.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { setSelected(d.name); setQuery(d.name); setSuggestions([]); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-ink-200/30 flex items-center justify-between"
                  >
                    <span>{d.name}</span>
                    <span className="text-ink-400 text-xs">{d.member_count}명</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 사유 */}
        <div className="mb-5">
          <label className="text-xs font-medium text-ink-400 mb-1 block">변경 사유 <span className="text-ink-400/60">(선택)</span></label>
          <input
            type="text"
            placeholder="예: 이사, 도장 이전 등"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-paper border border-ink-200 px-4 py-3 text-sm text-ink
                       placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || done || !(selected || query.trim())}
          className="w-full bg-lime hover:bg-lime-dark text-ink font-medium py-3.5 rounded-full text-sm disabled:opacity-50 pressable"
        >
          {done ? '✓ 요청 완료' : loading ? '전송 중...' : '요청 보내기'}
        </button>
      </motion.div>
    </motion.div>
  );
}
