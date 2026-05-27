import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { adminGet, adminPost, adminPut } from '../../adminApi.js';

const EMPTY = {
  name: '', slug: '', start_date: '', end_date: '',
  venue: '', host_organization: '', tournament_type: '개인전',
  poster_image_url: '', status: '예정',
};

export default function TournamentForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = !!id;

  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!isEdit) return;
    adminGet(`/tournaments/${id}`).then((t) => {
      setForm({
        name:             t.name ?? '',
        slug:             t.slug ?? '',
        start_date:       t.start_date ?? '',
        end_date:         t.end_date ?? '',
        venue:            t.venue ?? '',
        host_organization: t.host_organization ?? '',
        tournament_type:  t.tournament_type ?? '개인전',
        poster_image_url: t.poster_image_url ?? '',
        status:           t.status ?? '예정',
      });
    });
  }, [id, isEdit]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const autoSlug = () => {
    if (form.name) {
      const slug = form.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-가-힣]/g, '')
        .replace(/[가-힣]+/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        || `tournament-${Date.now()}`;
      setForm((f) => ({ ...f, slug }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = isEdit
        ? await adminPut(`/tournaments/${id}`, form)
        : await adminPost('/tournaments', form);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? '저장 실패'); return; }
      // 새 대회 등록 시 → 대진표 관리로 이동
      navigate(isEdit
        ? '/admin/tournaments'
        : `/admin/tournaments/${data.id}/matches`
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, name, type = 'text', required, ...props }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[name]}
        onChange={set(name)}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                   focus:outline-none focus:border-slate-400 transition-colors"
        {...props}
      />
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/admin/tournaments')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"
        >
          <ChevronLeft size={16} />목록으로
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? '대회 수정' : '새 대회 등록'}
        </h1>
      </div>

      <form onSubmit={handleSave}>
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-5 pb-2 border-b border-gray-100">기본 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="대회명" name="name" placeholder="2026 전국검도선수권대회" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                슬러그<span className="text-red-400 ml-0.5">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={form.slug}
                  onChange={set('slug')}
                  required
                  placeholder="2026-national-championship"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                             focus:outline-none focus:border-slate-400 font-mono"
                />
                <button type="button" onClick={autoSlug}
                  className="px-3 py-2.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">
                  자동생성
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">종목</label>
              <select value={form.tournament_type} onChange={set('tournament_type')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-slate-400">
                {['개인전','단체전','혼합'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <Field label="시작일" name="start_date" type="date" />
            <Field label="종료일" name="end_date"   type="date" />
            <Field label="장소"   name="venue"       placeholder="충무체육관 (창원)" />
            <Field label="주최"   name="host_organization" placeholder="대한검도회" />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">상태</label>
              <select value={form.status} onChange={set('status')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-slate-400">
                {['예정','진행','종료'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <Field label="포스터 이미지 URL" name="poster_image_url" placeholder="https://..." />
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          type="submit" disabled={saving}
          className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3
                     rounded-xl text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <Save size={16} />
          {saving ? '저장 중...' : isEdit ? '수정 저장' : '등록하고 대진표 설정 →'}
        </button>
      </form>
    </div>
  );
}
