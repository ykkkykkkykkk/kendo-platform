import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';

/**
 * 선수 하이라이트.
 *
 * 동그란 썸네일을 가로로 늘어놓고, 고른 영상만 아래에서 재생한다.
 * 영상이 여러 개여도 화면을 길게 먹지 않고, 사진이 주인공인 프로필 흐름을 끊지 않는다.
 * 유튜브가 아닌 링크는 재생할 수 없으므로 예전처럼 링크 줄로 따로 모아 둔다.
 */

const thumbOf = (videoId) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export default function PlayerVideos({ videos = [] }) {
  const playable = videos.filter((v) => v.video_id);
  const links    = videos.filter((v) => !v.video_id);
  const [openId, setOpenId] = useState(null);

  if (!videos.length) return null;

  const open = playable.find((v) => v.id === openId) ?? null;

  return (
    <section className="mt-8">
      <div className="flex items-baseline gap-2 mb-3">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">HIGHLIGHT</p>
        <span className="flex-1" />
        <span className="text-[11px] text-ink-400 tabular-nums">{videos.length}</span>
      </div>

      <div style={{ borderTop: '1.5px solid #111111' }}>
        {playable.length > 0 && (
          /* 화면 폭을 넘어가면 옆으로 민다. 스크롤바는 감춘다(-mx-5로 화면 끝까지 흐르게) */
          <div className="flex gap-3.5 scroll-x pt-4 pb-1 -mx-5 px-5">
            {playable.map((v) => {
              const active = v.id === openId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setOpenId(active ? null : v.id)}
                  className="flex-none w-[76px] text-center pressable"
                  aria-label={`${v.title || '영상'} 재생`}
                >
                  <span
                    className={`relative block w-[72px] h-[72px] rounded-full overflow-hidden mx-auto bg-ink-200 ${
                      active ? 'ring-2 ring-offset-2 ring-ink' : ''
                    }`}
                  >
                    <img
                      src={thumbOf(v.video_id)}
                      alt=""
                      loading="lazy"
                      /* 유튜브 썸네일은 위아래에 검은 띠가 있어 가운데만 키워 쓴다 */
                      className="absolute inset-0 w-full h-full object-cover scale-[1.35]"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <span className="w-7 h-7 rounded-full bg-lime flex items-center justify-center">
                        <Play size={13} className="text-ink ml-0.5" fill="#111111" />
                      </span>
                    </span>
                  </span>
                  <span className="block text-[11px] text-ink-600 mt-1.5 truncate">
                    {v.title || '영상'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {open && (
          <div className="mt-3">
            <div className="relative w-full bg-ink-200" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${open.video_id}?autoplay=1&rel=0`}
                title={open.title || '선수 영상'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {open.title && <p className="text-[13px] text-ink mt-2">{open.title}</p>}
          </div>
        )}

        {links.map((v) => (
          <a
            key={v.id}
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-3 border-t border-ink-200 pressable mt-3"
          >
            <ExternalLink size={14} className="text-ink-400 shrink-0" />
            <span className="text-[14px] text-ink truncate">{v.title || v.url}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
