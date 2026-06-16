import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="Analytics" />
      <div className="flex-1 flex flex-col items-center justify-center pb-24 gap-2">
        <span className="text-4xl">📊</span>
        <p className="text-gray-400 text-sm">Analytics — coming in Phase 3</p>
      </div>
      <BottomNav />
    </div>
  );
}
