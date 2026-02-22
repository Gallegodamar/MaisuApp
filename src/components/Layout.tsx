import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTeacher } from '../contexts/TeacherContext';
import { LogOut, ChevronLeft, X, Home, PlusCircle, Library } from 'lucide-react';
import { cn } from '../utils';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  backIcon?: 'chevron' | 'x';
  rightElement?: React.ReactNode;
  hideBottomNav?: boolean;
}

export default function Layout({ children, title, showBackButton, backIcon = 'chevron', rightElement, hideBottomNav = false }: LayoutProps) {
  const { currentTeacher, logout } = useTeacher();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto bg-white shadow-sm font-sans antialiased">
      <header className="bg-white/80 backdrop-blur-md p-6 sticky top-0 z-10 flex items-center justify-between no-print border-b border-zinc-100">
        <div className="flex items-center gap-4 flex-1">
          {showBackButton && !isHome && (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-zinc-100 rounded-2xl transition-all active:scale-90"
            >
              {backIcon === 'x' ? <X size={24} className="text-zinc-400" /> : <ChevronLeft size={24} className="text-zinc-400" />}
            </button>
          )}
          <h1 className="text-xl font-black tracking-tight text-zinc-900">
            {currentTeacher && isHome ? (
              <>Kaixo, <span className="text-blue-500">{currentTeacher.name}</span></>
            ) : (title || "MaisuApp")}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {rightElement}
          {currentTeacher && (
            <button 
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 hover:bg-zinc-100 rounded-2xl transition-all active:scale-90 text-zinc-400"
              title="Saioa itxi"
            >
              <LogOut size={24} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 pb-24">
        {children}
      </main>

      {/* Simple Footer Navigation for Mobile/Quick Access */}
      {!hideBottomNav && !isHome && currentTeacher && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-zinc-100 p-4 flex justify-around items-center no-print max-w-4xl mx-auto rounded-t-[2rem] shadow-2xl">
           <button onClick={() => navigate('/')} className="flex flex-col items-center p-2 text-zinc-400 hover:text-blue-500 transition-colors gap-1">
             <Home size={20} />
             <span className="text-[10px] font-black uppercase tracking-widest">Hasiera</span>
           </button>
           <button onClick={() => navigate('/add')} className="flex flex-col items-center p-2 text-zinc-400 hover:text-blue-500 transition-colors gap-1">
             <PlusCircle size={20} />
             <span className="text-[10px] font-black uppercase tracking-widest">Gehitu</span>
           </button>
           <button onClick={() => navigate('/list')} className="flex flex-col items-center p-2 text-zinc-400 hover:text-blue-500 transition-colors gap-1">
             <Library size={20} />
             <span className="text-[10px] font-black uppercase tracking-widest">Liburutegia</span>
           </button>
        </nav>
      )}
    </div>
  );
}
