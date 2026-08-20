import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { useNavigate } from 'react-router-dom';

function StudentOverview() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [department, setDepartment] = useState('');
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  
  // Metrics
  const [totalHours, setTotalHours] = useState(0);
  const [requiredHours, setRequiredHours] = useState(0);
  const [recentLogs, setRecentLogs] = useState([]);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper to parse "9h 30m" into a decimal number (9.5)
  const parseHoursToDecimal = (timeStr) => {
    if (!timeStr) return 0;
    let h = 0, m = 0;
    const hMatch = timeStr.match(/(\d+)h/);
    const mMatch = timeStr.match(/(\d+)m/);
    if (hMatch) h = parseInt(hMatch[1], 10);
    if (mMatch) m = parseInt(mMatch[1], 10);
    return h + (m / 60);
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Profile
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      setDepartment(profileData?.department || '');

      // 2. Fetch Company (if assigned)
      let compData = null;
      if (profileData?.company_id) {
        const { data } = await supabase.from('companies').select('*').eq('id', profileData.company_id).single();
        compData = data;
        setCompany(data);
        setRequiredHours(data?.required_hours || 0);
      }

      // 3. Fetch all logs for this student
      const { data: logsData } = await supabase.from('daily_logs').select('*').eq('user_id', user.id).order('date', { ascending: false });
      
      if (logsData) {
        setRecentLogs(logsData.slice(0, 4)); // Get latest 4 logs
        
        // Calculate total hours
        let totalDec = 0;
        logsData.forEach(log => {
          totalDec += parseHoursToDecimal(log.hours);
        });
        setTotalHours(totalDec);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { primary: 'bg-purple-600', text: 'text-purple-400', border: 'border-purple-500/30', ringColor: '#a855f7', bgLight: 'bg-purple-500/20' };
      case 'BSAB': return { primary: 'bg-green-600', text: 'text-green-400', border: 'border-green-500/30', ringColor: '#22c55e', bgLight: 'bg-green-500/20' };
      case 'BSHM': return { primary: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30', ringColor: '#eab308', bgLight: 'bg-yellow-500/20' };
      case 'BSCRIM': return { primary: 'bg-rose-700', text: 'text-rose-400', border: 'border-rose-500/30', ringColor: '#be123c', bgLight: 'bg-rose-500/20' };
      case 'COTED': return { primary: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500/30', ringColor: '#3b82f6', bgLight: 'bg-blue-500/20' };
      default: return { primary: 'bg-gray-700', text: 'text-gray-400', border: 'border-gray-500/30', ringColor: '#6b7280', bgLight: 'bg-gray-500/20' };
    }
  };

  const theme = getThemeColors(department);
  const bgCard = isDarkMode ? 'bg-[#1e1e2d]/60 border-white/5 shadow-lg backdrop-blur-md' : 'bg-white border-gray-200 shadow-sm';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  // Math for Circular Progress Ring
  const progressPercent = requiredHours > 0 ? Math.min((totalHours / requiredHours) * 100, 100) : 0;
  const radius = 70; 
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${theme.border}`}></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 md:pt-10">
      
      {/* Minimalist KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Company Card - With Embedded Logo & Status */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between h-[120px] ${bgCard} relative overflow-hidden`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 ${theme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Deployment</span>
            </div>
            
            {/* Company Logo Display */}
            {company && (
              company.logo_url ? (
                <img src={company.logo_url} alt="Logo" className={`w-10 h-10 rounded-xl object-cover shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-100'} absolute top-4 right-4`} />
              ) : (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 absolute top-4 right-4 ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                  <span className="text-[11px] font-black uppercase tracking-wider">{company.name.substring(0, 2)}</span>
                </div>
              )
            )}
          </div>
          
          <div className="pr-12"> {/* Padding ensures text avoids the absolute logo */}
            <h3 className={`text-xl font-bold truncate ${textMain}`}>{company ? company.name : 'Unassigned'}</h3>
            {company ? (
              <div className="mt-1 flex items-center gap-1.5">
                {profile?.company_status === 'pending' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending Approval</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Active Intern</span>
                  </>
                )}
              </div>
            ) : (
              <p className={`text-[11px] mt-1 font-medium text-amber-500 uppercase tracking-wider`}>Action Required</p>
            )}
          </div>
        </div>

        {/* Total Hours Card */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between h-[120px] ${bgCard}`}>
          <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 ${theme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Total Logged</span>
          </div>
          <div>
            <h3 className={`text-3xl font-bold ${textMain}`}>{totalHours.toFixed(1)}</h3>
          </div>
        </div>

        {/* Remaining Hours Card */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between h-[120px] ${bgCard}`}>
          <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 ${theme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Remaining</span>
          </div>
          <div>
            <h3 className={`text-3xl font-bold ${textMain}`}>{Math.max(requiredHours - totalHours, 0).toFixed(1)}</h3>
          </div>
        </div>

        {/* Total Logs Card */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between h-[120px] ${bgCard}`}>
          <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 ${theme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Total Logs</span>
          </div>
          <div>
            <h3 className={`text-3xl font-bold ${textMain}`}>{recentLogs.length}</h3>
          </div>
        </div>
      </div>

      {/* Main Graphs & Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Progress Graph (Left Column) */}
        <div className={`p-6 rounded-2xl border flex flex-col items-center relative ${bgCard} min-h-[340px]`}>
          <h3 className={`text-[12px] font-bold uppercase tracking-wider w-full text-left mb-6 ${textMain}`}>Completion Progress</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="relative flex items-center justify-center mb-6">
              <svg className="transform -rotate-90 w-48 h-48">
                {/* Background Ring */}
                <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="16" fill="transparent" className={isDarkMode ? 'text-white/5' : 'text-gray-100'} />
                {/* Foreground Progress Ring */}
                <circle 
                  cx="96" 
                  cy="96" 
                  r={radius} 
                  stroke={theme.ringColor} 
                  strokeWidth="16" 
                  fill="transparent" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={strokeDashoffset} 
                  strokeLinecap="round" 
                  className="transition-all duration-1000 ease-out" 
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${textMain}`}>{Math.round(progressPercent)}%</span>
                <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${textMuted}`}>Completed</span>
              </div>
            </div>

            {/* Dot Legend */}
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.ringColor }}></span>
                <span className={`text-[11px] font-medium ${textMuted}`}>Logged ({totalHours.toFixed(1)})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></span>
                <span className={`text-[11px] font-medium ${textMuted}`}>Remaining ({Math.max(requiredHours - totalHours, 0).toFixed(1)})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Table (Right 2 Columns) */}
        <div className={`rounded-2xl border flex flex-col lg:col-span-2 overflow-hidden ${bgCard} min-h-[340px]`}>
          <div className={`px-6 py-5 border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
             <h3 className={`text-[12px] font-bold uppercase tracking-wider ${textMain}`}>Recent Shifts Logged</h3>
          </div>
          
          {recentLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <p className={`text-[13px] italic ${textMuted}`}>No recent logs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {recentLogs.map((log, index) => (
                    <tr key={log.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50/80'}`}>
                      <td className={`py-4 px-6 text-[13px] font-bold ${textMain}`}>{log.date}</td>
                      <td className={`py-4 px-6 text-[12px] truncate max-w-[200px] ${textMuted}`}>{log.description || 'No description'}</td>
                      <td className={`py-4 px-6 text-[13px] font-bold text-right ${theme.text}`}>{log.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default StudentOverview;