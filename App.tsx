import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { authLogin, clearSessionToken, getMe } from './services/api';
import { Logo } from './components/Logo';
import { Button } from './components/Button';
import { LayoutDashboard, Users, MessageSquare, Calendar, LogOut, CheckCircle } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { GuestList } from './components/GuestList';
import { Memories } from './components/Memories';
import { Program } from './components/Program';

type ViewState = 'dashboard' | 'guests' | 'memories' | 'program';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isAnimating, setIsAnimating] = useState(false);

  // Check for existing session
  useEffect(() => {
    (async () => {
      // Avoid a race where an early /api/me 401 arrives after login and resets user back to null.
      const token = localStorage.getItem('nivelx_session_token');
      if (!token) {
        setUser(null);
        return;
      }
      try {
        const me = await getMe();
        setUser({ id: me.id, name: me.name, role: me.role === 'ADMIN' ? UserRole.ADMIN : UserRole.GUEST });
      } catch {
        // Not logged in
        // If a token exists now, don't clobber an in-flight login.
        const stillHasToken = Boolean(localStorage.getItem('nivelx_session_token'));
        if (!stillHasToken) setUser(null);
      }
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setIsAnimating(true);
    setLoginError('');
    try {
      const u = await authLogin(nameInput.trim());
      setUser({ id: u.id, name: u.name, role: u.role === 'ADMIN' ? UserRole.ADMIN : UserRole.GUEST });
      setCurrentView('dashboard');
    } catch (e: any) {
      setLoginError(e?.message ?? 'Falha ao entrar. Tenta novamente.');
    } finally {
      setIsAnimating(false);
    }
  };

  const handleLogout = () => {
    clearSessionToken();
    setUser(null);
    setCurrentView('dashboard');
  };

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
             <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/40 rounded-full blur-[100px] animate-pulse"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-800/20 rounded-full blur-[80px]"></div>
        </div>

        <div className={`z-10 flex flex-col items-center space-y-8 transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <div className="animate-fade-in-down">
            <Logo size="xl" />
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-serif text-white tracking-widest">NÍVEL <span className="text-red-600">X</span></h1>
            <p className="text-gray-400 tracking-wide uppercase text-sm">25 Anos de Irmandade</p>
          </div>

          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 bg-neutral-900/50 backdrop-blur-md p-8 rounded-2xl border border-neutral-800 shadow-2xl">
            <p className="text-xs text-center text-gray-500 uppercase tracking-wider">Entrar</p>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-black/50 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all placeholder-gray-600"
                placeholder="Insere o teu nome..."
              />
            </div>
            <Button type="submit" className="w-full py-4 text-lg" disabled={isAnimating}>
              Entrar na Festa
            </Button>
            {loginError && <p className="text-xs text-center text-red-400">{loginError}</p>}
            <p className="text-xs text-center text-gray-600">
              Ataliba tem acesso Admin
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Main Application Layout
  const isAdminAny = user.role === UserRole.ADMIN || user.role === UserRole.ADMIN_VIEWER;
  return (
    <div className="min-h-screen bg-black text-gray-200 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Nav Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-neutral-900 border-b border-neutral-800 sticky top-0 z-50">
          <div className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="font-bold text-lg">NÍVEL X</span>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="!p-2"><LogOut size={20}/></Button>
      </div>

      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-neutral-900 border-r border-neutral-800 h-screen sticky top-0">
        <div className="p-8 flex flex-col items-center border-b border-neutral-800">
          <Logo size="lg" />
          <h2 className="mt-4 font-bold text-xl tracking-wider">NÍVEL X</h2>
          <p className="text-xs text-red-500 uppercase tracking-widest mt-1">Reencontro '25</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard size={20} />} label="Visão Geral" />
          {isAdminAny && (
            <NavItem active={currentView === 'guests'} onClick={() => setCurrentView('guests')} icon={<Users size={20} />} label="X-Cleroarianos" />
          )}
          <NavItem active={currentView === 'memories'} onClick={() => setCurrentView('memories')} icon={<MessageSquare size={20} />} label="Memórias" />
          <NavItem active={currentView === 'program'} onClick={() => setCurrentView('program')} icon={<Calendar size={20} />} label="Programa" />
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-red-900 flex items-center justify-center font-bold text-xs">
                {user.name.substring(0,2).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role === 'ADMIN' ? 'Admin' : 'Ligado'}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-red-400 hover:text-red-300">
            <LogOut size={18} /> <span className="ml-2">Sair</span>
          </Button>
        </div>
      </aside>

      {/* Bottom Nav for Mobile */}
      <div className="md:hidden fixed bottom-0 w-full bg-neutral-900 border-t border-neutral-800 flex justify-around p-2 z-50 safe-area-pb">
        <MobileNavItem active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard size={20} />} />
        {isAdminAny && (
          <MobileNavItem active={currentView === 'guests'} onClick={() => setCurrentView('guests')} icon={<Users size={20} />} />
        )}
        <MobileNavItem active={currentView === 'memories'} onClick={() => setCurrentView('memories')} icon={<MessageSquare size={20} />} />
        <MobileNavItem active={currentView === 'program'} onClick={() => setCurrentView('program')} icon={<Calendar size={20} />} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto animate-fade-in">
          {currentView === 'dashboard' && <Dashboard user={user} />}
          {currentView === 'guests' && isAdminAny && <GuestList currentUser={user} />}
          {currentView === 'memories' && <Memories currentUser={user} />}
          {currentView === 'program' && <Program />}
        </div>
      </main>

    </div>
  );
}

const NavItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-red-900/20 text-red-500 border border-red-900/30' : 'text-gray-400 hover:bg-neutral-800 hover:text-gray-200'}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
  </button>
);

const MobileNavItem = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-full transition-all duration-200 ${active ? 'bg-red-900/30 text-red-500' : 'text-gray-400'}`}
  >
    {icon}
  </button>
);