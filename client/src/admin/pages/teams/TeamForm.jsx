import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { adminGet, adminPost, adminPut } from '../../adminApi.js';

const EMPTY = {
  name: '', slug: '', region: '', founded_year: '',
  logo_url: '', color_primary: '#111111', championships: '0',
};

function Field({ label, value, onChange, type = 'text', required, ...props }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-600 mb-1 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={onChange} required={required}
        className="w-full border border-ink-200 px-4 py-3 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
        {...props} />
    </div>
  );
}

export default function TeamForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = !!id;

  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!isEdit) return;
    adminGet(`/teams/${id}`).then((t) =>
      setForm({
        name:          t.name ?? '',
        slug:          t.slug ?? '',
        region:        t.region ?? '',
        founded_year:  String(t.founded_year ?? ''),
        logo_url:      t.logo_url ?? '',
        color_primary: t.color_primary ?? '#111111',
        championships: String(t.championships ?? '0'),
      })
    );
  }, [id, isEdit]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const autoSlug = () => {
    if (form.name) {
      const slug = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') || `team-${Date.now()}`;
      setForm((f) => ({ ...f, slug }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const body = { ...form, founded_year: Number(form.founded_year) || null, championships: Number(form.championships) || 0 };
      const res  = isEdit ? await adminPut(`/teams/${id}`, body) : await adminPost('/teams', body);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? '저장 실패'); return; }
      navigate('/admin/teams');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/admin/teams')}
          className="flex items-center gap-1 text-ink-400 hover:text-ink text-sm transition-colors">
          <ChevronLeft size={16} />목록으로
        </button>
        <h1 className="text-2xl font-bold text-ink tracking-[-0.03em]">{isEdit ? '팀 수정' : '새 팀 등록'}</h1>
      </div>

      <form onSubmit={handleSave}>
        <div className="border border-ink-200 p-6 mb-6">
          <h2 className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-5 pb-2 border-b border-ink-200">팀 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="팀명" value={form.name} onChange={set('name')} placeholder="경찰청" required />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 mb-1 block">
                슬러그<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="flex gap-2">
                <input value={form.slug} onChange={set('slug')} required placeholder="gyeongchalcheong"
                  className="flex-1 border border-ink-200 px-4 py-3 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors font-mono" />
                <button type="button" onClick={autoSlug}
                  className="px-3 py-3 border border-ink-200 text-ink-600 text-xs hover:border-ink hover:text-ink transition-colors">
                  자동
                </button>
              </div>
            </div>
            <Field label="지역"     value={form.region}       onChange={set('region')}       placeholder="서울" />
            <Field label="창단년도" value={form.founded_year} onChange={set('founded_year')} type="number" placeholder="1946" />
            <Field label="우승 횟수" value={form.championships} onChange={set('championships')} type="number" placeholder="0" />
            <Field label="로고 URL" value={form.logo_url}     onChange={set('logo_url')}     placeholder="https://..." />
            <div className="col-span-2">
              <label className="text-xs font-medium text-ink-600 mb-2 block">메인 컬러</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color_primary} onChange={set('color_primary')}
                  className="w-12 h-10 rounded-lg border border-ink-200 cursor-pointer p-0.5" />
                <span className="text-sm text-ink-600 font-mono">{form.color_primary}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                     style={{ background: form.color_primary }}>
                  {form.name[0] ?? '팀'}
                </div>
                <span className="text-xs text-ink-400">미리보기</span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-ink text-white px-6 py-3 rounded-full
                     text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">
          <Save size={16} />
          {saving ? '저장 중...' : isEdit ? '수정 저장' : '팀 등록'}
        </button>
      </form>
    </div>
  );
}
