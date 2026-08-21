import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import Sidebar from '../components/Sidebar';

// Important Components
import StudentOverview from '../components/StudentOverview'; 
import DailyLogs from '../components/DailyLogs';
import Journal from '../components/Journal';
import Logs from '../components/Logs'; 
import Company from '../components/Company'; 
import Settings from '../components/Settings';

function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null); 
  const [dismissedPending, setDismissedPending] = useState(false); // Tracks if they closed the pending modal

  // GLOBAL DARK MODE LISTENER
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        // FETCH company_status AS WELL to check if they are waiting for approval
        const { data } = await supabase.from('profiles').select('first_name, last_name, department, company_id, company_status').eq('id', session.user.id).single();
        if (data) setProfile(data);
      } else {
        setIsAuthenticated(false);
      }
      setAuthLoading(false);
    };
    checkAuthAndFetchProfile();
  }, []);

  const getGradientByDepartment = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return 'bg-gradient-to-br from-purple-600 to-purple-900';
      case 'BSAB': return 'bg-gradient-to-br from-green-600 to-green-900';
      case 'BSHM': return 'bg-gradient-to-br from-yellow-500 to-yellow-700'; 
      case 'BSCRIM': return 'bg-gradient-to-br from-rose-800 to-rose-950';
      case 'COTED': return 'bg-gradient-to-br from-blue-600 to-blue-900';
      default: return 'bg-gradient-to-br from-gray-700 to-gray-900';
    }
  };

  // CHECK IF WE NEED TO SHOW THE ONBOARDING SPOTLIGHT (Strictly hide it if pending!)
  const showTutorial = !authLoading && isAuthenticated && profile && profile.company_id === null && profile.company_status !== 'pending' && activeTab !== 'Company';

  return (
    <div className={`w-screen h-screen ${getGradientByDepartment(profile?.department)} overflow-hidden font-sans relative transition-colors duration-500`}>
      
      {/* ONBOARDING BACKDROP OVERLAY (z-45) */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[45] animate-fade-in pointer-events-auto" />
      )}

      {/* TOP HEADER 
          FIX: Dynamically changed z-index to z-[50] when the tutorial is active so it pops OUT of the blur! 
      */}
      <div className={`absolute top-0 left-0 w-full h-14 flex items-center justify-between px-4 md:px-6 select-none transition-all ${showTutorial && !isMobileOpen ? 'z-[50]' : 'z-40'}`}>
        <div className="flex items-center gap-3 text-white/95 drop-shadow-sm relative">
          
          {/* HAMBURGER BUTTON (Highlighted on mobile when onboarding is active) */}
          <div className="relative">
            <button 
              onClick={() => setIsMobileOpen(true)} 
              className={`md:hidden p-1.5 rounded-lg transition-all duration-300 focus:outline-none ${
                showTutorial && !isMobileOpen 
                  ? 'bg-amber-400 text-black ring-4 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.8)] relative animate-pulse' 
                  : 'hover:bg-white/20'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {/* MOBILE ONBOARDING HINT (Only appears on mobile when sidebar is closed) */}
            {showTutorial && !isMobileOpen && (
              <div className="md:hidden absolute left-0 top-12 flex flex-col items-start animate-point-down z-[60] pointer-events-none">
                <div className="flex items-center gap-1 bg-amber-400 text-black text-[11px] font-black px-3 py-1.5 rounded-lg shadow-[0_0_20px_rgba(251,191,36,0.6)] whitespace-nowrap uppercase tracking-wider">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  Tap Menu to Choose Company
                </div>
              </div>
            )}
          </div>

          <span className="font-extrabold tracking-wide text-[14px] uppercase mt-0.5">InternTrack</span>
        </div>

        {!authLoading && isAuthenticated && profile?.first_name && (
          <div className="flex items-center gap-3 animate-fade-in mr-2">
            <span className="text-sm font-medium tracking-wide hidden sm:block drop-shadow-sm text-white">
              Welcome, <span className="font-extrabold text-amber-400">{profile.first_name} {profile.last_name}</span>
            </span>
          </div>
        )}
      </div>

      {!authLoading && !isAuthenticated && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 text-center animate-fade-in">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-sm text-gray-600 mb-6">You are not logged in. Please log in to access your dashboard.</p>
            <button onClick={() => navigate('/login')} className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-colors shadow-sm">Go to Log In</button>
          </div>
        </div>
      )}

      {/* PENDING APPROVAL MODAL */}
      {profile?.company_status === 'pending' && !dismissedPending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border ${isDarkMode ? 'bg-[#1e1e2d] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="w-20 h-20 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-500/30">
              <svg className="w-10 h-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Pending Approval</h2>
            <p className={`text-[13px] leading-relaxed mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Your deployment request has been successfully sent! Please wait for your coordinator to review and approve your application.
            </p>
            <button 
              onClick={() => setDismissedPending(true)} 
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
              Okay, I understand
            </button>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <Sidebar 
        activeTab={activeTab} 
        onSelectTab={(tabName) => { setActiveTab(tabName); setIsMobileOpen(false); }} 
        isOpen={isMobileOpen} 
        onClose={() => setIsMobileOpen(false)} 
        highlightCompany={showTutorial}
      />

      {/* DYNAMIC MAIN CONTENT BOX */}
      <div className={`absolute top-14 bottom-4 left-4 md:left-[104px] right-4 rounded-[24px] shadow-2xl shadow-black/20 flex flex-col overflow-hidden animate-fade-in transition-all duration-300 ${isDarkMode ? 'bg-gray-900/70 backdrop-blur-xl border border-white/10' : 'bg-white'}`}>
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          
          {authLoading && (
            <div className={`absolute inset-0 z-50 flex items-center justify-center ${isDarkMode ? 'bg-black/50 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'}`}>
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
            </div>
          )}

          <div className="h-full w-full">
            {activeTab === 'Dashboard' && <StudentOverview />}
            {activeTab === 'Daily Logs' && <DailyLogs />}
            {activeTab === 'Journal' && <Journal />}
            {activeTab === 'Logs' && <Logs />}
            {activeTab === 'Company' && <Company />}
            {activeTab === 'Settings' && <Settings />}
          </div>
        </main>
      </div>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; } 
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } } 
        @keyframes pointDown { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
        .animate-point-down { animation: pointDown 1.2s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default Dashboard;