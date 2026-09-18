/* 대나무 그림.
 *
 * 이모지(🎋)를 쓰지 않고 직접 그린다 — 이모지는 기기마다 모양이 달라서 단계가 올라가도
 * 자란 게 눈에 안 보이고, 크게 키우면 뭉개진다.
 *
 * 단계는 네 가지이고 마디 수·잎 수·키가 전부 달라진다. 자랄수록 초록(#2F7D32)에서
 * 라임(#D8FF3E)으로 물든다.
 *
 * 움직임은 CSS 키프레임이다. 잎마다 시작 시각을 어긋나게 줘서 한 몸처럼 같이
 * 흔들리지 않게 했다 — 같이 움직이면 그림이 아니라 이미지가 통째로 떨리는 것처럼 보인다.
 * prefers-reduced-motion이면 전부 멈춘다.
 */

const GREEN = '#2F7D32';
const LIME  = '#D8FF3E';

/** 단계별 생김새. 잎은 [줄기 위에서의 높이(0~1), 좌우(-1|1), 길이, 처짐] */
const SHAPES = {
  0: {                                   // 죽순 — 땅에서 갓 올라온 뾰족한 싹
    height: 0.30, joints: 0, width: 13, color: GREEN,
    leaves: [[0.82, -1, 20, 8], [0.92, 1, 16, 6]],
    shoot: true,
  },
  1: {                                   // 어린 대나무 — 줄기가 서고 마디가 하나
    height: 0.52, joints: 1, width: 12, color: '#3E9440',
    leaves: [[0.55, -1, 30, 10], [0.68, 1, 26, 8], [0.84, -1, 22, 7]],
  },
  2: {                                   // 마디 생김 — 마디 세 개, 잎이 풍성해진다
    height: 0.76, joints: 3, width: 11, color: '#67B53A',
    leaves: [[0.30, 1, 36, 12], [0.44, -1, 34, 11], [0.58, 1, 30, 10],
             [0.72, -1, 26, 8], [0.86, 1, 22, 7]],
  },
  3: {                                   // 다 자람 — 키가 꽉 차고 라임빛이 돈다
    height: 0.94, joints: 5, width: 11, color: LIME,
    leaves: [[0.14, -1, 42, 14], [0.26, 1, 40, 13], [0.38, -1, 38, 12],
             [0.50, 1, 34, 11], [0.62, -1, 32, 10], [0.74, 1, 28, 9],
             [0.86, -1, 24, 8]],
    glow: true,
  },
};

/** 잎 하나. 두 개의 곡선으로 만든 버들잎 모양이라 끝이 뾰족하다. */
function Leaf({ x, y, dir, len, droop, delay, sway, dur, id }) {
  const tipX = x + dir * len;
  const tipY = y + droop;
  const c1y  = y - len * 0.30;
  const c2y  = y + droop + len * 0.14;
  return (
    <g
      style={{
        transformOrigin: `${x}px ${y}px`,
        // 잎마다 흔들리는 각도·주기·시작이 달라야 한 몸처럼 떨리지 않는다
        '--sway': `${sway}deg`,
        animation: `bambooLeaf ${dur}s ease-in-out ${delay}s infinite`,
      }}
    >
      <path
        d={`M ${x} ${y}
            Q ${x + dir * len * 0.5} ${c1y} ${tipX} ${tipY}
            Q ${x + dir * len * 0.42} ${c2y} ${x} ${y} Z`}
        fill={`url(#${id})`}
      />
    </g>
  );
}

