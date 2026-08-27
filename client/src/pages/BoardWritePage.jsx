import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ImagePlus, X, Loader, PlayCircle } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const MAX_TITLE   = 100;
const MAX_CONTENT = 5000;

export default function BoardWritePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title,    setTitle]    = useState('');
  const [content,  setContent]  = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);

  // 주소창으로 바로 들어온 비로그인 사용자를 돌려보낸다
  useEffect(() => {
    if (!user) navigate('/board', { replace: true });
  }, [user, navigate]);

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('이미지 파일만 가능합니다.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024)     { showToast('5MB 이하만 가능합니다.', 'error'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      fd.append('folder', 'kendo-board');

      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || '업로드 실패');
      setImageUrl(data.secure_url);
    } catch (err) {
      showToast(err.message || '업로드 오류', 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (saving) return;
    if (!title.trim())   { showToast('제목을 입력해주세요.', 'error'); return; }
    if (!content.trim()) { showToast('내용을 입력해주세요.', 'error'); return; }

    setSaving(true);
    haptic();
    try {
      const res = await api.boardCreate({
        title:     title.trim(),
        content:   content.trim(),
        image_url: imageUrl ?? undefined,
        video_url: videoUrl.trim() || undefined,
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? '등록에 실패했습니다.', 'error'); return; }

      showToast('글을 올렸습니다!', 'success');
      // 목록이 아니라 방금 쓴 글로 보낸다 — 올린 결과를 바로 확인하게
      navigate(`/board/${data.id}`, { replace: true });
    } catch {
      showToast('등록에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-body bg-paper min-h-screen">
      <header className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 pressable"
          aria-label="뒤로"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">NEW POST</p>
          <h1 className="text-ink font-bold text-lg tracking-tight leading-tight">글쓰기</h1>
        </div>
        <button
          onClick={submit}
          disabled={saving || uploading}
          className="px-4 py-2 bg-lime hover:bg-lime-dark text-ink text-sm font-bold rounded-full pressable disabled:opacity-50"
        >
          {saving ? '올리는 중…' : '올리기'}
        </button>
      </header>

      <div className="px-5 pb-24">
        <div style={{ borderTop: '1.5px solid #111111' }}>
          {/* 제목 */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
            placeholder="제목"
            className="w-full py-4 text-ink font-bold text-lg tracking-tight outline-none placeholder:text-ink-200 bg-transparent"
          />

          {/* 본문 */}
          <div className="border-t border-ink-200">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
              placeholder="검도 이야기, 장비 질문, 대회 후기 무엇이든 좋아요"
              rows={10}
              className="w-full py-4 text-ink text-[15px] leading-relaxed outline-none placeholder:text-ink-200 bg-transparent resize-none"
            />
            <div className="pb-3 text-right">
              <span className="text-[11px] text-ink-400 tabular-nums">
                {content.length} / {MAX_CONTENT}
              </span>
            </div>
          </div>
        </div>

        {/* 첨부한 사진 */}
        {imageUrl && (
          <div className="mt-4 relative">
            <img src={imageUrl} alt="첨부 이미지" className="w-full rounded-lg border border-ink-200" />
            <button
              onClick={() => setImageUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink/80 text-white flex items-center justify-center pressable"
              aria-label="사진 빼기"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* 첨부 도구 */}
        <div className="mt-5">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">ATTACH</p>

          <label className={`flex items-center gap-2.5 py-3 border-t border-ink-200 ${uploading ? 'opacity-60' : 'cursor-pointer'}`}>
            {uploading
              ? <Loader size={16} className="text-ink animate-spin" />
              : <ImagePlus size={16} className="text-ink" />}
            <span className="text-ink text-sm font-medium flex-1">
              {uploading ? '올리는 중…' : imageUrl ? '사진 바꾸기' : '사진 첨부 (1장)'}
            </span>
            <input type="file" accept="image/*" onChange={pickImage} disabled={uploading} className="hidden" />
          </label>

          <div className="flex items-center gap-2.5 py-3 border-t border-ink-200">
            <PlayCircle size={17} className="text-ink flex-none" />
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="유튜브 링크 (선택)"
              className="flex-1 text-ink text-sm outline-none placeholder:text-ink-200 bg-transparent min-w-0"
            />
          </div>
          <p className="text-[11px] text-ink-400 mt-2">
            유튜브 링크를 넣으면 글에 영상이 바로 재생되게 붙습니다
          </p>
        </div>
      </div>
    </main>
  );
}
