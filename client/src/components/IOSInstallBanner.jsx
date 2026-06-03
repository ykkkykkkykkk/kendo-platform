import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.navigator.standalone === true;
}

export default function IOSInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIOS() || isInStandaloneMode()) return;
    const dismissed = sessionStorage.getItem('ios-install-dismissed');
    if (dismissed) return;
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('ios-install-dismissed', '1');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-50"
        >
          <div className="bg-black-800 border border-black-700 rounded-2xl px-4 py-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black-700 border border-orange-500/30 rounded-xl flex items-center justify-center flex-none">
                  <span className="text-orange-500 font-black text-lg">검</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">앱으로 설치하기</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    하단 공유
                    <span className="mx-1 text-white/70">
                      <ShareIcon />
                    </span>
                    버튼 → <span className="text-orange-400">"홈 화면에 추가"</span>
                  </p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="w-7 h-7 rounded-full bg-black-700 flex items-center justify-center flex-none mt-0.5"
              >
                <X size={13} className="text-white/50" />
              </button>
            </div>
            {/* 말풍선 꼬리 */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
              <div className="w-3 h-3 bg-black-800 border-r border-b border-black-700 rotate-45 translate-y-[-6px] mx-auto" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  );
}
