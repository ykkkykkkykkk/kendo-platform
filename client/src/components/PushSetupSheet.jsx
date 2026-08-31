import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  pushSupported, pushPermission, currentSubscription, enablePush, isStandalone,
} from '../utils/push.js';

const SEEN_KEY = 'push_prompt_seen';

/**
 * 앱을 깔고 처음 열었을 때 알림을 켜게 하는 안내.
 *
 * 알림은 만들어져 있는데 켜는 자리가 마이페이지 안쪽 토글 하나뿐이라 아무도 못 찾았다
 * (회원 431명 / 구독 0명). 앱을 깐 직후가 알림을 켜게 만들 사실상 유일한 기회다.
 *
 * 권한 요청은 반드시 '알림 받기'를 눌렀을 때만 한다. 뜨자마자 자동으로 요청하면
 * 반사적으로 차단을 누르고, 한 번 차단되면 앱 안에서는 되돌릴 수 없다(폰 설정에서만 풀린다).
 *
 * 안 띄우는 경우
 *  - 앱(홈화면 추가/TWA)이 아님 — 브라우저에서는 마이페이지 토글로 켠다
 *  - 이미 켜져 있거나, 이미 차단됨(차단은 여기서 되돌릴 수 없다)
 *  - 로그인 전 — 구독 등록이 인증을 타므로 로그인한 뒤에 띄운다
 *  - 이미 한 번 보여줬음 (다시 조르지 않는다)
 *
 * 첫 방문 환영 팝업(WelcomeModal)과는 겹치지 않는다 — 그쪽은 로그인 전에만 뜬다.
 */
export default function PushSetupSheet() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;                                   // 구독 등록에 로그인이 필요하다
    if (!pushSupported() || !isStandalone()) return;
    // denied만 걸러낸다. TWA는 안드로이드가 앱 설치 때 알림 권한을 먼저 받아둬서
    // granted인데 구독은 없는 상태가 흔하다 — 그때도 띄워야 실제로 구독이 생긴다.
    if (pushPermission() === 'denied') return;
    if (localStorage.getItem(SEEN_KEY) === 'true') return;

    let alive = true;
    (async () => {
      if (await currentSubscription()) return;           // 이 기기는 이미 구독돼 있다
      // 앱이 뜨자마자 겹쳐 보이지 않게 한 박자 쉰다
      setTimeout(() => { if (alive) setOpen(true); }, 1200);
    })();
    return () => { alive = false; };
  }, [user]);

  const close = () => {
    localStorage.setItem(SEEN_KEY, 'true');
    setOpen(false);
  };

  const allow = async () => {
    setBusy(true);
    try {
      await enablePush();
      showToast('알림을 켰습니다. 픽 마감과 새 소식을 알려드릴게요.', 'success');
    } catch (e) {
      showToast(e.message || '알림 설정에 실패했습니다.', 'error');
    } finally {
      setBusy(false);
      close();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-black/50" />

          <motion.div
            className="relative w-full max-w-[340px] bg-paper rounded-[20px] p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="w-11 h-11 rounded-full bg-lime flex items-center justify-center text-ink">
              <Bell size={20} />
            </span>

            <h2 className="text-[22px] font-bold text-ink tracking-tight leading-snug mt-3.5">
              놓치면 아까운 건<br />
              <span className="bg-lime px-1 box-decoration-clone">폰으로 알려드려요</span>
            </h2>
            <p className="text-ink-400 text-[13px] leading-relaxed mt-2.5">
              앱을 꺼놔도 잠금화면에 떠요. 광고는 보내지 않아요.
            </p>

            <div className="mt-4">
              {/* 실제로 푸시가 나가는 것만 적는다. 없는 걸 적어두면 켜놓고 안 온다고 느낀다. */}
              {[
                ['🥋', '선수가 새 소식을 올리면', '팔로우한 선수 글과 영상을 바로 받아요'],
                ['💬', '내 글에 댓글이 달리면',   '자유게시판 답글을 놓치지 않아요'],
                ['❤️', '선수가 내 응원에 답하면', '답글이나 하트를 받으면 알려드려요'],
              ].map(([emoji, title, desc]) => (
                <div key={title} className="flex gap-2.5 py-2.5 border-t border-ink-200">
                  <span className="text-[15px] leading-6 flex-shrink-0">{emoji}</span>
                  <div className="min-w-0">
                    <p className="text-ink font-bold text-[13px] leading-5">{title}</p>
                    <p className="text-ink-400 text-[12px] leading-[1.5] mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={allow}
              disabled={busy}
              className="w-full bg-ink text-lime font-bold text-[15px] py-3.5 rounded-xl mt-4 pressable
                         disabled:opacity-50"
            >
              {busy ? '…' : '알림 받기'}
            </button>
            <button
              onClick={close}
              disabled={busy}
              className="w-full text-ink-400 text-[13px] py-2.5 mt-1 pressable"
            >
              나중에 할게요
            </button>
            <p className="text-ink-400 text-[11px] text-center mt-1">
              마이페이지에서 언제든 켜고 끌 수 있어요
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