export default function BambooPlant({
  stage = 0,
  size = 260,       // 그림 높이(px). 폭은 60%로 잡는다.
  animate = true,
  drops = true,     // 물방울
  className = '',
}) {
  const s = SHAPES[Math.max(0, Math.min(3, stage))] ?? SHAPES[0];
  const uid = `bamboo${stage}`;          // 그라디언트 id — 단계별로만 다르면 충분하다

  const W = 200, H = 320;                 // viewBox 기준 좌표계
  const groundY = H - 26;
  const stemH   = (H - 70) * s.height;
  const topY    = groundY - stemH;
  const cx      = W / 2;

  // 마디 위치 — 아래에서 위로 고르게
  const joints = Array.from({ length: s.joints }, (_, i) =>
    groundY - (stemH * (i + 1)) / (s.joints + 1));

  return (
    <div className={className} style={{ width: size * 0.62, height: size }}>
      <style>{`
        @keyframes bambooLeaf {
          0%, 100% { transform: rotate(0deg) }
          50%      { transform: rotate(var(--sway, 5deg)) }
        }
        @keyframes bambooStem {
          0%, 100% { transform: rotate(-0.5deg) }
          50%      { transform: rotate(0.5deg) }
        }
        @keyframes bambooDrop {
          0%       { transform: translateY(-6px); opacity: 0 }
          18%      { opacity: .85 }
          70%      { opacity: .85 }
          100%     { transform: translateY(46px); opacity: 0 }
        }
        @keyframes bambooGlow {
          0%, 100% { opacity: .16 }
          50%      { opacity: .42 }
        }
        @media (prefers-reduced-motion: reduce) {
          .bamboo-svg * { animation: none !important }
        }
      `}</style>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="bamboo-svg"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
        role="img"
        aria-label={`대나무 ${stage + 1}단계`}
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor={s.color} />
            <stop offset="100%" stopColor={stage === 3 ? '#B8E62E' : '#245C26'} />
          </linearGradient>
          <linearGradient id={`${uid}stem`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%"   stopColor="#245C26" />
            <stop offset="100%" stopColor={s.color} />
          </linearGradient>
          <radialGradient id={`${uid}halo`}>
            <stop offset="0%"   stopColor={LIME} stopOpacity="0.9" />
            <stop offset="100%" stopColor={LIME} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 다 자라면 뒤에서 라임빛이 은은하게 번진다 */}
        {s.glow && (
          <circle
            cx={cx} cy={topY + stemH * 0.35} r={92}
            fill={`url(#${uid}halo)`}
            style={animate ? { animation: 'bambooGlow 2.8s ease-in-out infinite' } : { opacity: 0.22 }}
          />
        )}

        {/* 화분 흙 */}
        <ellipse cx={cx} cy={groundY + 4} rx={58} ry={11} fill="#E9E7DF" />
        <ellipse cx={cx} cy={groundY + 1} rx={44} ry={8}  fill="#D9D6CB" />

        {/* 줄기 + 잎 — 아래쪽을 축으로 아주 느리게 흔들린다 */}
        <g
          style={{
            transformOrigin: `${cx}px ${groundY}px`,
            ...(animate ? { animation: 'bambooStem 6s ease-in-out infinite' } : null),
          }}
        >
          {s.shoot ? (
            /* 죽순은 원통이 아니라 위가 뾰족한 껍질 모양이다 */
            <path
              d={`M ${cx - s.width} ${groundY}
                  Q ${cx - s.width * 0.9} ${topY + 16} ${cx} ${topY}
                  Q ${cx + s.width * 0.9} ${topY + 16} ${cx + s.width} ${groundY} Z`}
              fill={`url(#${uid}stem)`}
            />
          ) : (
            <>
              <rect
                x={cx - s.width / 2} y={topY}
                width={s.width} height={stemH}
                rx={s.width / 2}
                fill={`url(#${uid}stem)`}
              />
              {/* 마디 — 줄기를 가로지르는 도톰한 선 */}
              {joints.map((jy, i) => (
                <rect
                  key={i}
                  x={cx - s.width / 2 - 2} y={jy - 2.2}
                  width={s.width + 4} height={4.4} rx={2.2}
                  fill="#1E4A20" opacity="0.55"
                />
              ))}
            </>
          )}

          {s.leaves.map(([t, dir, len, droop], i) => (
            <Leaf
              key={i}
              id={uid}
              x={cx + (dir * s.width) / 2.2}
              y={groundY - stemH * (1 - t)}
              dir={dir} len={len} droop={droop}
              delay={animate ? i * 0.42 : 0}
              dur={animate ? 3.2 + (i % 3) * 0.6 : 0}
              sway={dir * (4 + (i % 3) * 2.5)}
            />
          ))}
        </g>

        {/* 물방울 — 잎끝에서 떨어지는 것처럼 보이게 시차를 준다 */}
        {drops && animate && [0, 1, 2].map((i) => (
          <ellipse
            key={i}
            cx={cx + [-30, 26, -12][i]}
            cy={topY + stemH * [0.30, 0.48, 0.66][i]}
            rx="3" ry="4.4"
            fill="#7FB8E8"
            style={{ animation: `bambooDrop 2.6s ease-in ${i * 0.85}s infinite` }}
          />
        ))}
      </svg>
    </div>
  );
}

export { SHAPES };
