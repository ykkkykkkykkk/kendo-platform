/* 알림 권한 안내 팝업.
 *
 * 시스템 권한창은 한 번 거부하면 브라우저가 다시 묻지 않는다. 그래서 바로 띄우면 안 되고,
 * 먼저 왜 필요한지 우리가 설명한 뒤 '알림 받기'를 누른 사람에게만 시스템 창을 띄운다.
 * 승낙할 사람에게만 한 번의 기회를 쓰는 것이다.
 *
 * 띄우는 시점도 고른다 — 앱을 처음 열자마자 물으면 거의 거부한다. 픽을 하거나 응원을
 * 남긴 직후처럼 '이 앱이 뭔지 알게 된' 순간에 묻는다(useNotificationPrompt).
 *
 * iOS 사파리는 홈 화면에 추가해야만 알림이 된다. 그 경우 권한을 물어도 소용없으므로
 * 안내 문구만 보여준다.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, Share } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { enablePush, isIOS, isStandalone } from '../utils/push.js';

const LIME = '#D8FF3E';

/* 실제로 발송되는 알림만 적는다.
   지키지 못할 약속으로 권한을 받아내면, 아무것도 안 오는 걸 알게 된 사람은
   알림을 끄는 게 아니라 앱을 지운다. 발송 로직이 생기면 그때 줄을 늘린다. */
const BENEFITS = [
  '응원한 선수가 답글을 달면 알려드려요',
  '선수가 내 응원에 ❤️를 누르면 알려드려요',
  '응원하는 선수가 새 소식을 올리면 알려드려요',
  '내 질문에 선수가 답하면 알려드려요',
];

export default function NotificationPrompt({ open, onAccept, onLater }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const needHome = isIOS() && !isStandalone();

  const accept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await enablePush();
      showToast('알림이 켜졌어요.', 'success');
      onAccept?.(true);
    } catch {
      /* 거부했거나 차단돼 있다. 두 번 묻지 않는다 — 시스템 권한창은 한 번뿐이라
         다시 띄워도 아무 일도 일어나지 않고 사용자만 성가시다. */
      onAccept?.(false);
    } finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center px-5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onLater}
        >
          <div className="absolute inset-0 bg-black/50" />

          <motion.div
            className="relative w-full bg-paper rounded-[20px] p-6"
            style={{ maxWidth: 330 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onLater}
              className="absolute top-4 right-4 text-ink-400 pressable"
              aria-label="닫기"
            >
              <X size={17} />
            </button>

            <div className="w-12 h-12 rounded-full flex items-center justify-center"
                 style={{ background: LIME }}>
              {needHome ? <Share size={20} className="text-ink" /> : <Bell size={20} className="text-ink" />}
            </div>

            {needHome ? (
              <>
                <h2 className="text-ink font-bold mt-4 leading-snug" style={{ fontSize: 18 }}>
                  홈 화면에 추가하면<br />알림을 받을 수 있어요
                </h2>
                <p className="text-[13px] text-ink-400 mt-2.5 leading-relaxed">
                  아이폰은 사파리 탭에서는 알림이 오지 않아요.<br />
                  <b className="text-ink-600">공유 → 홈 화면에 추가</b>를 누르면
                  앱처럼 쓰면서 알림도 받을 수 있어요.
                </p>
                <button
                  onClick={onLater}
                  className="w-full mt-5 py-3 rounded-full text-ink text-sm font-bold pressable"
                  style={{ background: LIME }}
                >
                  알겠어요
                </button>
              </>
            ) : (
              <>
                <h2 className="text-ink font-bold mt-4 leading-snug" style={{ fontSize: 18 }}>
                  알림을 켜두시면<br />놓치지 않아요
                </h2>

                <div className="mt-4 space-y-2">
                  {BENEFITS.map((b) => (
                    <div key={b} className="flex items-start gap-2">
                      <Check size={13} className="text-ink flex-none mt-[3px]" strokeWidth={2.6} />
                      <p className="text-[13px] text-ink-600 leading-snug">{b}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={accept}
                  disabled={busy}
                  className="w-full mt-5 py-3.5 rounded-full text-ink text-sm font-bold pressable disabled:opacity-60"
                  style={{ background: LIME }}
                >
                  {busy ? '여는 중…' : '알림 받기'}
                </button>
                <button
                  onClick={onLater}
                  className="w-full mt-1.5 py-2.5 text-ink-400 text-[13px] font-medium pressable"
                >
                  나중에
                </button>

                <p className="text-[11px] text-ink-400/80 text-center mt-1">
                  언제든 설정에서 끌 수 있어요
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
