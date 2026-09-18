/* 홈의 대나무 카드(미니 버전).
 *
 * 대회가 없을 때는 이게 홈의 주인공이라 그림을 키운다(big). 대회가 있을 때는
 * 픽 카드가 먼저이므로 한 줄짜리로 줄여서 자리만 지킨다.
 *
 * 카드 전체가 버튼이다 — 작은 글씨를 정확히 눌러야 넘어가면 폰에서 잘 안 눌린다.
 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Droplets } from 'lucide-react';
import BambooPlant from './BambooPlant.jsx';
import { useBamboo } from '../context/BambooContext.jsx';

const LIME = '#D8FF3E';

export default function BambooCard({ big = false }) {
  const navigate = useNavigate();
  const { data, enabled } = useBamboo();

  // 선수 계정이거나 아직 못 불러왔으면 자리를 만들지 않는다
  if (!enabled || !data) return null;

  const pct       = Math.min(100, Math.round((data.water / data.goal) * 100));
  const remaining = data.today?.remaining ?? 0;
  const notStarted = !data.started && data.water === 0;

  return (
    <button
      onClick={() => navigate('/bamboo')}
      className="w-full text-left bg-paper border border-ink-200 hover:border-ink transition-colors pressable"
      style={{ borderRadius: 0 }}
    >
      <div className={`flex items-center gap-4 ${big ? 'p-5' : 'p-4'}`}>
        {/* 대나무 — 공백기에는 크게 */}
        <div className="flex-none">
          <BambooPlant stage={data.stage} size={big ? 132 : 82} drops={big} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">
              {notStarted ? 'GROW' : data.stage_name.toUpperCase?.() ?? 'GROW'}
            </p>
            <ChevronRight size={14} className="text-ink-400 flex-none" />
          </div>

          {notStarted ? (
            <>
              <p className={`text-ink font-bold mt-1 ${big ? '' : 'text-sm'}`}
                 style={big ? { fontSize: 17 } : undefined}>
                대나무를 키워 죽도를 받아보세요
              </p>
              <p className="text-[11px] text-ink-400 mt-1">
                출석·픽·응원으로 물을 모으면 자랍니다
              </p>
              <span className="inline-block mt-2.5 px-3 py-1.5 text-[11px] font-bold text-ink"
                    style={{ background: LIME }}>
                시작하기
              </span>
            </>
          ) : (
            <>
              <p className="text-ink font-bold mt-1 tabular-nums"
                 style={{ fontSize: big ? 19 : 16 }}>
                물 {data.water} <span className="text-ink-400 font-medium">/ {data.goal}</span>
              </p>

              <div className="h-2 bg-ink-200 rounded-full overflow-hidden mt-2">
                <div className="h-full rounded-full transition-[width] duration-700"
                     style={{ width: `${pct}%`, background: LIME }} />
              </div>

              <p className="flex items-center gap-1 text-[11px] mt-2">
                {remaining > 0 ? (
                  <>
                    <Droplets size={11} style={{ color: '#5AA7E0' }} />
                    <span className="text-ink-600">
                      오늘 받을 물 <b className="text-ink">{remaining}개</b> 남았어요
                    </span>
                  </>
                ) : (
                  <span className="text-ink-400">오늘 물주기 완료 🎋</span>
                )}
              </p>

              {big && data.water >= data.goal && (
                <span className="inline-block mt-2.5 px-3 py-1.5 text-[11px] font-bold text-ink"
                      style={{ background: LIME }}>
                  죽도 신청할 수 있어요
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
}
