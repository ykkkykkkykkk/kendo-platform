import { useParams } from 'react-router-dom';

export default function TournamentPage() {
  const { slug } = useParams();
  return (
    <main className="page-body px-4 pt-6">
      <h1 className="text-2xl font-bold text-navy mb-4">대회: {slug}</h1>
      <div className="bg-card rounded-xl p-4 text-sub text-sm">곧 업데이트됩니다.</div>
    </main>
  );
}
