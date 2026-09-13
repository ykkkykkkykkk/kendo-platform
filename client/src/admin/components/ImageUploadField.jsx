import { useRef, useState } from 'react';
import { Loader, Upload, X } from 'lucide-react';

/**
 * 어드민 사진 한 칸 — 올리면 바로 미리보기까지 보여준다.
 *
 * 선수 사진은 비율이 중요하다(히어로는 세로 4:5, 맨얼굴은 정사각).
 * 올린 뒤 어떻게 잘리는지 여기서 미리 보여주지 않으면, 실제 화면에서
 * 얼굴이 잘려 나간 걸 뒤늦게 발견하게 된다.
 *
 * 주소를 직접 붙여 넣는 길도 남겨 둔다 — 예전에 올려둔 사진을 그대로 쓸 때가 있다.
 */

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function ImageUploadField({ label, hint, value, onChange, ratio = '1 / 1', width = 120 }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('이미지 파일만 올릴 수 있습니다.'); return; }
    if (file.size > 10 * 1024 * 1024)    { setErr('10MB 이하만 올릴 수 있습니다.'); return; }

    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      fd.append('folder', 'kendo-players');
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST', body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? '업로드 실패');
      onChange(data.secure_url);
    } catch (e2) {
      setErr(e2.message ?? '업로드에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="text-xs font-medium text-ink-600 mb-1 block">{label}</label>
      <div className="flex gap-3">
        {/* 미리보기 — 실제 화면과 같은 비율로 자른 모습 */}
        <div
          className="flex-none bg-ink-200/40 border border-ink-200 overflow-hidden flex items-center justify-center"
          style={{ width, aspectRatio: ratio }}
        >
          {value
            ? <img src={value} alt="" className="w-full h-full object-cover" />
            : <span className="text-[10px] text-ink-400">미리보기</span>}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... (직접 붙여넣기도 됩니다)"
            className="w-full border border-ink-200 px-3 py-2 text-sm text-ink
                       placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-ink text-white text-xs
                         font-medium rounded-full disabled:opacity-50"
            >
              {busy ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
              {busy ? '올리는 중…' : '사진 올리기'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1 px-3 py-2 border border-ink-200
                           text-ink-600 text-xs font-medium rounded-full hover:border-ink"
              >
                <X size={12} /> 지우기
              </button>
            )}
          </div>
          {hint && <p className="text-[11px] text-ink-400">{hint}</p>}
          {err  && <p className="text-[11px] text-red-600">{err}</p>}
          <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="sr-only" />
        </div>
      </div>
    </div>
  );
}
