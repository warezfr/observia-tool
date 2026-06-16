import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-grain min-h-[100dvh] bg-app text-fg flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
