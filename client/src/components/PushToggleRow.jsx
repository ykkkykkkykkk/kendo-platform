import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import {
  pushSupported, pushPermission, currentSubscription,
  enablePush, disablePush, isIOS, isStandalone,
} from '../utils/push.js';

/**
 * 잠금화면 알림 켜기.
 *
 * 알림함은 앱을 열어야 보여서, 선수는 질문이 온 걸 팬은 답변이 달린 걸 모르고 지나쳤다.
 * 웹푸시는 앱을 닫아둬도 폰에 뜬다. 기기별로 켜야 하므로 상태도 기기 기준이다.
 */
export default function PushToggleRow() {
  const { showToast } = useToast();
  const [on, setOn]     = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (pushSupported()) setOn(!!(await currentSubscription()));
      setReady(true);
    })();
  }, []);

  if (!ready || !pushSupported()) return null;

  const blocked  = pushPermission() === 'denied';
  const needHome = isIOS() && !isStandalone();

  const toggle = async () => {
    setBusy(true);
    try {
      if (on) {
        await disablePush();
        setOn(false);
        showToast('알림을 껐습니다.', 'success');
      } else {
        await enablePush();
        setOn(true);
        showToast('알림을 켰습니다. 새 소식이 오면 알려드릴게요.', 'success');
      }
    } catch (e) {
      showToast(e.message || '알림 설정에 실패했습니다.', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="border border-ink-200 rounded-xl px-4 py-3.5 flex items-center gap-3">
      <span className="flex-none text-ink">{on ? <Bell size={17} /> : <BellOff size={17} />}</span>
      <div className="min-w-0 flex-1">
        <p className="text-ink text-sm font-semibold">
          {on ? '알림 켜짐' : '알림 받기'}
        </p>
        <p className="text-ink-400 text-[11px] mt-0.5 leading-[1.5]">
          {needHome
            ? '아이폰은 공유 → 홈 화면에 추가 후 켤 수 있어요'
            : blocked
              ? '브라우저에서 알림이 차단돼 있어요. 설정에서 허용해주세요'
              : on
                ? '질문·답변·응원이 오면 폰으로 알려드려요'
                : '앱을 닫아둬도 새 소식을 폰으로 받아보세요'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={busy || blocked || needHome}
        className={`flex-none text-xs font-bold px-3.5 py-2 rounded-full pressable
                    disabled:opacity-40 ${on ? 'border border-ink-200 text-ink-600' : 'bg-lime text-ink'}`}
      >
        {busy ? '…' : on ? '끄기' : '켜기'}
      </button>
    </div>
  );
}
