import { useState, useRef } from 'react';
import { Type, Video, Image as ImageIcon, Loader, X } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const TABS = [
  { key: 'text',  label: '글',   icon: Type },
  { key: 'video', label: '영상', icon: Video },
  { key: 'image', label: '사진', icon: ImageIcon },
];

/** 선수가 소식을 올리는 입력창 (선수 계정에서만 보인다) */
export default function PostComposer({ onPosted }) {
  const { showToast } = useToast();
  const fileRef = useRef(null);

  const [type, setType]     = useState('text');
  const [content, setText]  = useState('');
  const [videoUrl, setVid]  = useState('');
  const [imageUrl, setImg]  = useState('');
  const [busy, setBusy]     = useState(false);
  const [uploading, setUp]  = useState(false);

  async function pickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('이미지 파일만 가능합니다.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024)     { showToast('5MB 이하만 가능합니다.', 'error'); return; }

    setUp(true);
    try {
      // 프로필 사진과 같은 방식(Cloudinary 언사인드 업로드)
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      fd.append('folder', 'kendo-posts');
      const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || '업로드 실패');
      setImg(d.secure_url);
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setUp(false); }
  }

  async function submit() {
    if (busy) return;
    if (type === 'text'  && !content.trim())  { showToast('내용을 입력해주세요.', 'error'); return; }
    if (type === 'video' && !videoUrl.trim()) { showToast('영상 주소를 넣어주세요.', 'error'); return; }
    if (type === 'image' && !imageUrl)        { showToast('사진을 올려주세요.', 'error'); return; }

    setBusy(true);
    try {
      const res = await api.createPost({
        type,
        content: content.trim() || undefined,
        video_url: type === 'video' ? videoUrl.trim() : undefined,
        image_url: type === 'image' ? imageUrl : undefined,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '등록 실패');

      setText(''); setVid(''); setImg('');
      showToast(
        body.notified > 0 ? `소식을 올렸어요 · 팬 ${body.notified}명에게 알림` : '소식을 올렸어요',
        'success',
      );
      onPosted?.();
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  }

  return (
    <div className="border border-ink p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold tracking-[0.1em] bg-lime text-ink px-2 py-1">선수</span>
        <span className="text-[12px] text-ink-600">팬에게 소식 남기기</span>
      </div>

      <div className="flex gap-1.5 mb-3">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium border transition-colors ${
              type === key ? 'bg-ink text-white border-ink' : 'bg-paper text-ink-600 border-ink-200'
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder={type === 'text' ? '오늘 훈련 어땠나요?' : '설명 (선택)'}
        className="w-full border border-ink-200 px-3 py-2.5 text-[14px] outline-none focus:border-ink resize-none"
      />

      {type === 'video' && (
        <input
          value={videoUrl}
          onChange={(e) => setVid(e.target.value)}
          placeholder="https://youtu.be/... 유튜브 주소"
          className="w-full mt-2 border border-ink-200 px-3 py-2 text-[13px] outline-none focus:border-ink"
        />
      )}

      {type === 'image' && (
        <div className="mt-2">
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt="" className="w-full max-h-64 object-cover bg-ink-200" />
              <button onClick={() => setImg('')}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-paper border border-ink flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full py-6 border border-dashed border-ink-200 hover:border-ink text-ink-400 text-[13px] transition-colors"
            >
              {uploading ? <span className="flex items-center justify-center gap-1.5"><Loader size={13} className="animate-spin" /> 올리는 중…</span> : '사진 선택 (5MB 이하)'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy || uploading}
        className="w-full mt-3 py-2.5 bg-lime hover:bg-lime-dark text-ink text-sm font-medium rounded-full pressable disabled:opacity-50"
      >
        {busy ? '올리는 중…' : '소식 올리기'}
      </button>
    </div>
  );
}
