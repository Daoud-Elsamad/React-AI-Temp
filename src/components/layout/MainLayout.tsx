import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export function MainLayout({ children, showSidebar = false }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />

      <div className="flex flex-1 relative">
        {showSidebar && (
          <>
            {/* Mobile sidebar overlay */}
            {isSidebarOpen && (
              <div 
                className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                onClick={closeSidebar}
              />
            )}
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
          </>
        )}

        <main className={`flex-1 min-w-0 ${showSidebar ? 'lg:ml-64' : ''}`}>
          <div className="h-full overflow-auto">{children}</div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
