import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../api/supabaseClient';

function Settings() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [userId, setUserId] = useState(null);
  const [department, setDepartment] = useState('');
  const [companyName, setCompanyName] = useState('Unassigned');
  const [profileData, setProfileData] = useState({ first_name: '', last_name: '', department: '', avatar_url: '', raw_password: '' });
  
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false); 
  
  const fileInputRef = useRef(null);

  // GLOBAL DARK MODE
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const toggleDarkMode = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    window.dispatchEvent(new Event('themeChange')); 
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
          setProfileData(profile);
          setDepartment(profile.department || ''); 

          // Fetch assigned company name
          if (profile.company_id) {
            const { data: compData } = await supabase.from('companies').select('name').eq('id', profile.company_id).single();
            if (compData) setCompanyName(compData.name);
          }
        }
      } catch (error) {
        showFeedback('error', 'Failed to load profile data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  };

  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { primary: 'bg-purple-600', text: 'text-purple-600', ring: 'focus:ring-purple-500' };
      case 'BSAB': return { primary: 'bg-green-600', text: 'text-green-600', ring: 'focus:ring-green-500' };
      case 'BSHM': return { primary: 'bg-yellow-500', text: 'text-yellow-500', ring: 'focus:ring-yellow-400' };
      case 'BSCRIM': return { primary: 'bg-rose-700', text: 'text-rose-700', ring: 'focus:ring-rose-500' };
      case 'COTED': return { primary: 'bg-blue-600', text: 'text-blue-600', ring: 'focus:ring-blue-500' };
      default: return { primary: 'bg-gray-800', text: 'text-gray-800', ring: 'focus:ring-gray-500' };
    }
  };

  const theme = getThemeColors(department);

  // Dynamic Variables
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderDivider = isDarkMode ? 'border-white/10' : 'border-gray-200';
  const bgInput = isDarkMode ? 'bg-black/40 border-white/10 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900';
  const tabHover = isDarkMode ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-gray-50 hover:text-gray-900';
  const tabActive = isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900';

  const handleProfileChange = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

  const handleAvatarUpload = async (event) => {
    try {
      setIsSaving(true);
      const file = event.target.files[0];
      if (!file) return;
      const fileName = `supervisor-${userId}-${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      window.location.reload();
    } catch (error) { 
      showFeedback('error', 'Error uploading image.'); 
      setIsSaving(false); 
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await supabase.from('profiles').update({
        first_name: profileData.first_name,
        last_name: profileData.last_name
      }).eq('id', userId);
      window.location.reload();
    } catch (error) { 
      showFeedback('error', 'Failed to update profile.'); 
      setIsSaving(false); 
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) return showFeedback('error', 'Passwords do not match.');
    setIsSaving(true);
    try {
      await supabase.auth.updateUser({ password: passwordData.newPassword });
      await supabase.from('profiles').update({ raw_password: passwordData.newPassword }).eq('id', userId);
      setProfileData({ ...profileData, raw_password: passwordData.newPassword });
      setPasswordData({ newPassword: '', confirmPassword: '' });
      showFeedback('success', 'Password updated successfully!');
    } catch (error) { 
      showFeedback('error', 'Failed to update password.'); 
    } finally { 
      setIsSaving(false); 
    }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-t-transparent border-gray-400 rounded-full animate-spin"></div></div>;

  return (
    <div className="h-full flex flex-col p-4 sm:p-8 animate-fade-in w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
      {feedback.message && (
        <div className={`mb-6 p-3 rounded-lg text-[13px] font-bold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {feedback.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 mt-2 w-full">
        <div className="w-full md:w-[220px] shrink-0">
          {/* Scrollable Tabs on Mobile */}
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
            <button onClick={() => setActiveTab('Profile')} className={`shrink-0 whitespace-nowrap text-left px-3 py-2 text-[13px] font-bold rounded-lg transition-colors ${activeTab === 'Profile' ? tabActive : `text-gray-500 ${tabHover}`}`}>Public profile</button>
            <button onClick={() => setActiveTab('Appearance')} className={`shrink-0 whitespace-nowrap text-left px-3 py-2 text-[13px] font-bold rounded-lg transition-colors ${activeTab === 'Appearance' ? tabActive : `text-gray-500 ${tabHover}`}`}>Appearance</button>
            <button onClick={() => setActiveTab('Security')} className={`shrink-0 whitespace-nowrap text-left px-3 py-2 text-[13px] font-bold rounded-lg transition-colors ${activeTab === 'Security' ? tabActive : `text-gray-500 ${tabHover}`}`}>Account security</button>
          </nav>
        </div>

        <div className="flex-1 w-full max-w-3xl">
          {activeTab === 'Profile' && (
            <div className="animate-fade-in w-full">
              <h3 className={`text-lg font-bold mb-1 ${textMain}`}>Public profile</h3>
              <div className={`border-b mb-6 ${borderDivider}`}></div>
              
              <div className="flex flex-col-reverse md:flex-row gap-8 w-full">
                <form onSubmit={saveProfile} className="flex-1 flex flex-col gap-5 w-full">
                  {/* Fixed Grid for Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[12px] font-bold mb-1.5 ${textMuted}`}>First Name</label>
                      <input type="text" name="first_name" value={profileData.first_name} onChange={handleProfileChange} required className={`w-full px-3 py-2 rounded-md outline-none transition-colors ${bgInput} ${theme.ring}`} />
                    </div>
                    <div>
                      <label className={`block text-[12px] font-bold mb-1.5 ${textMuted}`}>Last Name</label>
                      <input type="text" name="last_name" value={profileData.last_name} onChange={handleProfileChange} required className={`w-full px-3 py-2 rounded-md outline-none transition-colors ${bgInput} ${theme.ring}`} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[12px] font-bold mb-1.5 ${textMuted}`}>Department</label>
                      <input type="text" value={department} disabled className={`w-full px-3 py-2 rounded-md outline-none transition-colors opacity-60 cursor-not-allowed ${bgInput}`} />
                    </div>
                    <div>
                      <label className={`block text-[12px] font-bold mb-1.5 ${textMuted}`}>Assigned Company</label>
                      <input type="text" value={companyName} disabled className={`w-full px-3 py-2 rounded-md outline-none transition-colors opacity-60 cursor-not-allowed ${bgInput}`} />
                    </div>
                  </div>
                  <p className={`text-[11px] -mt-2 ${textMuted}`}>You cannot change your assigned department or company. Contact your admin if this is incorrect.</p>

                  <div className="pt-2">
                    <button type="submit" disabled={isSaving} className={`w-full sm:w-auto px-6 py-2.5 rounded-md font-bold text-[12px] text-white transition-colors ${theme.primary}`}>
                      {isSaving ? 'Saving...' : 'Update profile'}
                    </button>
                  </div>
                </form>

                <div className="w-full md:w-[200px] shrink-0 flex flex-col items-center md:items-start">
                  <label className={`block text-[12px] font-bold mb-1.5 w-full text-center md:text-left ${textMuted}`}>Profile picture</label>
                  <div className={`relative group inline-block rounded-full w-[160px] h-[160px] md:w-[200px] md:h-[200px] overflow-hidden border-4 ${borderDivider} ${isDarkMode ? 'bg-black/20' : 'bg-gray-100'}`}>
                    {profileData.avatar_url ? (
                      <img src={profileData.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'text-white' : theme.text}`}>
                        <svg className="w-20 h-20 md:w-24 md:h-24 opacity-60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                      </div>
                    )}
                    <div onClick={() => !isSaving && fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all"><span className="text-[11px] font-bold text-white">Edit</span></div>
                  </div>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Appearance' && (
            <div className="animate-fade-in w-full">
              <h3 className={`text-lg font-bold mb-1 ${textMain}`}>Appearance</h3>
              <div className={`border-b mb-6 ${borderDivider}`}></div>
              
              <div className={`flex items-center justify-between w-full max-w-md p-4 rounded-xl border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                <div className="pr-4">
                  <p className={`font-bold text-[14px] ${textMain}`}>Dark Mode</p>
                  <p className={`text-[12px] mt-0.5 ${textMuted}`}>Switch between light mode and dark mode.</p>
                </div>
                <button onClick={toggleDarkMode} className={`shrink-0 w-12 h-6 rounded-full flex items-center transition-colors px-1 ${isDarkMode ? theme.primary.split(' ')[0] : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="animate-fade-in w-full">
              <h3 className={`text-lg font-bold mb-1 ${textMain}`}>Account Security</h3>
              <div className={`border-b mb-6 ${borderDivider}`}></div>
              
              <div className="mb-6 w-full max-w-md">
                <label className={`block text-[12px] font-bold mb-1.5 ${textMuted}`}>Current Password</label>
                <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <span className={`text-[13px] truncate pr-4 ${!profileData.raw_password ? 'italic opacity-70 text-amber-500 font-medium' : 'font-mono tracking-wide'} ${textMain}`}>
                    {showCurrentPassword ? (profileData.raw_password || 'Private Password') : '••••••••••••'}
                  </span>
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className={`shrink-0 transition-colors p-1 rounded-md ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'}`}>
                    {showCurrentPassword ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                  </button>
                </div>
              </div>

              <form onSubmit={savePassword} className="flex flex-col gap-5 w-full max-w-md pt-4 border-t border-dashed border-gray-300/30">
                <div>
                  <label className={`block text-[12px] font-bold mb-1.5 ${textMuted}`}>Change to New Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required placeholder="Enter new password" minLength="6" className={`w-full px-3 py-2 pr-10 rounded-md outline-none transition-colors ${bgInput} ${theme.ring}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={`block text-[12px] font-bold mb-1.5 ${textMuted}`}>Confirm New Password</label>
                  <input type={showPassword ? "text" : "password"} name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required placeholder="Confirm new password" minLength="6" className={`w-full px-3 py-2 pr-10 rounded-md outline-none transition-colors ${bgInput} ${theme.ring}`} />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={isSaving || !passwordData.newPassword} className={`w-full sm:w-auto px-6 py-2.5 rounded-md font-bold text-[12px] text-white transition-colors ${theme.primary} disabled:opacity-50`}>
                    {isSaving ? 'Updating...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default Settings;