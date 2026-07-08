import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { adminGet, adminPost, adminPut } from '../../adminApi.js';

const CLAIM_CONDITIONS = ['우승자맞추기', '4강맞추기', '전체적중'];

const EMPTY = {
  tournament_id: '', sponsor_name: '', sponsor_logo: '',
  reward_name: '', reward_image: '', reward_value_krw: '',
  reward_quantity: '', claim_condition: '우승자맞추기',
};

export default function SponsorshipForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = !!id;

  const [form,         setForm]         = useState(EMPTY);
  const [tournaments,  setTournaments]  = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    adminGet('/tournaments').then(setTournaments).catch(console.error);
    if (!isEdit) return;
    adminGet(`/sponsorships`).then((list) => {
      const s = list.find((x) => String(x.id) === id);
      if (s) setForm({
        tournament_id:    String(s.tournament_id ?? ''),
        sponsor_name:     s.sponsor_name ?? '',
        sponsor_logo:     s.sponsor_logo ?? '',
        reward_name:      s.reward_name ?? '',
        reward_image:     s.reward_image ?? '',
        reward_value_krw: String(s.reward_value_krw ?? ''),
        reward_quantity:  String(s.reward_quantity ?? ''),
        claim_condition:  s.claim_condition ?? '우승자맞추기',
      });
    });
  }, [id, isEdit]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const body = {
        ...form,
        tournament_id:    Number(form.tournament_id),
        reward_value_krw: form.reward_value_krw !== '' ? Number(form.reward_value_krw) : null,
        reward_quantity:  form.reward_quantity  !== '' ? Number(form.reward_quantity)  : null,
      };
      const res  = isEdit ? await adminPut(`/sponsorships/${id}`, body) : await adminPost('/sponsorships', body);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? '저장 실패'); return; }
      navigate('/admin/sponsorships');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const Field = ({ label, name, type = 'text', required, ...props }) => (
    <div>
      <label className="text-xs font-medium text-ink-600 mb-1 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={form[name]} onChange={set(name)} required={required}
        className="w-full border border-ink-200 px-4 py-3 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
        {...props} />
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/admin/sponsorships')}
          className="flex items-center gap-1 text-ink-400 hover:text-ink text-sm transition-colors">
          <ChevronLeft size={16} />목록으로
        </button>
        <h1 className="text-2xl font-bold text-ink tracking-[-0.03em]">{isEdit ? '스폰서십 수정' : '새 스폰서십 등록'}</h1>
      </div>

      <form onSubmit={handleSave}>
        <div className="border border-ink-200 p-6 mb-4">
          <h2 className="font-semibold text-ink mb-5 pb-2 border-b border-ink-200">스폰서 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-ink-600 mb-1 block">
                대상 대회<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select value={form.tournament_id} onChange={set('tournament_id')} required
                className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors">
                <option value="">대회 선택</option>
                {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <Field label="스폰서명" name="sponsor_name" placeholder="동심죽도" required />
            <Field label="스폰서 로고 URL" name="sponsor_logo" placeholder="https://..." />
          </div>
        </div>

        <div className="border border-ink-200 p-6 mb-6">
          <h2 className="font-semibold text-ink mb-5 pb-2 border-b border-ink-200">상품 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="상품명" name="reward_name" placeholder="동심 38 진검형 죽도" required />
            </div>
            <Field label="상품 이미지 URL" name="reward_image" placeholder="https://..." />
            <Field label="상품 가치 (원)" name="reward_value_krw" type="number" placeholder="147000" />
            <Field label="수량"            name="reward_quantity"  type="number" placeholder="3" />
            <div>
              <label className="text-xs font-medium text-ink-600 mb-1 block">당첨 조건</label>
              <select value={form.claim_condition} onChange={set('claim_condition')}
                className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors">
                {CLAIM_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-ink text-white px-6 py-3 rounded-full
                     text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">
          <Save size={16} />
          {saving ? '저장 중...' : isEdit ? '수정 저장' : '스폰서십 등록'}
        </button>
      </form>
    </div>
  );
}
