import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, Loader, ExternalLink } from 'lucide-react';

/**
 * 선수 영상 링크 편집 UI.
 * 관리자 화면과 선수 본인 화면이 같이 쓴다 — 호출할 API만 주입받는다.
 *
 * @param api { list:()=>Promise<rows>, add:(body)=>Promise<Response>, remove:(id)=>Promise<Response> }
 */
export default function VideoManager({ api, title = '영상 링크', hint }) {
  const [videos, setVideos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl]         = useState('');
  const [vtitle, setVtitle]   = useState('');
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await api.list();
    setVideos(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }, [api]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!url.trim() || busy) return;
    setBusy(true); setErr('');
    try {
      const res = await api.add({ url: url.trim(), title: vtitle.trim() || undefined });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '등록 실패');
      setVideos(body.videos ?? []);
      setUrl(''); setVtitle('');
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  async function remove(v) {
    if (!window.confirm(`이 영상을 삭제할까요?\n${v.title || v.url}`)) return;
    setBusy(true); setErr('');
    try {
      const res = await api.remove(v.id);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '삭제 실패');
      setVideos(body.videos ?? []);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-[13px] font-bold text-ink">{title}</h3>
        <span className="text-[11px] text-ink-400">{videos.length}개</span>
        {busy && <Loader size={12} className="animate-spin text-ink-400" />}
      </div>
      {hint && <p className="text-[11px] text-ink-400 mb-3">{hint}</p>}

      {err && <p className="mb-3 px-3 py-2 border border-red-300 bg-red-50 text-red-700 text-[12px]">{err}</p>}

      {/* form을 쓰지 않는다 — 관리자 선수 편집 화면 안에 들어가면 form이 중첩되고
          영상 추가가 바깥 저장 폼까지 제출시킨다. Enter는 직접 처리한다. */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="https://youtu.be/... 또는 유튜브 주소"
          className="flex-1 border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <input
          value={vtitle}
          onChange={(e) => setVtitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="제목 (선택)"
          className="sm:w-44 border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy || !url.trim()}
          className="flex items-center justify-center gap-1 px-4 py-2 bg-ink text-white text-sm font-medium disabled:opacity-40"
        >
          <Plus size={14} /> 추가
        </button>
      </div>

      {loading ? (
        <p className="text-ink-400 text-sm py-4">불러오는 중…</p>
      ) : videos.length === 0 ? (
        <p className="text-ink-400 text-sm py-4 border-t border-ink-200">등록된 영상이 없습니다.</p>
      ) : (
        <div style={{ borderTop: '1.5px solid #111111' }}>
          {videos.map((v) => (
            <div key={v.id} className="flex items-center gap-3 py-2.5 border-b border-ink-200">
              {v.video_id ? (
                <img
                  src={`https://i.ytimg.com/vi/${v.video_id}/default.jpg`}
                  alt=""
                  className="w-16 h-9 object-cover shrink-0 bg-ink-200"
                />
              ) : (
                <span className="w-16 h-9 shrink-0 bg-ink-200 flex items-center justify-center">
                  <ExternalLink size={14} className="text-ink-400" />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-ink truncate">{v.title || '(제목 없음)'}</p>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-ink-400 truncate hover:underline block"
                >
                  {v.url}
                </a>
              </div>
              <button
                onClick={() => remove(v)}
                disabled={busy}
                className="shrink-0 flex items-center gap-1 text-xs text-ink-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={12} /> 삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
