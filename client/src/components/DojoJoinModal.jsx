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
 *
 * 목록에서 고르는 것이 기본이다. 예전에는 입력한 이름을 그대로 새 도장으로 만들어서
 * '강인/강인검도관', '호검관/호검규ㅏㄴ'처럼 같은 도장이 계속 쪼개졌다.
 * 이름이 비슷한 도장이 이미 있으면 서버가 409로 되묻고, 새로 만들려면 한 번 더 눌러야 한다.
 */
export default function DojoJoinModal({ onClose, onSuccess }) {
  const { showToast } = useToast();
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [picked,      setPicked]      = useState(null);   // 목록에서 고른 도장
  const [similar,     setSimilar]     = useState(null);   // 서버가 되물은 후보
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

  const join = async (body, fallbackName) => {
    haptic();
    setLoading(true);
    try {
      const res  = await api.joinDojo(body);
      const data = await res.json();
      if (res.status === 409 && data.similar?.length) {
        setSimilar(data.similar);       // 비슷한 도장이 있다 — 고르게 한다
        return;
      }
      if (!res.ok) throw new Error(data.error);
      showToast(`${data.dojo?.name ?? fallbackName} 가입 완료!`, 'success');
      onSuccess?.(data.dojo);
      onClose();
    } catch (e) {
      showToast(e.message || '가입 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    if (loading) return;
    if (picked) return join({ dojo_id: picked.id }, picked.name);
    const name = query.trim();
    if (name) return join({ name }, name);
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
            onChange={(e) => { setQuery(e.target.value); setPicked(null); setSimilar(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="도장 이름을 검색하세요"
            className="flex-1 text-sm text-ink outline-none bg-transparent placeholder:text-ink-400/60"
          />
        </div>

        {/* 서버가 '비슷한 도장이 있다'고 되물은 경우 — 여기서 고르게 한다 */}
        {similar ? (
          <div className="mt-3">
            <p className="text-ink text-[13px] font-semibold">이 도장 아닌가요?</p>
            <p className="text-ink-400 text-[11px] mt-0.5 mb-2">
              같은 도장이 여러 개로 나뉘면 관원 수와 랭킹이 흩어집니다.
            </p>
            <div className="border border-ink-200 rounded-xl overflow-hidden">
              {similar.map((d) => (
                <button
                  key={d.id}
                  onClick={() => join({ dojo_id: d.id }, d.name)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2.5 border-b border-ink-200 last:border-0
                             hover:bg-ink-200/20 flex items-center gap-2 disabled:opacity-40"
                >
                  <span className="text-sm text-ink flex-1">{d.name}</span>
                  <span className="text-[11px] text-ink-400 tabular-nums">{d.member_count ?? 0}명</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => join({ name: query.trim(), create_new: true }, query.trim())}
              disabled={loading}
              className="w-full mt-2 text-ink-400 text-xs py-2 underline disabled:opacity-40"
            >
              아니요, "{query.trim()}"은 다른 도장입니다
            </button>
          </div>
        ) : (
          <>
            {suggestions.length > 0 && (
              <div className="mt-2 border border-ink-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                {suggestions.map((d) => {
                  const on = picked?.id === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => { setPicked(d); setQuery(d.name); setSuggestions([]); }}
                      className={`w-full text-left px-3 py-2.5 border-b border-ink-200 last:border-0
                                  flex items-center gap-2 ${on ? 'bg-lime' : 'hover:bg-ink-200/20'}`}
                    >
                      <span className="text-sm text-ink flex-1">{d.name}</span>
                      <span className="text-[11px] text-ink-400 tabular-nums">{d.member_count ?? 0}명</span>
                    </button>
                  );
                })}
              </div>
            )}

            {picked ? (
              <p className="text-ink-400 text-[11px] mt-2">
                <span className="text-ink font-medium">{picked.name}</span>에 등록합니다.
              </p>
            ) : query.trim() && !suggestions.length && (
              <p className="text-ink-400 text-[11px] mt-2">
                목록에 없으면 <span className="text-ink font-medium">{query.trim()}</span> 도장을 새로 만듭니다.
                이미 있는 도장이면 다시 확인해드립니다.
              </p>
            )}

            <button
              onClick={submit}
              disabled={!query.trim() || loading}
              className="w-full bg-lime hover:bg-lime-dark disabled:opacity-40 text-ink font-bold
                         text-[14px] py-3.5 rounded-full mt-4 pressable"
            >
              {loading ? '등록 중…' : picked ? `${picked.name} 등록하기` : '등록하기'}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
