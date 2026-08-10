import { useNavigate } from 'react-router-dom';

/**
 * 계정·데이터 삭제 안내 (/data-deletion).
 *
 * 구글 플레이 데이터 보안 항목이 '삭제 요청 링크'를 따로 요구한다.
 * 심사자가 이 주소를 직접 열어 아래 세 가지를 확인하므로 눈에 띄게 적는다.
 *   ① 앱·개발자 이름  ② 삭제 절차  ③ 삭제/보관되는 데이터와 보관 기간
 */
const CONTACT = 'ukill4444@gmail.com';

function Step({ n, title, children }) {
  return (
    <div className="flex gap-3 py-3" style={{ borderTop: '1px solid #E5E5E5' }}>
      <span className="flex-none w-6 h-6 rounded-full bg-ink text-white text-[12px] font-bold
                       flex items-center justify-center">{n}</span>
      <div className="min-w-0">
        <p className="text-ink font-semibold text-[14px]">{title}</p>
        <p className="text-ink-600 text-[13px] leading-[1.7] mt-0.5">{children}</p>
      </div>
    </div>
  );
}

export default function DataDeletionPage() {
  const navigate = useNavigate();

  return (
    <main className="page-body bg-paper min-h-screen px-5 pt-12 pb-20">
      <button onClick={() => navigate(-1)} className="text-ink-400 text-sm mb-4 pressable">← 뒤로</button>

      <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">DATA DELETION</p>
      <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] leading-tight mt-1">
        계정 및 데이터 삭제
      </h1>
      <p className="text-ink-600 text-[13px] leading-[1.7] mt-3">
        <strong className="text-ink">마이너스타</strong>(minorstar.kr) 이용자는 언제든지
        계정과 데이터를 스스로 지울 수 있습니다. 별도 승인이나 대기 없이 즉시 처리됩니다.
      </p>

      {/* ── 계정 전체 삭제 ── */}
      <h2 className="text-ink font-bold text-[16px] tracking-tight mt-8">계정 전체 삭제 (회원 탈퇴)</h2>
      <div className="mt-2">
        <Step n="1" title="앱 또는 웹사이트에 로그인">
          minorstar.kr에 접속해 로그인합니다.
        </Step>
        <Step n="2" title="마이페이지로 이동">
          화면 아래 오른쪽 프로필 아이콘을 누릅니다.
        </Step>
        <Step n="3" title="‘회원 탈퇴’ 선택">
          페이지 맨 아래 <strong className="text-ink">회원 탈퇴</strong>를 누르고,
          확인을 위해 본인 닉네임을 입력합니다.
        </Step>
        <Step n="4" title="즉시 삭제">
          확인을 누르면 계정과 활동 기록이 곧바로 삭제되며 복구할 수 없습니다.
        </Step>
      </div>

      {/* ── 일부만 삭제 ── */}
      <h2 className="text-ink font-bold text-[16px] tracking-tight mt-8">계정을 유지하며 일부만 삭제</h2>
      <ul className="list-disc pl-5 text-ink-600 text-[13px] leading-[1.8] mt-2 space-y-1">
        <li><strong className="text-ink">팬 등록(팔로우)</strong> — 마이페이지 → 팔로우 목록에서 해제</li>
        <li><strong className="text-ink">선수에게 남긴 질문</strong> — 해당 선수 프로필에서 본인 질문 삭제</li>
        <li><strong className="text-ink">알림 수신 정보</strong> — 마이페이지 → 알림 끄기(구독 정보가 함께 삭제됨)</li>
        <li><strong className="text-ink">닉네임·도장·단</strong> — 마이페이지에서 언제든 수정</li>
      </ul>

      {/* ── 무엇이 지워지나 ── */}
      <h2 className="text-ink font-bold text-[16px] tracking-tight mt-8">삭제되는 데이터</h2>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-[12px] border border-ink-200">
          <thead>
            <tr className="bg-ink-200/30">
              <th className="px-2.5 py-2 text-left font-semibold text-ink">항목</th>
              <th className="px-2.5 py-2 text-left font-semibold text-ink">처리</th>
            </tr>
          </thead>
          <tbody className="text-ink-600">
            {[
              ['닉네임, 카카오 회원번호, 아이디·비밀번호', '탈퇴 즉시 삭제'],
              ['소속 도장, 단, 응원팀', '탈퇴 즉시 삭제'],
              ['팔로우, 우승 예측, 질문, 댓글', '탈퇴 즉시 삭제'],
              ['알림 수신 정보', '탈퇴 즉시 삭제'],
              ['접속 기록(IP, 접속 시각)', '통신비밀보호법에 따라 3개월 보관 후 삭제'],
            ].map(([a, b], i) => (
              <tr key={i} className="border-t border-ink-200">
                <td className="px-2.5 py-2 align-top">{a}</td>
                <td className="px-2.5 py-2 align-top">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-ink-400 text-[12px] leading-[1.7] mt-2">
        방문 통계에 쓰이는 기록은 개인을 알아볼 수 없는 익명 식별자만 담고 있어
        특정 이용자와 연결되지 않습니다.
      </p>

      {/* ── 직접 못 할 때 ── */}
      <h2 className="text-ink font-bold text-[16px] tracking-tight mt-8">직접 삭제가 어려운 경우</h2>
      <p className="text-ink-600 text-[13px] leading-[1.7] mt-2">
        로그인이 되지 않는 등 직접 처리가 어려우면 아래로 요청해 주세요.
        본인 확인 후 지체 없이 삭제해 드립니다.
      </p>
      <p className="text-ink mt-1.5 text-[13px]">
        <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>
      </p>

      <p className="text-ink-400 text-[12px] mt-8 pt-4" style={{ borderTop: '1px solid #E5E5E5' }}>
        자세한 내용은 <button onClick={() => navigate('/privacy')} className="underline">개인정보처리방침</button>을 참고하세요.
      </p>
    </main>
  );
}
