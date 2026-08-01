import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

/** 'YYYY-MM-DD HH:MM:SS'(UTC) → '3분 전' */
function since(s) {
  const t = new Date(String(s).replace(' ', 'T') + 'Z').getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

/** 알림함. 로그인했을 때만 보인다. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen]   = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUn]   = useState(0);
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    if (!user) return;
    const r = await api.notifications();
    if (r?.notifications) { setItems(r.notifications); setUn(r.unread ?? 0); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // 열려 있을 때 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      if (unread > 0) { await api.readNotifications(); setUn(0); }
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={toggle}
        className="relative w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable"
        aria-label={`알림${unread > 0 ? ` ${unread}건` : ''}`}
      >
        <Bell size={16} strokeWidth={1.8} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-lime
                           border border-ink text-ink text-[9px] font-bold flex items-center justify-center tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-auto bg-paper border border-ink z-50 shadow-lg">
          <div className="px-3 py-2 border-b border-ink-200 flex items-center">
            <span className="text-[11px] font-bold tracking-[0.1em] text-ink">알림</span>
            <span className="flex-1" />
            <span className="text-[10px] text-ink-400">{items.length}건</span>
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-[12px] text-ink-400">아직 알림이 없어요</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => { setOpen(false); if (n.link) navigate(n.link); }}
                className={`w-full text-left px-3 py-2.5 border-b border-ink-200 last:border-0 hover:bg-ink-200/30 transition-colors ${
                  n.is_read ? '' : 'bg-lime/15'
                }`}
              >
                <p className="text-[13px] text-ink leading-snug">{n.message}</p>
                <p className="text-[10px] text-ink-400 mt-0.5">{since(n.created_at)}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
