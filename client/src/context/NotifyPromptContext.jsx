/* 알림 안내 팝업을 언제 띄울지 정하는 곳.
 *
 * 앱을 처음 열자마자 물으면 거의 거부한다. 그리고 시스템 권한창은 한 번 거부하면
 * 브라우저가 다시 묻지 않으므로, 그 한 번의 기회를 승낙할 만한 순간에 써야 한다.
 * 그래서 화면 곳곳에서 '지금이 그 순간'이라고 알려주면(askNotify) 그때만 띄운다.
 *
 * 좋은 순간: 픽을 처음 마쳤을 때 · 선수에게 처음 응원을 남겼을 때 · 대나무에 처음 물을 줬을 때.
 * 전부 '이 앱이 뭘 해주는지 방금 알게 된' 직후다.
 *
 * 기록은 이 기기에만 남긴다(localStorage). 권한도 기기별이라 서버에 둘 이유가 없고,
 * 로그인 전에도 판단할 수 있어야 한다.
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import NotificationPrompt from '../components/NotificationPrompt.jsx';
import { pushSupported, pushPermission, currentSubscription } from '../utils/push.js';

const COUNT_KEY = 'notif_prompt_count';       // 보여준 횟수
const DATE_KEY  = 'notif_prompt_last_date';   // 마지막으로 보여준 날(ms)
const DONE_KEY  = 'notif_prompt_done';        // 더 묻지 않음(허용했거나 거부했거나)

const MAX_ASKS   = 2;                  // 두 번 거절하면 그만 묻는다
const AGAIN_AFTER_MS = 7 * 86400_000;  // '나중에'를 누르면 7일 뒤 한 번 더

const read = (k, d = null) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* 차단돼도 무시 */ } };

const Ctx = createContext(null);

export function NotifyPromptProvider({ children }) {
  const [open, setOpen] = useState(false);
  const asking = useRef(false);   // 같은 순간에 두 번 불려도 한 번만 뜬다

  /** 지금 띄워도 되는 상태인가 */
  const canAsk = useCallback(async () => {
    if (!pushSupported()) return false;
    if (read(DONE_KEY) === '1') return false;

    // 이미 허용돼 있고 구독까지 돼 있으면 물을 이유가 없다
    if (pushPermission() === 'granted' && (await currentSubscription())) return false;
    // 이미 거부된 권한은 다시 물어도 시스템 창이 뜨지 않는다
    if (pushPermission() === 'denied') { write(DONE_KEY, '1'); return false; }

    const count = Number(read(COUNT_KEY, '0')) || 0;
    if (count >= MAX_ASKS) { write(DONE_KEY, '1'); return false; }

    // 두 번째는 7일이 지난 뒤에만
    const last = Number(read(DATE_KEY, '0')) || 0;
    if (count > 0 && Date.now() - last < AGAIN_AFTER_MS) return false;

    return true;
  }, []);

  /* 화면에서 '좋은 순간'이 왔을 때 부른다. 조건에 안 맞으면 조용히 아무 일도 안 한다.
     팝업이 액션 직후의 토스트를 덮지 않도록 잠깐 뒤에 띄운다. */
  const askNotify = useCallback(async (delay = 900) => {
    if (asking.current || open) return;
    if (!(await canAsk())) return;
    asking.current = true;
    setTimeout(() => {
      setOpen(true);
      write(COUNT_KEY, String((Number(read(COUNT_KEY, '0')) || 0) + 1));
      write(DATE_KEY, String(Date.now()));
      asking.current = false;
    }, delay);
  }, [canAsk, open]);

  /* '알림 받기'를 눌러 시스템 창까지 갔다 온 뒤.
     허용이든 거부든 다시 묻지 않는다 — 거부는 되돌릴 수 없고, 허용은 이미 끝났다. */
  const onAccept = useCallback(() => {
    setOpen(false);
    write(DONE_KEY, '1');
  }, []);

  /** '나중에' · X · 배경 클릭. 7일 뒤 한 번 더 기회가 남는다(횟수는 이미 올려뒀다). */
  const onLater = useCallback(() => {
    setOpen(false);
    if ((Number(read(COUNT_KEY, '0')) || 0) >= MAX_ASKS) write(DONE_KEY, '1');
  }, []);

  return (
    <Ctx.Provider value={{ askNotify }}>
      {children}
      <NotificationPrompt open={open} onAccept={onAccept} onLater={onLater} />
    </Ctx.Provider>
  );
}

export function useNotifyPrompt() {
  return useContext(Ctx) ?? { askNotify: () => {} };
}
