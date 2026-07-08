import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { adminGet, adminPost, adminPut } from '../../adminApi.js';

const EMPTY = {
  player_id: '', title: '', description: '', scheduled_at: '',
  venue: '', capacity: '', remaining_slots: '', price_krw: '', status: '모집중',
};

export default function ClinicForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = !!id;

  const [form,    setForm]    = useState(EMPTY);
  const [players, setPlayers] = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    adminGet('/players').then(setPlayers).catch(console.error);
    if (!isEdit) return;
    adminGet(`/clinics/${id}`).then((c) =>
      setForm({
        player_id:      String(c.player_id ?? ''),
        title:          c.title ?? '',
        description:    c.description ?? '',
        scheduled_at:   c.scheduled_at?.slice(0, 16) ?? '',
        venue:          c.venue ?? '',
        capacity:       String(c.capacity ?? ''),
        remaining_slots: String(c.remaining_slots ?? ''),
        price_krw:      String(c.price_krw ?? ''),
        status:         c.status ?? '모집중',
      })
    );
  }, [id, isEdit]);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: v };
      // 정원 변경시 신규 등록이면 잔여도 동기화
      if (k === 'capacity' && !isEdit) next.remaining_slots = v;
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const body = {
        ...form,
        player_id:       Number(form.player_id),
        capacity:        form.capacity !== '' ? Number(form.capacity) : null,
        remaining_slots: form.remaining_slots !== '' ? Number(form.remaining_slots) : null,
        price_krw:       form.price_krw !== '' ? Number(form.price_krw) : null,
        scheduled_at:    form.scheduled_at || null,
      };
      const res  = isEdit ? await adminPut(`/clinics/${id}`, body) : await adminPost('/clinics', body);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? '저장 실패'); return; }
      navigate('/admin/clinics');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const Field = ({ label, name, type = 'text', ...props }) => (
    <div>
      <label className="text-xs font-medium text-ink-600 mb-1 block">{label}</label>
      <input type={type} value={form[name]} onChange={set(name)}
        className="w-full border border-ink-200 px-4 py-3 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
        {...props} />
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/admin/clinics')}
          className="flex items-center gap-1 text-ink-400 hover:text-ink text-sm transition-colors">
          <ChevronLeft size={16} />목록으로
        </button>
        <h1 className="text-2xl font-bold text-ink tracking-[-0.03em]">{isEdit ? '클리닉 수정' : '새 클리닉 등록'}</h1>
      </div>

      <form onSubmit={handleSave}>
        <div className="border border-ink-200 p-6 mb-6">
          <h2 className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-5 pb-2 border-b border-ink-200">기본 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-ink-600 mb-1 block">
                강사 선수<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select value={form.player_id} onChange={set('player_id')} required
                className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors">
                <option value="">선수 선택</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.team_name})</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Field label="제목 *" name="title" placeholder="머리치기 완성 클래스" required />
            </div>
            <Field label="일시" name="scheduled_at" type="datetime-local" />
            <Field label="장소" name="venue" placeholder="강남검우관" />
            <Field label="정원" name="capacity" type="number" placeholder="8" />
            <Field label="잔여 자리" name="remaining_slots" type="number" placeholder="정원과 동일하게 자동" />
            <Field label="가격 (원)" name="price_krw" type="number" placeholder="70000" />
            <div>
              <label className="text-xs font-medium text-ink-600 mb-1 block">상태</label>
              <select value={form.status} onChange={set('status')}
                className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors">
                {['모집중','마감','종료'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-ink-600 mb-1 block">설명</label>
              <textarea value={form.description} onChange={set('description')} rows={3}
                placeholder="클리닉 소개 및 내용..."
                className="w-full border border-ink-200 px-4 py-3 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors resize-none" />
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-ink text-white px-6 py-3 rounded-full
                     text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">
          <Save size={16} />
          {saving ? '저장 중...' : isEdit ? '수정 저장' : '클리닉 등록'}
        </button>
      </form>
    </div>
  );
}
