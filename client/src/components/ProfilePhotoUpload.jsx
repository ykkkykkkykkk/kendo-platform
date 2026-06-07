import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader, X, ImagePlus } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function ProfilePhotoUpload({ onSuccess }) {
  const { showToast } = useToast();
  const [open,    setOpen]    = useState(false);
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
      setOpen(false);
    } catch (err) {
      showToast(err.message || '업로드 오류', 'error');
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  if (!CLOUD_NAME || !UPLOAD_PRESET) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 border border-orange-500/30
                   rounded-full text-orange-400 text-xs font-semibold"
      >
        <Camera size={12} /> 사진 변경
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !loading && setOpen(false)}
          >
            <div className="absolute inset-0 bg-black/70" />
            <motion.div
              className="relative w-full max-w-mobile bg-[#111] rounded-t-2xl border-t border-white/10 p-6"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold text-base">프로필 사진 변경</h3>
                <button onClick={() => setOpen(false)} className="text-white/40">
                  <X size={18} />
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader size={32} className="text-orange-500 animate-spin" />
                  <p className="text-white/50 text-sm">업로드 중...</p>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full py-10 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer active:bg-white/5 transition-colors">
                  <ImagePlus size={40} className="text-orange-500 mb-3" />
                  <p className="text-white font-semibold text-sm">사진을 선택하세요</p>
                  <p className="text-white/30 text-xs mt-1">JPG, PNG, HEIF · 최대 5MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="sr-only"
                  />
                </label>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
