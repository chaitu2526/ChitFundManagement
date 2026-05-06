import React, { useState, useEffect } from 'react';
import { auth, signIn, signOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { chitService } from './services/chitService';
import { Member, Group, AuthorizedUser, UserRole } from './types';
import { AdminPanel } from './components/AdminPanel';
import { AuctionPanel } from './components/AuctionPanel';
import { MemberDashboard } from './components/MemberDashboard';
import { Overview } from './components/Overview';
import { LogIn, LogOut, Shield, Menu, X, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ADMIN_EMAIL = 'chaitu2513@gmail.com';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'overview' | 'admin' | 'auctions' | 'member'>('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Global Data State
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    if (user) {
      const unsubMembers = chitService.getMembers(setMembers);
      const unsubGroups = chitService.getGroups(setGroups);
      const unsubAllowed = chitService.getAuthorizedUsers(setAuthorizedUsers);
      return () => {
        unsubAuth();
        unsubMembers();
        unsubGroups();
        unsubAllowed();
      };
    }

    return () => unsubAuth();
  }, [user]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signIn();
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.code === 'auth/popup-blocked') {
        setAuthError("Popup blocked by browser. Please enable popups and try again.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError("This domain is not authorized in Firebase. Add your Vercel URL to 'Authorized Domains' in Firebase console.");
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError("Google Sign-In is not enabled in your Firebase project.");
      } else {
        setAuthError(error.message || "Authentication failed. Check your Firebase credentials.");
      }
    }
  };

  const isAdmin = user?.email === ADMIN_EMAIL;
  const userAccess = authorizedUsers.find(u => u.email.toLowerCase() === user?.email?.toLowerCase());
  
  const isAuthorized = isAdmin || !!userAccess;
  const isManager = isAdmin || userAccess?.role === UserRole.MANAGER;
  const isDisplayOnly = !isAdmin && userAccess?.role === UserRole.DISPLAY;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0b10] text-[#f0f6fc]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-xl font-medium tracking-[0.2em] uppercase opacity-50">Initializing System</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b10] p-6">
        <div className="max-w-md w-full glass-panel p-12 space-y-8 flex flex-col items-center text-center shadow-2xl shadow-blue-500/10">
          <div className="p-5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <Landmark size={48} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              ChitManager
            </h1>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] tracking-widest uppercase text-blue-400 font-black bg-blue-500/10 py-1.5 px-4 rounded-full border border-blue-500/20">
                Cloud-Native Infrastructure
              </p>
              <p className="text-[8px] uppercase tracking-[0.3em] text-zinc-600 font-bold">
                Deploying to Vercel Protocol
              </p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px]">
            Absolute security via Google IAM. Authenticate to access fund management and member registries.
          </p>
          <div className="w-full space-y-4">
            <button 
              onClick={handleSignIn}
              className="btn-technical w-full flex justify-center items-center gap-3 py-4 text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <LogIn size={20} />
              <span>Authenticate Session</span>
            </button>

            {authError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium animate-in fade-in slide-in-from-top-2">
                <p>{authError}</p>
                <p className="mt-2 text-[10px] opacity-70">Error Code: {authError.includes('domain') ? 'UNAUTHORIZED_DOMAIN' : 'AUTH_FAILURE'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b10] p-6">
        <div className="max-w-md w-full glass-panel p-12 space-y-8 flex flex-col items-center text-center">
          <div className="p-5 bg-red-600/20 text-red-400 rounded-2xl border border-red-500/30">
            <Shield size={48} />
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Access Denied
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Your identity (<span className="text-zinc-200 font-mono">{user.email}</span>) is authenticated but not authorized for this environment.
            </p>
          </div>
          <div className="w-full pt-6 border-t border-white/5 space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
              Contact administrator for whitelisting
            </p>
            <button 
              onClick={signOut}
              className="btn-technical w-full py-4 text-xs flex justify-center items-center gap-2"
            >
              <LogOut size={16} />
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    if (isDisplayOnly) return <Overview groups={groups} members={members} />;

    switch (view) {
      case 'overview': return <Overview groups={groups} members={members} />;
      case 'admin': return <AdminPanel groups={groups} members={members} isSuperUser={isAdmin} />;
      case 'auctions': return <AuctionPanel groups={groups} members={members} />;
      case 'member': return <MemberDashboard groups={groups} members={members} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0b10] text-[#f0f6fc]">
      {/* Navigation Header */}
      <nav className="bg-[#0a0b10]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('overview')}>
            <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/20 text-blue-400 group-hover:bg-blue-600/30 transition-all">
              <Landmark size={22} />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">ChitManager</span>
            <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full font-mono font-bold">V1.0</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-widest">
            <button 
              onClick={() => setView('overview')} 
              className={`px-4 py-2 rounded-lg transition-all ${view === 'overview' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Overview
            </button>
            
            {!isDisplayOnly && (
              <>
                <button 
                  onClick={() => setView('member')} 
                  className={`px-4 py-2 rounded-lg transition-all ${view === 'member' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Members
                </button>
                <button 
                  onClick={() => setView('auctions')} 
                  className={`px-4 py-2 rounded-lg transition-all ${view === 'auctions' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Auctions
                </button>
                <button 
                  onClick={() => setView('admin')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${view === 'admin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-blue-400/70 hover:text-blue-400'}`}
                >
                  <Shield size={14} /> Setup
                </button>
              </>
            )}
            
            <div className="h-6 w-px bg-white/10 mx-2"></div>
            
            <div className="flex items-center gap-4 pl-2">
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 normal-case font-medium mb-0.5">Session ID</p>
                <p className="text-[11px] text-zinc-300 normal-case font-mono">{user.email?.split('@')[0]}</p>
              </div>
              <button 
                onClick={signOut}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-zinc-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-0 z-40 bg-[#0a0b10] md:hidden pt-24 px-8 space-y-6 flex flex-col text-xl font-bold uppercase tracking-widest text-[#f0f6fc]"
          >
            <button className="text-left py-4 border-b border-white/5" onClick={() => { setView('overview'); setIsMenuOpen(false); }}>Overview</button>
            {!isDisplayOnly && (
              <>
                <button className="text-left py-4 border-b border-white/5" onClick={() => { setView('member'); setIsMenuOpen(false); }}>Member View</button>
                <button className="text-left py-4 border-b border-white/5" onClick={() => { setView('auctions'); setIsMenuOpen(false); }}>Auctions</button>
                <button className="text-left py-4 border-b border-white/5 text-blue-400" onClick={() => { setView('admin'); setIsMenuOpen(false); }}>System Setup</button>
              </>
            )}
            <div className="mt-auto pb-12 flex justify-between items-center text-sm font-medium opacity-50 lowercase transition-all">
              <span>{user.email}</span>
              <button 
                onClick={signOut}
                className="p-3 bg-white/5 rounded-xl text-white"
              >
                <LogOut size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 p-12 bg-[#0a0b10] text-center">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex justify-center gap-4 text-blue-500/20">
            <Landmark size={32} />
          </div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600">
            The standard in decentralized chit management. 
            <br />Built for absolute transparency and security.
          </p>
          <p className="text-[9px] text-zinc-700 font-mono italic">
            © 2026 ChitManager Protocol v1.0.4-dark
          </p>
        </div>
      </footer>
    </div>
  );
}
