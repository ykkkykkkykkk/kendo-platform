import { useState, useRef } from 'react';
import { Camera, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const CLOUD_NAME     = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET  = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function ProfilePhotoUpload({ onSuccess, currentUrl }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(currentUrl ?? null);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/'))  { showToast('이미지 파일만 업로드 가능합니다.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024)     { showToast('5MB 이하 파일만 가능합니다.', 'error'); return; }

    // 미리보기
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setLoading(true);
    try {
      // Cloudinary 업로드
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'kendo-players');

      const res  = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || '업로드 실패');

      const url = data.secure_url;

      // 서버에 URL 저장
      const saveRes = await fetch('/api/players/my/photo', {
        method:  'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${localStorage.getItem('kendo_token')}`,
        },
        body: JSON.stringify({ profile_image_url: url }),
      });
      if (!saveRes.ok) throw new Error((await saveRes.json()).error);

      setPreview(url);
      showToast('프로필 사진이 변경됐습니다!', 'success');
      onSuccess?.(url);
    } catch (err) {
      showToast(err.message || '업로드 중 오류가 발생했습니다.', 'error');
      setPreview(currentUrl ?? null);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return (
      <div className="text-white/30 text-xs text-center py-2">
        Cloudinary 설정이 필요합니다
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 border border-white/20
                   rounded-full text-white text-xs font-semibold backdrop-blur-sm
                   hover:border-orange-500/50 hover:text-orange-400 transition-all disabled:opacity-50"
      >
        {loading
          ? <><Loader size={12} className="animate-spin" /> 업로드 중...</>
          : <><Camera size={12} /> 사진 변경</>
        }
      </button>
    </div>
  );
}
