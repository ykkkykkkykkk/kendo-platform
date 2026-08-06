import { useNavigate } from 'react-router-dom';

/**
 * 개인정보처리방침.
 *
 * 구글 플레이·앱스토어 등록에 필수라 페이지로 둔다(/privacy).
 * 실제 코드가 수집하는 것만 적는다 — 안 받는 걸 적어두면 그 자체가 위반이 된다.
 * 수집 항목이 바뀌면 이 문서도 같이 고쳐야 한다.
 */
const UPDATED = '2026년 8월 6일';
const CONTACT = 'ukill4444@gmail.com';

function Section({ n, title, children }) {
  return (
    <section className="mt-7">
      <h2 className="text-ink font-bold text-[15px] tracking-tight">{n}. {title}</h2>
      <div className="text-ink-600 text-[13px] leading-[1.75] mt-2 space-y-2">{children}</div>
    </section>
  );
}

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-[12px] border border-ink-200">
        <thead>
          <tr className="bg-ink-200/30">
            {head.map((h) => (
              <th key={h} className="px-2.5 py-2 text-left font-semibold text-ink whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-ink-200">
              {r.map((c, j) => <td key={j} className="px-2.5 py-2 align-top text-ink-600">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <main className="page-body bg-paper min-h-screen px-5 pt-12 pb-20">
      <button onClick={() => navigate(-1)} className="text-ink-400 text-sm mb-4 pressable">← 뒤로</button>

      <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">PRIVACY</p>
      <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] leading-tight mt-1">개인정보처리방침</h1>
      <p className="text-ink-400 text-[12px] mt-2">시행일 {UPDATED}</p>

      <p className="text-ink-600 text-[13px] leading-[1.75] mt-5">
        마이너스타(minorstar.kr, 이하 “서비스”)는 이용자의 개인정보를 소중히 다루며,
        「개인정보 보호법」 등 관계 법령을 준수합니다. 이 방침은 서비스가 어떤 정보를
        어떤 목적으로 다루는지, 이용자가 어떤 권리를 갖는지 알려드리기 위한 것입니다.
      </p>

      <Section n="1" title="수집하는 개인정보 항목">
        <p>서비스는 <strong className="text-ink">회원가입과 서비스 이용에 꼭 필요한 최소한</strong>만 받습니다.
          이름·주민등록번호·주소·결제정보는 받지 않습니다.</p>
        <Table
          head={['구분', '항목', '수집 시점']}
          rows={[
            ['필수', '닉네임, 카카오 회원번호', '카카오로 가입할 때'],
            ['필수', '아이디, 비밀번호(암호화 저장)', '선수 계정을 발급받는 경우'],
            ['선택', '소속 도장, 단(段), 응원하는 팀', '이용자가 직접 입력할 때'],
            ['선택', '알림 수신 정보(브라우저 구독 정보)', '알림 받기를 켤 때'],
            ['자동', '접속 IP, 최근 접속 시각, 방문 기록(익명 식별자·경로)', '서비스 이용 중'],
          ]}
        />
        <p>
          카카오 로그인 시 카카오로부터 받는 정보는 <strong className="text-ink">회원번호와 닉네임뿐</strong>입니다.
          이메일·전화번호·생년월일·성별은 요청하지도, 받지도 않습니다.
        </p>
        <p>
          이용자가 서비스에서 만든 활동 기록(팔로우, 우승 예측, 질문, 댓글, 게시글)도 함께 저장됩니다.
        </p>
      </Section>

      <Section n="2" title="개인정보의 이용 목적">
        <p>수집한 정보는 아래 목적으로만 씁니다. 목적이 바뀌면 미리 알리고 동의를 받습니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>회원 식별과 로그인, 중복 가입 방지</li>
          <li>선수 본인 확인 및 선수 계정 전환</li>
          <li>우승 예측·팔로우·질문·댓글 등 서비스 기능 제공</li>
          <li>도장 랭킹 집계</li>
          <li>새 소식·질문·답변 알림 발송(이용자가 켠 경우)</li>
          <li>부정 이용 확인, 서비스 개선을 위한 접속 통계</li>
        </ul>
      </Section>

      <Section n="3" title="보유 및 이용 기간">
        <p>
          <strong className="text-ink">회원 탈퇴 시 지체 없이 파기</strong>합니다.
          탈퇴하면 계정 정보와 활동 기록(팔로우·예측·질문·댓글)이 함께 삭제되며 복구할 수 없습니다.
        </p>
        <p>
          접속 기록은 「통신비밀보호법」에 따라 3개월간 보관 후 삭제합니다.
          방문 통계에 쓰이는 기록은 개인을 알아볼 수 없는 익명 식별자만 담고 있습니다.
        </p>
      </Section>

      <Section n="4" title="개인정보의 제3자 제공">
        <p>
          서비스는 이용자의 개인정보를 <strong className="text-ink">제3자에게 제공하지 않습니다.</strong>
          다만 법령에 따라 수사기관이 적법한 절차로 요구하는 경우에는 예외로 합니다.
        </p>
      </Section>

      <Section n="5" title="처리위탁">
        <p>서비스 운영을 위해 아래 업체에 처리를 위탁하고 있습니다.</p>
        <Table
          head={['수탁업체', '위탁 업무', '비고']}
          rows={[
            ['Kakao', '카카오 로그인 인증', '국내'],
            ['Vercel Inc.', '웹 서비스 제공(호스팅)', '해외'],
            ['Render Services, Inc.', '서버 운영', '해외'],
            ['Turso (ChiselStrike, Inc.)', '데이터베이스 보관', '해외'],
          ]}
        />
        <p className="text-ink-400 text-[12px]">
          해외 수탁업체에는 위 항목이 서비스 제공에 필요한 범위에서 저장·처리됩니다.
          이전 국가·시점·방법은 각 업체의 클라우드 인프라를 통한 네트워크 전송이며,
          이용자는 이에 동의하지 않을 권리가 있으나 동의하지 않는 경우 서비스 이용이 제한될 수 있습니다.
        </p>
      </Section>

      <Section n="6" title="이용자의 권리와 행사 방법">
        <p>이용자는 언제든지 아래 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink">열람·정정</strong> — 마이페이지에서 닉네임·도장·단 등을 직접 확인하고 고칠 수 있습니다.</li>
          <li><strong className="text-ink">삭제·탈퇴</strong> — 마이페이지 하단 ‘회원 탈퇴’로 즉시 처리됩니다.</li>
          <li><strong className="text-ink">알림 수신 거부</strong> — 마이페이지에서 알림을 끄면 즉시 중단되고 구독 정보도 삭제됩니다.</li>
        </ul>
        <p>직접 처리가 어려운 경우 아래 연락처로 요청하시면 지체 없이 조치합니다.</p>
      </Section>

      <Section n="7" title="쿠키 및 유사 기술">
        <p>
          서비스는 광고 목적의 쿠키를 쓰지 않습니다. 로그인 상태 유지를 위해 브라우저 저장소에
          인증 토큰을 저장하고, 방문 통계를 위해 임의로 만든 익명 식별자를 저장합니다.
          이 식별자는 개인을 특정하지 않으며, 브라우저 설정에서 삭제할 수 있습니다.
        </p>
      </Section>

      <Section n="8" title="개인정보의 안전성 확보 조치">
        <ul className="list-disc pl-5 space-y-1">
          <li>비밀번호는 복호화할 수 없는 방식으로 암호화해 저장합니다.</li>
          <li>모든 통신은 HTTPS로 암호화합니다.</li>
          <li>관리자 기능은 별도 인증을 거쳐야 접근할 수 있습니다.</li>
          <li>개인정보를 다루는 인원을 운영자로 최소화합니다.</li>
        </ul>
      </Section>

      <Section n="9" title="만 14세 미만 아동">
        <p>
          서비스는 만 14세 미만 아동의 개인정보를 법정대리인의 동의 없이 수집하지 않습니다.
          만 14세 미만임이 확인되면 해당 계정을 삭제합니다.
        </p>
      </Section>

      <Section n="10" title="개인정보 보호책임자">
        <p>
          개인정보 처리에 관한 문의·불만·피해구제는 아래로 연락 주시면 신속히 답변드립니다.
        </p>
        <p className="text-ink">
          책임자: 마이너스타 운영자<br />
          이메일: <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>
        </p>
        <p className="text-ink-400 text-[12px]">
          그 밖의 개인정보 침해 신고·상담은 개인정보침해신고센터(privacy.kisa.or.kr, 국번없이 118),
          대검찰청 사이버수사과(1301), 경찰청 사이버수사국(182)에 문의하실 수 있습니다.
        </p>
      </Section>

      <Section n="11" title="방침의 변경">
        <p>
          이 방침을 바꿀 때에는 변경 내용과 시행일을 서비스 내에 미리 공지합니다.
          이용자에게 불리한 변경은 최소 30일 전에 알립니다.
        </p>
      </Section>

      <p className="text-ink-400 text-[12px] mt-8 pt-4" style={{ borderTop: '1px solid #E5E5E5' }}>
        시행일: {UPDATED}
      </p>
    </main>
  );
}
