/* 가입 직후 홈에 뜨는 초대 코드 입력 배너.
 *
 * 초대 코드는 가입 24시간 안에만 넣을 수 있는데, 지금까지는 /bamboo까지 스스로 찾아
 * 들어가 '친구 초대하기'를 열어야 입력칸이 나왔다. 그 사이 24시간이 지나면 받은 코드가
 * 영영 무용지물이 된다. 그래서 넣을 수 있는 사람에게만 홈 첫 화면에서 바로 보여준다.
 *
 * 가입 경로(카카오·닉네임)를 가리지 않는다 — 서버가 '넣을 수 있는 상태'만 알려주고
 * 화면은 그걸 따른다.
 *
 * 코드가 없는 사람에게는 성가신 배너이므로, 닫으면 이 기기에서는 다시 뜨지 않는다.
 */
import { useState } from 'react';
import { X, Gift, Loader } from 'lucide-react';
import { authPost } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useBamboo } from '../context/BambooContext.jsx';

const LIME = '#D8FF3E';
const DISMISS_KEY = 'invite_banner_dismissed';

export default function InviteCodeBanner() {
  const { data, enabled, refresh } = useBamboo();
  const { showToast } = useToast();

  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const inv = data?.invite;
  if (!enabled || !inv?.can_enter || dismissed) return null;

  const close = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* 차단돼도 무시 */ }
  };

  const submit = async () => {
    if (busy || code.length !== 6) return;
    setBusy(true);
    try {
      const res = await authPost('/bamboo/invite', { code });
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error ?? '초대 코드를 확인해주세요.');
      showToast(d.message ?? '초대 코드를 등록했어요.', 'success');
      close();
      refresh();
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-5 mt-4 border border-ink p-4">
      <div className="flex items-start gap-2.5">
        <Gift size={15} className="text-ink flex-none mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-ink font-bold text-sm">초대 코드를 받으셨나요?</p>
          <p className="text-[11px] text-ink-400 mt-0.5 leading-relaxed">
            지금 넣으면 초대해주신 분께 물이 갑니다.
            {inv.hours_left > 0 && <> 입력은 <b className="text-ink">{inv.hours_left}시간</b> 뒤 마감돼요.</>}
          </p>
        </div>
        <button onClick={close} className="text-ink-400 pressable flex-none" aria-label="닫기">
          <X size={15} />
        </button>
      </div>

      {open ? (
        <div className="flex gap-2 mt-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC123"
            autoFocus
            className="flex-1 min-w-0 border border-ink-200 px-3 py-2.5 text-sm text-ink tracking-[0.2em]
                       placeholder:tracking-normal placeholder:text-ink-400/60
                       focus:outline-none focus:border-ink transition-colors"
          />
          <button
            onClick={submit}
            disabled={busy || code.length !== 6}
            className="px-4 text-xs font-bold text-ink pressable disabled:opacity-40
                       flex items-center gap-1 flex-none"
            style={{ background: LIME }}
          >
            {busy && <Loader size={12} className="animate-spin" />}
            {busy ? '확인 중' : '등록'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 px-4 py-2 text-[12px] font-bold text-ink pressable"
          style={{ background: LIME }}
        >
          코드 입력하기
        </button>
      )}
    </div>
  );
}
