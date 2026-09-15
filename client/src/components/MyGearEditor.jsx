import { useState } from 'react';
import { Plus, Trash2, Pencil, X, Loader } from 'lucide-react';
import { authGet, authPost, authPut, authDelete } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

/**
 * 선수 본인이 자기 장비를 고치는 자리.
 *
 * 지금까지는 관리자에게 부탁해야 바꿀 수 있었다. 장비는 시즌 중에도 바뀌는데
 * 그때마다 연락하게 둘 이유가 없다 — 영상·사진을 본인이 올리는 것과 같다.
 *
 * 팬이 보는 화면(MY GEAR 목록)은 그대로 두고, 본인일 때만 이 편집기가 아래에 붙는다.
 */

const CATEGORIES = ['죽도', '호구', '도복', '하카마', '기타'];
const EMPTY = { category: '죽도', brand: '', model_name: '', price_krw: '', product_url: '' };

export default function MyGearEditor({ gear, onChange }) {
  const { showToast } = useToast();
  const [open,  setOpen]  = useState(false);     // 추가 폼 열림
  const [edit,  setEdit]  = useState(null);      // 고치는 중인 장비 id
  const [form,  setForm]  = useState(EMPTY);
  const [busy,  setBusy]  = useState(false);

  const input = 'w-full border border-ink-200 px-3 py-2.5 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors';
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => { setForm(EMPTY); setOpen(false); setEdit(null); };

  const save = async () => {
    if (!form.model_name.trim()) { showToast('모델명을 입력해주세요.', 'error'); return; }
    setBusy(true);
    try {
      const res = edit
        ? await authPut(`/me/gear/${edit}`, form)
        : await authPost('/me/gear', form);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '저장에 실패했습니다.');
      onChange(data);                           // 서버가 돌려준 최신 목록으로 갈아 끼운다
      showToast(edit ? '장비를 수정했습니다.' : '장비를 등록했습니다.', 'success');
      reset();
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  const remove = async (g) => {
    if (!window.confirm(`'${g.model_name}'을(를) 지울까요?`)) return;
    setBusy(true);
    try {
      const res  = await authDelete(`/me/gear/${g.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '삭제에 실패했습니다.');
      onChange(data);
      showToast('장비를 지웠습니다.', 'info');
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  const startEdit = (g) => {
    setEdit(g.id);
    setForm({
      category:    g.category ?? '죽도',
      brand:       g.brand ?? '',
      model_name:  g.model_name ?? '',
      price_krw:   g.price_krw ?? '',
      product_url: g.product_url ?? '',
    });
    setOpen(true);
  };

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid #E5E5E5' }}>
      {/* 내 장비 목록 — 고치기·지우기 */}
      {gear.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {gear.map((g) => (
            <div key={g.id} className="flex items-center gap-2 text-sm">
              <span className="text-[11px] text-ink-400 w-10 flex-none">{g.category}</span>
              <span className="text-ink truncate flex-1">{g.model_name}</span>
              <button onClick={() => startEdit(g)} disabled={busy}
                      className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-ink pressable"
                      aria-label={`${g.model_name} 수정`}>
                <Pencil size={14} />
              </button>
              <button onClick={() => remove(g)} disabled={busy}
                      className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-red-600 pressable"
                      aria-label={`${g.model_name} 삭제`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!open ? (
        <button
          onClick={() => { setForm(EMPTY); setEdit(null); setOpen(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-ink rounded-full
                     text-ink text-xs font-medium pressable"
        >
          <Plus size={12} /> 내 장비 추가
        </button>
      ) : (
        <div className="border border-ink-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink">{edit ? '장비 수정' : '장비 추가'}</p>
            <button onClick={reset} className="text-ink-400 pressable" aria-label="닫기">
              <X size={15} />
            </button>
          </div>

          <div className="flex gap-2">
            <select value={form.category} onChange={set('category')} className={`${input} w-24 flex-none`}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className={input} value={form.brand} onChange={set('brand')} placeholder="브랜드 (선택)" />
          </div>

          <input className={input} value={form.model_name} onChange={set('model_name')}
                 placeholder="모델명 *" maxLength={60} />

          <div className="flex gap-2">
            <input className={input} value={form.price_krw} onChange={set('price_krw')}
                   inputMode="numeric" placeholder="가격 (선택)" />
            <input className={input} value={form.product_url} onChange={set('product_url')}
                   placeholder="상품 주소 (선택)" />
          </div>

          <button onClick={save} disabled={busy}
                  className="w-full py-2.5 rounded-full bg-lime hover:bg-lime-dark text-ink
                             text-sm font-bold pressable disabled:opacity-50 flex items-center justify-center gap-1.5">
            {busy && <Loader size={13} className="animate-spin" />}
            {busy ? '저장 중…' : edit ? '수정' : '추가'}
          </button>
          <p className="text-[11px] text-ink-400">
            가격과 상품 주소는 비워두셔도 됩니다. 모델명만 있으면 됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
