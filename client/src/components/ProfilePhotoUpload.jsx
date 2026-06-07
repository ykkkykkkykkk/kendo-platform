import { useState } from 'react';
import { Camera, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function ProfilePhotoUpload({ onSuccess, currentUrl }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const inputId = 'profile-photo-input';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('이미지 파일만 업로드 가능합니다.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024)    { showToast('5MB 이하 파일만 가능합니다.', 'error'); return; }

    setLoading(true);
    try {
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

      const saveRes = await fetch('/api/players/my/photo', {
        method:  'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${localStorage.getItem('kendo_token')}`,
        },
        body: JSON.stringify({ profile_image_url: data.secure_url }),
      });
      if (!saveRes.ok) throw new Error((await saveRes.json()).error);

      showToast('프로필 사진이 변경됐습니다!', 'success');
      onSuccess?.(data.secure_url);
    } catch (err) {
      showToast(err.message || '업로드 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return (
      <div className="text-white/30 text-[10px] px-2 py-1">
        Cloudinary 미설정
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-black/60 border border-white/20
                  rounded-full text-white text-xs font-semibold backdrop-blur-sm cursor-pointer
                  hover:border-orange-500/50 hover:text-orange-400 transition-all
                  ${loading ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={loading}
      />
      {loading
        ? <><Loader size={12} className="animate-spin" /> 업로드 중...</>
        : <><Camera size={12} /> 사진 변경</>
      }
    </label>
  );
}
