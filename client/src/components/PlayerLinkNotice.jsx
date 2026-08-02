import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const DISMISS_KEY = 'kendo_player_link_notice_dismissed';

/**
 * 선수 계정인데 아직 어느 선수인지 연결되지 않은 사용자에게 안내한다.
 *
 * 설문으로 아이디만 먼저 받아 계정을 만들었기 때문에 누가 누구인지 모른다.
 * 본인이 자기 선수 페이지에서 '팬 등록'을 누르면 그게 신원 단서가 되고,
 * 관리자가 그걸 보고 계정을 연결한다.
 *
 * 연결 전에는 소식 올리기·질문 답변이 막혀 있어, 닫아도 세션마다 다시 보여준다
 * (한 번 닫으면 그 탭에서는 다시 뜨지 않는다).
 */
export default function PlayerLinkNotice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [closed, setClosed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');

  const needsLink = user?.role === 'player' && !user?.playerId;
  if (!needsLink || closed) return null;

  const close = () => { sessionStorage.setItem(DISMISS_KEY, '1'); setClosed(true); };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/40 flex items-end justify-center"
        onClick={close}
      >
        <motion.div
          initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-mobile bg-paper border-t-2 border-ink px-5 pt-5 pb-8"
        >
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-bold tracking-[0.1em] bg-lime text-ink px-2 py-1">선수</span>
            <span className="flex-1" />
            <button onClick={close} className="text-ink-400 pressable" aria-label="닫기">
              <X size={18} />
            </button>
          </div>

          <h2 className="text-2xl font-bold text-ink tracking-[-0.03em] mt-3 leading-tight">
            본인 확인이 필요해요
          </h2>
          <p className="text-ink-600 text-sm mt-2 leading-relaxed">
            아이디는 만들어졌지만 아직 어느 선수인지 연결되지 않았습니다.
            <br />
            <span className="bg-lime px-1 font-medium">본인 선수 페이지에서 ‘팬 등록’</span>을 눌러주시면
            확인 후 선수용 아이디로 전환해 드릴게요.
          </p>

          <div className="mt-4 border border-ink-200 px-4 py-3">
            <p className="text-[11px] text-ink-400">전환되면 이런 걸 할 수 있어요</p>
            <p className="text-[13px] text-ink mt-1">
              팬에게 소식 올리기 · 질문 답변 · 응원 댓글에 하트와 답글
            </p>
          </div>

          <button
            onClick={() => { close(); navigate('/search'); }}
            className="w-full mt-4 flex items-center justify-center gap-1.5 bg-lime hover:bg-lime-dark
                       text-ink font-medium py-3.5 rounded-full text-sm pressable"
          >
            <Search size={15} /> 내 선수 페이지 찾기
          </button>
          <button onClick={close} className="w-full mt-2 text-ink-400 text-xs py-2">
            나중에 하기
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
