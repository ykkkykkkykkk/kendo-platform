/* 죽도 신청 폼.
 *
 * 실제로 물건이 가는 신청이라 되돌리기 어렵다. 그래서 보내기 전에 한 번 더 보여주고,
 * 배송지는 짧게 쓰면 받지 않는다(동/호수가 빠지면 반송된다).
 */
import { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { authGet, authPost } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

const LIME = '#D8FF3E';
const FALLBACK_SIZES = ['소도(3.6척)', '3.7척', '3.8척', '3.9척'];

export default function ShinaiRequestModal({ open, onClose, onDone }) {
  const { showToast } = useToast();
  const [sizes, setSizes] = useState(FALLBACK_SIZES);
  const [form, setForm]   = useState({ name: '', phone: '', address: '', size: '' });
  const [busy, setBusy]   = useState(false);

  useEffect(() => {
    if (!open) return;
    authGet('/shinai/my')
      .then((d) => { if (Array.isArray(d?.sizes) && d.sizes.length) setSizes(d.sizes); })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = 'w-full border border-ink-200 px-3.5 py-3 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors';

  const submit = async () => {
    if (!form.name.trim())    return showToast('이름을 입력해주세요.', 'error');
    if (form.phone.replace(/\D/g, '').length < 10) return showToast('연락처를 정확히 입력해주세요.', 'error');
    if (form.address.trim().length < 10) return showToast('배송지를 동·호수까지 입력해주세요.', 'error');
    if (!form.size)           return showToast('죽도 규격을 선택해주세요.', 'error');

    setBusy(true);
    try {
      const res = await authPost('/shinai/request', form);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error ?? '신청에 실패했습니다.');
      showToast('죽도를 신청했어요. 승인 후 배송됩니다.', 'success');
      onDone?.();
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 px-0 sm:px-5"
         onClick={onClose}>
      <div
        className="bg-paper w-full sm:rounded-none overflow-y-auto"
        style={{ maxWidth: 480, maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-paper">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">SHINAI</p>
            <h2 className="text-lg font-bold text-ink tracking-[-0.02em]">죽도 신청</h2>
          </div>
          <button onClick={onClose} className="text-ink-400 pressable" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-2.5">
          <p className="text-[12px] text-ink-400 leading-relaxed pb-1">
            받으실 분의 정보를 정확히 적어주세요. 관리자 확인 후 발송되며,
            같은 연락처·배송지는 6개월에 한 번만 신청할 수 있습니다.
          </p>

          <input className={input} value={form.name} onChange={set('name')}
                 placeholder="받는 분 이름" maxLength={30} />
          <input className={input} value={form.phone} onChange={set('phone')}
                 placeholder="연락처 (010-0000-0000)" inputMode="tel" maxLength={20} />
          <textarea className={`${input} resize-none`} rows={3} value={form.address}
                    onChange={set('address')} placeholder="배송지 (동·호수까지)" maxLength={200} />

          <div>
            <p className="text-[11px] text-ink-400 mb-1.5">죽도 규격</p>
            <div className="grid grid-cols-2 gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, size: s }))}
                  className={`py-2.5 text-[13px] font-medium border transition-colors pressable ${
                    form.size === s ? 'border-ink text-ink' : 'border-ink-200 text-ink-600'
                  }`}
                  style={form.size === s ? { background: LIME } : undefined}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={busy}
            className="w-full py-3.5 mt-1 rounded-full text-sm font-bold pressable disabled:opacity-50
                       flex items-center justify-center gap-1.5"
            style={{ background: LIME, color: '#111' }}
          >
            {busy && <Loader size={14} className="animate-spin" />}
            {busy ? '보내는 중…' : '신청하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
