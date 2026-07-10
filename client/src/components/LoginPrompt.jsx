/* 로그아웃 방문자가 참여형 탭(예측·랭킹)에 왔을 때 보여주는 로그인 유도 화면 */
export default function LoginPrompt({ eyebrow = 'MEMBERS', title, desc, onLoginRequest }) {
  return (
    <div className="px-5 py-16 text-center">
      <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">{eyebrow}</p>
      <p className="text-ink font-bold text-xl mt-2 tracking-[-0.02em]">{title}</p>
      {desc && <p className="text-ink-400 text-sm mt-2 leading-relaxed">{desc}</p>}
      <button
        onClick={onLoginRequest}
        className="mt-6 bg-lime hover:bg-lime-dark text-ink text-sm font-medium px-6 py-3 rounded-full pressable"
      >
        시작하기 →
      </button>
    </div>
  );
}
