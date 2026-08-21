import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';

function Sidebar({ onSelectTab, activeTab, isOpen, onClose, highlightCompany }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState({ first_name: '', last_name: '', department: '', avatar_url: '' });

  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('first_name, last_name, department, avatar_url').eq('id', user.id).single();
        if (data) setProfile(data);
      }
    };
    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('rememberMe');
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleAvatarClick = () => { if (!isUploading) fileInputRef.current.click(); };

  const uploadAvatar = async (event) => {
    try {
      setIsUploading(true);
      const file = event.target.files[0];
      if (!file) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { text: 'text-purple-500', border: 'border-purple-500/50', activeTab: 'bg-purple-500/20 text-purple-400' };
      case 'BSAB': return { text: 'text-green-500', border: 'border-green-500/50', activeTab: 'bg-green-500/20 text-green-400' };
      case 'BSHM': return { text: 'text-yellow-500', border: 'border-yellow-500/50', activeTab: 'bg-yellow-500/20 text-yellow-400' };
      case 'BSCRIM': return { text: 'text-rose-500', border: 'border-rose-500/50', activeTab: 'bg-rose-500/20 text-rose-400' };
      case 'COTED': return { text: 'text-blue-500', border: 'border-blue-500/50', activeTab: 'bg-blue-500/20 text-blue-400' };
      default: return { text: 'text-gray-400', border: 'border-gray-500/50', activeTab: 'bg-gray-500/20 text-gray-300' };
    }
  };

  const theme = getThemeColors(profile.department);
  const bgSidebar = isDarkMode ? 'bg-gray-900/90 backdrop-blur-xl border border-white/10' : 'bg-white';
  const iconIdle = isDarkMode ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900';
  const divider = isDarkMode ? 'bg-white/10' : 'bg-gray-100';

  const navItems = [
    { name: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { name: 'Company', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { name: 'Daily Logs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { name: 'Journal', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Logs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300" />}
      
      <aside className={`absolute top-12 bottom-4 left-4 w-[76px] shadow-2xl rounded-[24px] flex flex-col items-center py-5 z-50 select-none transition-all duration-300 ease-in-out ${bgSidebar} ${isOpen ? 'translate-x-0' : '-translate-x-[120px] md:translate-x-0'}`}>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={uploadAvatar} className="hidden" />

        <div className={`relative group transition-opacity duration-300 ${highlightCompany ? 'opacity-20 pointer-events-none' : ''}`}>
          <div onClick={handleAvatarClick} className={`w-12 h-12 rounded-2xl border-2 ${theme.border} ${isDarkMode ? 'bg-black/40' : 'bg-white'} ${theme.text} flex items-center justify-center shadow-sm shrink-0 cursor-pointer overflow-hidden relative`}>
            {isUploading ? <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${theme.border}`}></div> : profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            {!isUploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>}
          </div>
        </div>

        <div className={`w-8 h-px my-4 shrink-0 rounded-full transition-opacity duration-300 ${divider} ${highlightCompany ? 'opacity-20' : ''}`} />

        <nav className="flex flex-col gap-2 w-full px-2 flex-1 items-center">
          {navItems.map((item) => {
            const isHighlighted = highlightCompany && item.name === 'Company';
            const isDimmed = highlightCompany && !isHighlighted;
            
            return (
              <div key={item.name} className={`relative group transition-opacity duration-300 ${isDimmed ? 'opacity-20 pointer-events-none' : ''}`}>
                <div 
                  onClick={() => onSelectTab && onSelectTab(item.name)} 
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl cursor-pointer transition-all shrink-0 ${
                    isHighlighted 
                      ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-gray-900 bg-amber-400/20 text-amber-400 z-50 relative animate-pulse' 
                      : activeTab === item.name 
                        ? `${theme.activeTab} shadow-sm border border-white/5` 
                        : iconIdle
                  }`}
                >
                  <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === item.name || isHighlighted ? "2.5" : "2"} d={item.icon} /></svg>
                </div>
                
                {/* Standard Tooltip */}
                {!isHighlighted && (
                  <div className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">{item.name}</div>
                )}

                {/* ONBOARDING HINT ARROW - Fixed: Hidden on mobile when drawer is closed */}
                {isHighlighted && (
                  <div className={`absolute left-[70px] top-1/2 -translate-y-1/2 items-center animate-point-left z-[100] pointer-events-none ${isOpen ? 'flex' : 'hidden md:flex'}`}>
                    <svg className="w-8 h-8 text-amber-400 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7-7h18" />
                    </svg>
                    <div className="bg-amber-400 text-black text-[12px] font-black px-3.5 py-1.5 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.6)] whitespace-nowrap ml-1 uppercase tracking-wider">
                      Step 1: Choose Company
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={`w-8 h-px my-4 shrink-0 rounded-full transition-opacity duration-300 ${divider} ${highlightCompany ? 'opacity-20' : ''}`} />

        <div className={`relative group mb-2 transition-opacity duration-300 ${highlightCompany ? 'opacity-20 pointer-events-none' : ''}`}>
          <div onClick={() => onSelectTab && onSelectTab('Settings')} className={`w-12 h-12 flex items-center justify-center rounded-2xl cursor-pointer transition-all shrink-0 ${activeTab === 'Settings' ? `${theme.activeTab} shadow-sm border border-white/5` : iconIdle}`}>
            <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'Settings' ? "2.5" : "2"} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">Settings</div>
        </div>

        <div className={`relative group transition-opacity duration-300 ${highlightCompany ? 'opacity-20 pointer-events-none' : ''}`}>
          <button onClick={handleLogout} className="w-12 h-12 flex items-center justify-center rounded-2xl text-red-400 hover:bg-red-500/20 hover:text-red-400 transition-colors shrink-0">
            <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
          <div className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">Log Out</div>
        </div>
            
      </aside>

      {/* Custom Animation for the bouncing arrow */}
      <style>{`
        @keyframes pointLeft { 
          0%, 100% { transform: translate(0, -50%); } 
          50% { transform: translate(-8px, -50%); } 
        } 
        .animate-point-left { animation: pointLeft 1.2s ease-in-out infinite; }
      `}</style>
    </>
  );
}

export default Sidebar;