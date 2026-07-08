import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Save } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '../../adminApi.js';

const POSITIONS  = ['선봉', '이봉', '중견', '부장', '대장'];
const CATEGORIES = ['죽도', '호구', '도복', '하카마', '기타'];

const EMPTY_FORM = {
  name: '', name_en: '', slug: '', team_id: '',
  dan_grade: '', birth_year: '', height_cm: '', position: '',
  bio: '', instagram_url: '', youtube_url: '', profile_image_url: '',
};

const EMPTY_GEAR = {
  category: '죽도', brand: '', model_name: '', price_krw: '',
  product_url: '', image_url: '', display_order: 0,
};

function Field({ label, value, onChange, type = 'text', ...props }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-600 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full border border-ink-200 px-4 py-3 text-sm text-ink
                   placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
        {...props}
      />
    </div>
  );
}

export default function PlayerForm() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const isEdit    = !!id;

  const [form,    setForm]    = useState(EMPTY_FORM);
  const [teams,   setTeams]   = useState([]);
  const [gear,    setGear]    = useState([]);
  const [newGear, setNewGear] = useState(null);   // null = 숨김, {} = 입력 중
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  // 팀 목록 로드
  useEffect(() => {
    adminGet('/teams').then(setTeams).catch(console.error);
  }, []);

  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (!isEdit) return;
    adminGet(`/players?`).then((players) => {
      const p = players.find((x) => String(x.id) === id);
      if (p) {
        setForm({
          name:              p.name ?? '',
          name_en:           p.name_en ?? '',
          slug:              p.slug ?? '',
          team_id:           String(p.team_id ?? ''),
          dan_grade:         String(p.dan_grade ?? ''),
          birth_year:        String(p.birth_year ?? ''),
          height_cm:         String(p.height_cm ?? ''),
          position:          p.position ?? '',
          bio:               p.bio ?? '',
          instagram_url:     p.instagram_url ?? '',
          youtube_url:       p.youtube_url ?? '',
          profile_image_url: p.profile_image_url ?? '',
        });
      }
    });
    adminGet(`/players/${id}/gear`).then(setGear).catch(console.error);
  }, [id, isEdit]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // 슬러그 자동 생성 (영문명 기반)
  const autoSlug = () => {
    if (form.name_en) {
      setForm((f) => ({
        ...f,
        slug: form.name_en.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      }));
    }
  };

  // 선수 저장
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        team_id:    Number(form.team_id)    || null,
        dan_grade:  Number(form.dan_grade)  || null,
        birth_year: Number(form.birth_year) || null,
        height_cm:  Number(form.height_cm)  || null,
      };
      const res = isEdit
        ? await adminPut(`/players/${id}`, body)
        : await adminPost('/players', body);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? '저장 실패'); return; }
      navigate('/admin/players');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // 장비 추가
  const handleAddGear = async () => {
    if (!newGear?.model_name?.trim() || !newGear?.category) {
      alert('카테고리와 모델명은 필수입니다.');
      return;
    }
    const res  = await adminPost(`/players/${id}/gear`, {
      ...newGear,
      price_krw:     Number(newGear.price_krw) || null,
      display_order: Number(newGear.display_order) || 0,
    });
    const data = await res.json();
    if (res.ok) {
      setGear((g) => [...g, data]);
      setNewGear(null);
    } else {
      alert(data.error ?? '장비 추가 실패');
    }
  };

  // 장비 삭제
  const handleDeleteGear = async (gearId) => {
    if (!window.confirm('이 장비를 삭제하시겠습니까?')) return;
    const res = await adminDelete(`/gear/${gearId}`);
    if (res.ok) setGear((g) => g.filter((x) => x.id !== gearId));
  };

  return (
    <div className="p-8 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/players')}
          className="flex items-center gap-1 text-ink-400 hover:text-ink text-sm mb-3 transition-colors"
        >
          <ChevronLeft size={16} />
          목록으로
        </button>
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">
          {isEdit ? 'EDIT PLAYER' : 'NEW PLAYER'}
        </p>
        <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">
          {isEdit ? '선수 수정' : '새 선수 등록'}
        </h1>
      </div>

      <form onSubmit={handleSave}>
        {/* ── 기본 정보 ── */}
        <div className="border border-ink-200 p-6 mb-6">
          <h2 className="font-semibold text-ink-600 mb-5 pb-2 border-b border-ink-200">기본 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="이름 *"      value={form.name}    onChange={set('name')}    placeholder="김정환" required />
            <Field label="영문명"       value={form.name_en} onChange={set('name_en')} placeholder="Kim Jeong-hwan" />
            <div>
              <label className="text-xs font-medium text-ink-600 mb-1 block">슬러그 *</label>
              <div className="flex gap-2">
                <input
                  value={form.slug}
                  onChange={set('slug')}
                  placeholder="kim-jeonghwan"
                  required
                  className="flex-1 border border-ink-200 px-4 py-3 text-sm text-ink
                             placeholder:text-ink-400/60 focus:outline-none focus:border-ink font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={autoSlug}
                  className="px-4 py-3 border border-ink-200 text-ink-600 text-xs hover:border-ink transition-colors"
                >
                  자동생성
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 mb-1 block">소속 팀 *</label>
              <select
                value={form.team_id}
                onChange={set('team_id')}
                required
                className="w-full border border-ink-200 px-4 py-3 text-sm text-ink
                           focus:outline-none focus:border-ink transition-colors"
              >
                <option value="">팀 선택</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 mb-1 block">단증</label>
              <select
                value={form.dan_grade}
                onChange={set('dan_grade')}
                className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors"
              >
                <option value="">선택</option>
                {[4,5,6,7,8,9].map((d) => <option key={d} value={d}>{d}단</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-600 mb-1 block">포지션</label>
              <select
                value={form.position}
                onChange={set('position')}
                className="w-full border border-ink-200 px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink transition-colors"
              >
                <option value="">선택</option>
                {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Field label="출생연도"   value={form.birth_year} onChange={set('birth_year')} type="number" placeholder="1990" />
            <Field label="신장 (cm)"  value={form.height_cm}  onChange={set('height_cm')}  type="number" placeholder="178" />
          </div>
        </div>

        {/* ── SNS / 프로필 ── */}
        <div className="border border-ink-200 p-6 mb-6">
          <h2 className="font-semibold text-ink-600 mb-5 pb-2 border-b border-ink-200">SNS / 미디어</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="인스타그램 URL"    value={form.instagram_url}     onChange={set('instagram_url')}     placeholder="https://instagram.com/..." />
            <Field label="유튜브 URL"        value={form.youtube_url}       onChange={set('youtube_url')}       placeholder="https://youtube.com/..." />
            <div className="col-span-2">
              <Field label="프로필 이미지 URL" value={form.profile_image_url} onChange={set('profile_image_url')} placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* ── Bio ── */}
        <div className="border border-ink-200 p-6 mb-6">
          <h2 className="font-semibold text-ink-600 mb-5 pb-2 border-b border-ink-200">선수 소개 (Bio)</h2>
          <textarea
            value={form.bio}
            onChange={set('bio')}
            rows={4}
            placeholder="2-3문장으로 선수를 소개하세요..."
            className="w-full border border-ink-200 px-4 py-3 text-sm text-ink
                       placeholder:text-ink-400/60 focus:outline-none focus:border-ink resize-none transition-colors"
          />
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-ink text-white px-6 py-3
                     rounded-full text-sm font-medium hover:bg-ink/90
                     disabled:opacity-50 transition-colors mb-8"
        >
          <Save size={16} />
          {saving ? '저장 중...' : isEdit ? '수정 저장' : '선수 등록'}
        </button>
      </form>

      {/* ── My Gear 관리 (수정 모드만) ── */}
      {isEdit && (
        <div className="border border-ink-200 p-6">
          <div className="flex items-center justify-between mb-5 pb-2 border-b border-ink-200">
            <h2 className="font-semibold text-ink-600">My Gear 관리</h2>
            {!newGear && (
              <button
                onClick={() => setNewGear({ ...EMPTY_GEAR })}
                className="flex items-center gap-1.5 text-xs bg-ink text-white px-3 py-2 rounded-full hover:bg-ink/90 transition-colors"
              >
                <Plus size={13} />
                장비 추가
              </button>
            )}
          </div>

          {/* 기존 장비 목록 */}
          {gear.length > 0 ? (
            <table className="w-full text-sm mb-4">
              <thead>
                <tr style={{ borderBottom: '1.5px solid #111111' }}>
                  {['카테고리','브랜드','모델명','가격','순서',''].map((h) => (
                    <th key={h} className="py-2 pr-4 text-left text-[10px] font-medium text-ink-400 uppercase tracking-[0.15em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gear.map((g) => (
                  <tr key={g.id} className="border-b border-ink-200 last:border-0">
                    <td className="py-2 pr-4 text-ink-600">{g.category}</td>
                    <td className="py-2 pr-4 text-ink-600">{g.brand ?? '—'}</td>
                    <td className="py-2 pr-4 font-medium text-ink">{g.model_name}</td>
                    <td className="py-2 pr-4 text-ink-600 tabular-nums">
                      {g.price_krw ? `${g.price_krw.toLocaleString()}원` : '—'}
                    </td>
                    <td className="py-2 pr-4 text-ink-400 tabular-nums">{g.display_order}</td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDeleteGear(g.id)}
                        className="text-red-600 hover:text-red-700 p-1 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-ink-400 text-sm mb-4">등록된 장비 없음</p>
          )}

          {/* 새 장비 입력 폼 */}
          {newGear && (
            <div className="border border-dashed border-ink-200 p-4">
              <p className="text-xs font-medium text-ink-600 mb-3">새 장비</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1 block">카테고리</label>
                  <select
                    value={newGear.category}
                    onChange={(e) => setNewGear((g) => ({ ...g, category: e.target.value }))}
                    className="w-full border border-ink-200 px-2.5 py-2 text-sm text-ink focus:outline-none focus:border-ink transition-colors"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1 block">브랜드</label>
                  <input
                    value={newGear.brand}
                    onChange={(e) => setNewGear((g) => ({ ...g, brand: e.target.value }))}
                    placeholder="동심, 청람..."
                    className="w-full border border-ink-200 px-2.5 py-2 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1 block">모델명 *</label>
                  <input
                    value={newGear.model_name}
                    onChange={(e) => setNewGear((g) => ({ ...g, model_name: e.target.value }))}
                    placeholder="39 탄소죽도 프로"
                    className="w-full border border-ink-200 px-2.5 py-2 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1 block">가격 (원)</label>
                  <input
                    type="number"
                    value={newGear.price_krw}
                    onChange={(e) => setNewGear((g) => ({ ...g, price_krw: e.target.value }))}
                    placeholder="85000"
                    className="w-full border border-ink-200 px-2.5 py-2 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1 block">상품 URL</label>
                  <input
                    value={newGear.product_url}
                    onChange={(e) => setNewGear((g) => ({ ...g, product_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-ink-200 px-2.5 py-2 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1 block">표시 순서</label>
                  <input
                    type="number"
                    value={newGear.display_order}
                    onChange={(e) => setNewGear((g) => ({ ...g, display_order: e.target.value }))}
                    className="w-full border border-ink-200 px-2.5 py-2 text-sm text-ink focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddGear}
                  className="bg-ink text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-ink/90 transition-colors"
                >
                  추가
                </button>
                <button
                  onClick={() => setNewGear(null)}
                  className="text-ink border border-ink-200 hover:border-ink px-4 py-2 rounded-full text-xs transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
