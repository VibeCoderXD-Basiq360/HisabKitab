// Safe-area spacer — nav moved to sidebar (hamburger in TopBar)
export default function BottomNav() {
  return (
    <div
      className="h-6 shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    />
  );
}
