import { useState } from 'react';
import { PlayCircle, ExternalLink } from 'lucide-react';

/**
 * 선수 영상 목록.
 * 유튜브면 썸네일을 보여주고 눌렀을 때 그 자리에서 재생한다(video_id로 임베드).
 * 유튜브가 아니면 링크로만 연다.
 */

const thumbOf = (videoId) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

function VideoCard({ v }) {
  const [playing, setPlaying] = useState(false);

  if (!v.video_id) {
    // 유튜브가 아닌 링크 — 새 탭으로 연다
    return (
      <a
        href={v.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 py-3 border-t border-ink-200 pressable"
      >
        <ExternalLink size={14} className="text-ink-400 shrink-0" />
        <span className="text-[14px] text-ink truncate">{v.title || v.url}</span>
      </a>
    );
  }

  return (
    <div className="border-t border-ink-200 py-3">
      <div className="relative w-full bg-ink-200" style={{ aspectRatio: '16 / 9' }}>
        {playing ? (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${v.video_id}?autoplay=1&rel=0`}
            title={v.title || '선수 영상'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full group"
            aria-label={`${v.title || '영상'} 재생`}
          >
            <img
              src={thumbOf(v.video_id)}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <span className="w-12 h-12 rounded-full bg-lime flex items-center justify-center">
                <PlayCircle size={26} strokeWidth={1.6} className="text-ink" />
              </span>
            </span>
          </button>
        )}
      </div>
      {v.title && <p className="text-[13px] text-ink mt-2">{v.title}</p>}
    </div>
  );
}

export default function PlayerVideos({ videos = [] }) {
  if (!videos.length) return null;

  return (
    <section className="mt-8">
      <div className="flex items-baseline gap-2 mb-3">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">VIDEO</p>
        <span className="text-[11px] text-ink-400">경기 · 훈련 영상</span>
        <span className="flex-1" />
        <span className="text-[11px] text-ink-400 tabular-nums">{videos.length}</span>
      </div>
      <div style={{ borderTop: '1.5px solid #111111' }}>
        {videos.map((v) => <VideoCard key={v.id} v={v} />)}
      </div>
    </section>
  );
}
