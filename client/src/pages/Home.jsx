export default function Home() {
  return (
    <main className="page-body px-4 pt-6">
      <h1 className="text-2xl font-bold text-navy mb-1">검도 팬덤</h1>
      <p className="text-sub text-sm">라이브 대회 · 선수 · 강습</p>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-navy mb-3">진행 중인 대회</h2>
        <div className="bg-card rounded-xl p-4 text-sub text-sm">곧 업데이트됩니다.</div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-navy mb-3">주목 선수</h2>
        <div className="bg-card rounded-xl p-4 text-sub text-sm">곧 업데이트됩니다.</div>
      </section>
    </main>
  );
}
