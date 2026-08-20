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
  const [profile, setProfile] = useState(null); // Changed to null to check loading state easily

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
        // Fetch company_id to see if they need onboarding
        const { data } = await supabase.from('profiles').select('first_name, last_name, department, company_id').eq('id', session.user.id).single();
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

  // CHECK IF WE NEED TO SHOW THE ONBOARDING SPOTLIGHT
  const showTutorial = !authLoading && isAuthenticated && profile && profile.company_id === null && activeTab !== 'Company';

  return (
    <div className={`w-screen h-screen ${getGradientByDepartment(profile?.department)} overflow-hidden font-sans relative transition-colors duration-500`}>
      
      {/* ONBOARDING BACKDROP OVERLAY */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[45] animate-fade-in pointer-events-auto" />
      )}

      <div className="absolute top-0 left-0 w-full h-14 flex items-center justify-between px-4 md:px-6 z-40 select-none">
        <div className="flex items-center gap-3 text-white/95 drop-shadow-sm">
          <button onClick={() => setIsMobileOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-white/20 transition-colors focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
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

      {/* SIDEBAR NOW RECEIVES THE highlightCompany PROP */}
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

      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px; }`}</style>
    </div>
  );
}

export default Dashboard;