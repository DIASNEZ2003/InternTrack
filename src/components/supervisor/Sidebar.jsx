import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabaseClient';

function Sidebar({ onSelectTab, activeTab, isOpen, onClose }) {
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
  const bgSidebar = isDarkMode ? 'bg-gray-900/80 backdrop-blur-xl border border-white/10' : 'bg-white';
  const iconIdle = isDarkMode ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900';
  const divider = isDarkMode ? 'bg-white/10' : 'bg-gray-100';

  // NEW MENU TABS FOR SUPERVISOR
  const navItems = [
    { name: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { name: 'List of Interns', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { name: 'Journals', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
  ];

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300" />}
      <aside className={`absolute top-12 bottom-4 left-4 w-[76px] shadow-2xl rounded-[24px] flex flex-col items-center py-5 z-50 select-none transition-all duration-300 ease-in-out ${bgSidebar} ${isOpen ? 'translate-x-0' : '-translate-x-[120px] md:translate-x-0'}`}>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={uploadAvatar} className="hidden" />

        <div className="relative group">
          <div onClick={handleAvatarClick} className={`w-12 h-12 rounded-2xl border-2 ${theme.border} ${isDarkMode ? 'bg-black/40' : 'bg-white'} ${theme.text} flex items-center justify-center shadow-sm shrink-0 cursor-pointer overflow-hidden relative`}>
            {isUploading ? <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${theme.border}`}></div> : profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            {!isUploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>}
          </div>
          <div className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">{profile.first_name ? `Change Picture` : 'Profile'}</div>
        </div>

        <div className={`w-8 h-px my-4 shrink-0 rounded-full ${divider}`} />

        <nav className="flex flex-col gap-2 w-full px-2 flex-1 items-center">
          {navItems.map((item) => (
            <div key={item.name} className="relative group">
              <div onClick={() => onSelectTab && onSelectTab(item.name)} className={`w-12 h-12 flex items-center justify-center rounded-2xl cursor-pointer transition-all shrink-0 ${activeTab === item.name ? `${theme.activeTab} shadow-sm border border-white/5` : iconIdle}`}>
                <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === item.name ? "2.5" : "2"} d={item.icon} /></svg>
              </div>
              <div className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">{item.name}</div>
            </div>
          ))}
        </nav>

        <div className={`w-8 h-px my-4 shrink-0 rounded-full ${divider}`} />

        <div className="relative group mb-2">
          <div onClick={() => onSelectTab && onSelectTab('Settings')} className={`w-12 h-12 flex items-center justify-center rounded-2xl cursor-pointer transition-all shrink-0 ${activeTab === 'Settings' ? `${theme.activeTab} shadow-sm border border-white/5` : iconIdle}`}>
            <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'Settings' ? "2.5" : "2"} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">Settings</div>
        </div>

        <div className="relative group">
          <button onClick={handleLogout} className="w-12 h-12 flex items-center justify-center rounded-2xl text-red-400 hover:bg-red-500/20 hover:text-red-400 transition-colors shrink-0">
            <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
          <div className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">Log Out</div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;