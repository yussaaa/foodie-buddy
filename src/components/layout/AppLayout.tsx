import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      {/* pb-16 reserves space for the fixed mobile bottom nav */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
    </div>
  );
}
