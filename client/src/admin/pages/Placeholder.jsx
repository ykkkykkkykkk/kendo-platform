// 다음 단계에서 구현 예정인 페이지들의 플레이스홀더
export default function Placeholder({ title }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <p className="text-gray-400 text-sm">다음 단계에서 구현 예정입니다.</p>
      </div>
    </div>
  );
}
