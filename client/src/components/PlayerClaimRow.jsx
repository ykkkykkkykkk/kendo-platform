import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PlayerClaimModal from './PlayerClaimModal.jsx';

/**
 * 마이페이지의 "저 선수입니다" 줄.
 *
 * 선수 200명 중 계정이 있는 사람이 19명뿐이었다. 설문받아 관리자가 계정을 만드는
 * 방식으로는 감당이 안 돼서, 본인이 여기서 신청하게 한다.
 * 이미 선수로 확인된 사람에게는 보이지 않는다.
 */
export default function PlayerClaimRow() {
  const { user, login } = useAuth();
  const [state, setState] = useState(null);   // { is_player, claim }
  const [open, setOpen]   = useState(false);

  const load = useCallback(() => {
    api.myClaim().then(setState).catch(() => setState(null));
  }, []);
  useEffect(() => { if (user) load(); }, [user?.id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // 승인됐는데 토큰이 아직 팬이면, 새 토큰을 받아 선수 권한을 바로 쓰게 한다
  useEffect(() => {
    if (!state?.is_player) return;
    if (user?.role === 'player') return;
    api.refreshToken()
      .then((r) => r.json())
      .then((d) => { if (d?.token) login(d.token); })
      .catch(() => { /* 다음 로그인 때 반영된다 */ });
  }, [state?.is_player]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !state || state.is_player) return null;

  const claim = state.claim;
  const pending  = claim?.status === 'pending';
  const rejected = claim?.status === 'rejected';

  return (
    <>
      <div className="flex items-center gap-3 py-3.5 border-b border-ink-200">
        <span className="text-ink-400 text-sm flex-none">선수 계정</span>
        <span className="flex-1" />
        {pending ? (
          <span className="text-ink-400 text-xs">
            <span className="text-ink font-medium">{claim.player_name}</span> 확인 중…
          </span>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="bg-ink text-white text-xs font-bold px-3 py-1.5 rounded-full pressable"
          >
            저 선수입니다
          </button>
        )}
      </div>

      {/* 거절 사유는 본인만 볼 수 있게 바로 아래에 조용히 붙인다 */}
      {rejected && claim.review_note && (
        <p className="text-ink-400 text-[11px] pb-2 -mt-1">
          지난 신청은 확인되지 않았습니다 · {claim.review_note}
        </p>
      )}

      {open && (
        <PlayerClaimModal onClose={() => setOpen(false)} onDone={load} />
      )}
    </>
  );
}
