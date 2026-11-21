import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidenav from './Sidenav';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import FloatingRefresh from './FloatingRefresh';

export default function Layout({ searchPlaceholder }) {
  const [rightRail, setRightRail] = useState(null);

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen overflow-x-clip pb-20 md:pb-0">
      <Sidenav />
      <main className="ml-0 md:ml-64 min-h-screen">
        <TopNav searchPlaceholder={searchPlaceholder} />
        <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className={`${rightRail ? 'lg:col-span-8 lg:border-r lg:border-outline-variant' : 'lg:col-span-12'} min-h-full`}>
            <div className="p-lg md:p-xl max-w-5xl mx-auto">
              <Outlet context={{ setRightRail }} />
            </div>
          </div>
          {rightRail && (
            <aside className="hidden lg:block lg:col-span-4 p-lg space-y-lg">
              {rightRail}
            </aside>
          )}
        </div>
      </main>
      <FloatingRefresh />
      <BottomNav />
    </div>
  );
}

