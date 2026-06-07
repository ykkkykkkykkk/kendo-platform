import { useState } from 'react';
import { Camera, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function ProfilePhotoUpload({ onSuccess }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('이미지 파일만 가능합니다.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024)    { showToast('5MB 이하만 가능합니다.', 'error'); return; }

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
      showToast(err.message || '업로드 오류', 'error');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  if (!CLOUD_NAME || !UPLOAD_PRESET) return null;

  return (
    <div className="relative inline-flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full text-orange-400 text-xs font-semibold">
      {loading
        ? <><Loader size={12} className="animate-spin" />업로드 중...</>
        : <><Camera size={12} />사진 변경</>
      }
      {/* opacity-0은 일부 모바일에서 터치 차단 → 0.001 사용 */}
      {!loading && (
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.001,
            cursor: 'pointer',
            zIndex: 10,
            fontSize: '100px',
          }}
        />
      )}
    </div>
  );
}
