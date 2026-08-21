import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';

function Company() {
  const [department, setDepartment] = useState('');
  const [profile, setProfile] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for tracking logged hours
  const [totalHours, setTotalHours] = useState(0);
  
  // State for the Tutorial Banner
  const [hideTutorial, setHideTutorial] = useState(false);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GLOBAL DARK MODE LISTENER
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const userDept = profileData?.department || '';
      
      setProfile(profileData || {});
      setDepartment(userDept);

      // Fetch student's daily logs to calculate total hours rendered
      const { data: logsData } = await supabase.from('daily_logs').select('hours').eq('user_id', user.id);
      let totalDec = 0;
      (logsData || []).forEach(log => {
        totalDec += parseHoursToDecimal(log.hours);
      });
      setTotalHours(totalDec);

      let compQuery = supabase.from('companies').select('*');
      if (userDept) compQuery = compQuery.eq('department', userDept);
      const { data: companiesData } = await compQuery;
      
      // Fetch students with their company status to accurately count APPROVED and PENDING slots
      let stuQuery = supabase.from('profiles').select('company_id, company_status').eq('role', 'student');
      if (userDept) stuQuery = stuQuery.eq('department', userDept);
      const { data: studentsData } = await stuQuery;

      let supQuery = supabase.from('profiles').select('*').eq('role', 'supervisor');
      if (userDept) supQuery = supQuery.eq('department', userDept);
      const { data: supervisorsData } = await supQuery;

      setSupervisors(supervisorsData || []);

      const formattedCompanies = (companiesData || []).map(comp => {
        // Count both active and pending students to prevent over-requesting slots
        const assignedCount = (studentsData || []).filter(s => String(s.company_id) === String(comp.id)).length;
        const isFull = assignedCount >= (comp.capacity || 0);
        const compSupervisors = (supervisorsData || []).filter(s => String(s.company_id) === String(comp.id));
        
        return { ...comp, assignedCount, isFull, supervisors: compSupervisors };
      });

      // Sort so the assigned/pending company always appears at the very top of the table
      if (profileData?.company_id) {
        formattedCompanies.sort((a, b) => {
          if (String(a.id) === String(profileData.company_id)) return -1;
          if (String(b.id) === String(profileData.company_id)) return 1;
          return 0;
        });
      }

      setCompanies(formattedCompanies);

    } catch (error) {
      console.error("Critical Error fetching data:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { primary: 'bg-purple-600', text: 'text-purple-400', border: 'border-purple-500/30', bgLight: 'bg-purple-500/20', ring: 'focus:ring-purple-500' };
      case 'BSAB': return { primary: 'bg-green-600', text: 'text-green-400', border: 'border-green-500/30', bgLight: 'bg-green-500/20', ring: 'focus:ring-green-500' };
      case 'BSHM': return { primary: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30', bgLight: 'bg-yellow-500/20', ring: 'focus:ring-yellow-400' };
      case 'BSCRIM': return { primary: 'bg-rose-700', text: 'text-rose-400', border: 'border-rose-500/30', bgLight: 'bg-rose-500/20', ring: 'focus:ring-rose-500' };
      case 'COTED': return { primary: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500/30', bgLight: 'bg-blue-500/20', ring: 'focus:ring-blue-500' };
      default: return { primary: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-500/30', bgLight: 'bg-gray-500/20', ring: 'focus:ring-gray-500' };
    }
  };

  const theme = getThemeColors(department);
  const bgCard = isDarkMode ? 'bg-gray-900/40 border-white/10 shadow-lg' : 'bg-white border-gray-200 shadow-sm';
  const bgHeader = isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200';
  const bgInput = isDarkMode ? 'bg-black/40 border-white/10 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const bgHover = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50/80';

  const handleSelectCompany = async () => {
    if (!profile?.id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('profiles').update({ 
        company_id: selectedCompany.id,
        company_status: 'pending' 
      }).eq('id', profile.id);
      
      if (error) throw error;
      
      await fetchData();
      setIsConfirmModalOpen(false);
    } catch (error) {
      alert("Failed to request company: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCompanies = companies.filter(comp => {
    const query = searchQuery.toLowerCase();
    const matchesName = (comp.name || '').toLowerCase().includes(query);
    const matchesAddress = (comp.address || '').toLowerCase().includes(query);
    const matchesSupervisor = (comp.supervisors || []).some(s => 
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(query)
    );
    return matchesName || matchesAddress || matchesSupervisor;
  });

  const hasAssignedCompany = !!profile?.company_id;
  const isStatusPending = profile?.company_status === 'pending';
  const showTutorialBanner = !hasAssignedCompany && !hideTutorial && companies.length > 0;

  // PRE-PROCESS DATA FOR BOTH MOBILE & DESKTOP VIEWS
  const processedCompanies = filteredCompanies.map(comp => {
    const isMyCompany = hasAssignedCompany && String(profile.company_id) === String(comp.id);
    const isDimmed = hasAssignedCompany && !isMyCompany;
    const hoursLeft = Math.max(comp.required_hours - totalHours, 0);

    // Desktop Row Styling
    let rowClass = `transition-all duration-300 `;
    if (isMyCompany) {
      if (isStatusPending) {
        rowClass += isDarkMode ? 'bg-blue-500/10 border-l-4 border-blue-500' : 'bg-blue-50 border-l-4 border-blue-500';
      } else {
        rowClass += isDarkMode ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : 'bg-emerald-50 border-l-4 border-emerald-500';
      }
    } else if (isDimmed) {
      rowClass += `opacity-40 grayscale-[30%] pointer-events-none ${bgHover}`;
    } else {
      rowClass += `group ${bgHover} border-l-4 border-transparent`;
    }

    // Mobile Card Styling
    let cardClass = `transition-all duration-300 rounded-xl border p-4 flex flex-col gap-3 relative overflow-hidden shadow-sm `;
    if (isMyCompany) {
      if (isStatusPending) {
        cardClass += isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200';
      } else {
        cardClass += isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200';
      }
    } else if (isDimmed) {
      cardClass += `opacity-40 grayscale-[30%] pointer-events-none ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'}`;
    } else {
      cardClass += isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100';
    }

    return { ...comp, isMyCompany, isDimmed, hoursLeft, rowClass, cardClass };
  });

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 animate-fade-in w-full relative overflow-hidden">
      
      {/* Top Search Bar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between w-full mb-4 gap-3 p-3 rounded-xl border shrink-0 ${bgCard}`}>
        <div className="relative w-full max-w-sm flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text" 
            placeholder="Search by company name, address, or supervisor..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors ${bgInput} focus:ring-1 ${theme.ring}`} 
          />
        </div>
      </div>

      {/* DISMISSIBLE ONBOARDING BANNER */}
      {showTutorialBanner && (
        <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-500 tracking-wide uppercase">Step 2: Request Deployment</h4>
              <p className={`text-[12px] mt-0.5 leading-snug ${textMuted}`}>Browse the list below. When you find the company you want to render your internship with, click <b>Select</b> to send an approval request to your Admin.</p>
            </div>
          </div>
          <button onClick={() => setHideTutorial(true)} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-[11px] uppercase tracking-wider font-extrabold rounded-lg shadow-sm transition-colors whitespace-nowrap">
            Okay, Got it!
          </button>
        </div>
      )}

      {/* PENDING APPROVAL BANNER */}
      {hasAssignedCompany && isStatusPending && (
        <div className="mb-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-center gap-4 animate-fade-in shrink-0">
          <div className="w-10 h-10 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-blue-500 tracking-wide uppercase">Request Sent</h4>
            <p className={`text-[12px] mt-0.5 leading-snug ${textMuted}`}>Your request is currently waiting for administrator approval. You will be notified once it is accepted or declined.</p>
          </div>
        </div>
      )}

      <div className={`flex-1 rounded-xl overflow-hidden flex flex-col relative border ${bgCard}`}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${theme.border}`}></div>
          </div>
        ) : processedCompanies.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
             <h3 className={`text-sm font-bold mb-1 ${textMain}`}>No companies found</h3>
             <p className={`text-xs ${textMuted}`}>Wait for your admin to add companies or adjust your search.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            
            {/* ============================== */}
            {/* 🖥️ DESKTOP VIEW (TABLE)        */}
            {/* ============================== */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className={`sticky top-0 z-10 border-b ${bgHeader}`}>
                  <tr>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Company Profile</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Supervisor(s)</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-center ${textMuted}`}>Slots</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-center ${textMuted}`}>Req. Hours</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted} w-40`}>Your Progress</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-right ${textMuted}`}>Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {processedCompanies.map(comp => (
                    <tr key={comp.id} className={comp.rowClass}>
                      
                      {/* COMPANY PROFILE */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {comp.logo_url ? (
                            <img src={comp.logo_url} className={`w-10 h-10 rounded-lg object-cover shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`} />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className={`text-[13px] font-bold ${textMain}`}>{comp.name}</span>
                            <span className={`text-[11px] truncate max-w-[200px] xl:max-w-[300px] ${textMuted}`}>{comp.address || 'No address provided'}</span>
                          </div>
                        </div>
                      </td>

                      {/* SUPERVISORS */}
                      <td className="py-3 px-4">
                        {comp.supervisors && comp.supervisors.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {comp.supervisors.map(sup => (
                              <div key={sup.id} className="flex items-center gap-2">
                                {sup.avatar_url ? (
                                  <img src={sup.avatar_url} className={`w-5 h-5 rounded-full object-cover border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
                                ) : (
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                                    {sup.first_name?.charAt(0)}{sup.last_name?.charAt(0)}
                                  </div>
                                )}
                                <span className={`text-[12px] font-medium ${textMain}`}>{sup.first_name} {sup.last_name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className={`text-[11px] italic ${textMuted}`}>Pending Assignment</span>
                        )}
                      </td>

                      {/* SLOTS */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <div className="flex items-baseline text-[13px] font-bold">
                            <span className={comp.isFull && !comp.isMyCompany ? 'text-red-500' : textMain}>{comp.assignedCount}</span>
                            <span className={`mx-1 ${textMuted}`}>/</span>
                            <span className={textMuted}>{comp.capacity}</span>
                          </div>
                          {comp.isFull && !comp.isMyCompany && <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Full</span>}
                        </div>
                      </td>

                      {/* REQ HOURS */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[12px] font-bold ${textMain}`}>{comp.required_hours} hrs</span>
                      </td>

                      {/* PROGRESS COLUMN */}
                      <td className="py-3 px-4">
                        {comp.isMyCompany && !isStatusPending ? (
                          <div className="flex flex-col gap-1.5 w-full min-w-[120px]">
                            <div className="flex justify-between items-end">
                              <span className={`text-[10px] font-bold ${textMuted}`}>{totalHours.toFixed(1)} / {comp.required_hours}</span>
                              <span className={`text-[10px] font-bold ${comp.hoursLeft === 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {comp.hoursLeft.toFixed(1)} left
                              </span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${theme.primary}`} 
                                style={{ width: `${Math.min((totalHours / (comp.required_hours || 1)) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <div className={`text-center text-[12px] font-medium ${textMuted}`}>-</div>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-4 text-right">
                        {comp.isMyCompany ? (
                          isStatusPending ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                              Active
                            </span>
                          )
                        ) : comp.isDimmed ? (
                          <button disabled className={`px-3 py-1.5 rounded-md text-[11px] font-bold shadow-sm ${isDarkMode ? 'bg-white/5 text-gray-500 border border-white/5' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`}>
                            Locked
                          </button>
                        ) : (
                          <button 
                            onClick={() => { setSelectedCompany(comp); setIsConfirmModalOpen(true); }}
                            disabled={comp.isFull}
                            className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all shadow-sm ${
                              comp.isFull 
                                ? (isDarkMode ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5' : 'bg-gray-100 text-gray-400 cursor-not-allowed') 
                                : `text-white ${theme.primary} hover:opacity-90`
                            }`}
                          >
                            {comp.isFull ? 'Full' : 'Select'}
                          </button>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ============================== */}
            {/* 📱 MOBILE VIEW (CARDS)         */}
            {/* ============================== */}
            <div className="md:hidden flex flex-col gap-3 p-3 w-full">
              {processedCompanies.map(comp => (
                <div key={comp.id} className={comp.cardClass}>
                  
                  {/* Card Header: Profile */}
                  <div className="flex items-center gap-3 w-full">
                    {comp.logo_url ? (
                      <img src={comp.logo_url} className={`w-10 h-10 rounded-lg object-cover shadow-sm border shrink-0 ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`} />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className={`text-[13px] font-bold truncate ${textMain}`}>{comp.name}</span>
                      <span className={`text-[11px] truncate ${textMuted}`}>{comp.address || 'No address provided'}</span>
                    </div>
                  </div>

                  <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}></div>

                  {/* Card Body: Stats */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 w-full">
                    
                    {/* Supervisor */}
                    <div className="flex flex-col">
                      <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${textMuted}`}>Supervisor</span>
                      {comp.supervisors && comp.supervisors.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          {comp.supervisors[0].avatar_url ? (
                            <img src={comp.supervisors[0].avatar_url} className={`w-4 h-4 rounded-full object-cover border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
                          ) : (
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                              {comp.supervisors[0].first_name?.charAt(0)}{comp.supervisors[0].last_name?.charAt(0)}
                            </div>
                          )}
                          <span className={`text-[11px] font-medium truncate ${textMain}`}>
                            {comp.supervisors[0].first_name} {comp.supervisors.length > 1 && `+${comp.supervisors.length - 1}`}
                          </span>
                        </div>
                      ) : (
                        <span className={`text-[11px] italic ${textMuted}`}>Pending Assignment</span>
                      )}
                    </div>

                    {/* Req Hours */}
                    <div className="flex flex-col">
                      <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${textMuted}`}>Req. Hours</span>
                      <span className={`text-[12px] font-bold ${textMain}`}>{comp.required_hours} hrs</span>
                    </div>

                    {/* Slots */}
                    <div className="flex flex-col">
                      <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${textMuted}`}>Available Slots</span>
                      <div className="flex items-center">
                        <span className={`text-[12px] font-bold ${comp.isFull && !comp.isMyCompany ? 'text-red-500' : textMain}`}>{comp.assignedCount}</span>
                        <span className={`mx-1 text-[11px] font-bold ${textMuted}`}>/</span>
                        <span className={`text-[12px] font-bold ${textMuted}`}>{comp.capacity}</span>
                        {comp.isFull && !comp.isMyCompany && <span className="ml-2 bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Full</span>}
                      </div>
                    </div>
                    
                    {/* Empty placeholder for grid balance */}
                    <div></div>
                  </div>

                  {/* Mobile Progress Bar (If Active) */}
                  {comp.isMyCompany && !isStatusPending && (
                    <div className="flex flex-col gap-1.5 w-full mt-1">
                      <div className="flex justify-between items-end">
                        <span className={`text-[10px] font-bold ${textMuted}`}>{totalHours.toFixed(1)} / {comp.required_hours} rendered</span>
                        <span className={`text-[10px] font-bold ${comp.hoursLeft === 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {comp.hoursLeft.toFixed(1)} left
                        </span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${theme.primary}`} 
                          style={{ width: `${Math.min((totalHours / (comp.required_hours || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Card Action Button */}
                  <div className={`mt-1 pt-3 border-t flex justify-end w-full ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                    {comp.isMyCompany ? (
                      isStatusPending ? (
                        <span className="w-full justify-center inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Pending Approval
                        </span>
                      ) : (
                        <span className="w-full justify-center inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                          Currently Active
                        </span>
                      )
                    ) : comp.isDimmed ? (
                      <button disabled className={`w-full justify-center px-3 py-2 rounded-lg text-[12px] font-bold shadow-sm ${isDarkMode ? 'bg-white/5 text-gray-500 border border-white/5' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`}>
                        Locked
                      </button>
                    ) : (
                      <button 
                        onClick={() => { setSelectedCompany(comp); setIsConfirmModalOpen(true); }}
                        disabled={comp.isFull}
                        className={`w-full justify-center px-4 py-2 rounded-lg text-[12px] font-bold transition-all shadow-sm ${
                          comp.isFull 
                            ? (isDarkMode ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5' : 'bg-gray-100 text-gray-400 cursor-not-allowed') 
                            : `text-white ${theme.primary} hover:opacity-90`
                        }`}
                      >
                        {comp.isFull ? 'No Slots Available' : 'Select Company'}
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      {/* PROFESSIONAL CONFIRMATION MODAL */}
      {isConfirmModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border ${isDarkMode ? 'bg-[#1e1e2d] border-white/10' : 'bg-white border-gray-200'}`}>
            
            <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
              <h3 className={`text-[14px] font-bold uppercase tracking-wider ${textMain}`}>Request Deployment</h3>
              <button onClick={() => setIsConfirmModalOpen(false)} className={`${textMuted} hover:text-red-500 transition-colors`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6">
              <div className={`flex items-start gap-4 p-4 rounded-lg border mb-5 ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                <svg className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <h4 className="text-[13px] font-bold text-blue-500 uppercase tracking-wider mb-1">Approval Required</h4>
                  <p className={`text-[12px] leading-relaxed ${isDarkMode ? 'text-blue-200/80' : 'text-blue-700/80'}`}>
                    You are requesting <span className="font-bold text-blue-500">{selectedCompany.name}</span> as your deployment. Your status will remain pending until your Administrator officially approves the request.
                  </p>
                </div>
              </div>
              
              <div className={`flex flex-col gap-3 p-4 rounded-lg border ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex justify-between items-center text-[12px]">
                  <span className={textMuted}>Target Company:</span>
                  <span className={`font-bold ${textMain}`}>{selectedCompany.name}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className={textMuted}>Required Hours:</span>
                  <span className={`font-bold ${textMain}`}>{selectedCompany.required_hours} hrs</span>
                </div>
              </div>
            </div>

            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
              <button onClick={() => setIsConfirmModalOpen(false)} className={`px-4 py-2 rounded-lg font-bold text-[12px] transition-colors ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>
                Cancel
              </button>
              <button onClick={handleSelectCompany} disabled={isSubmitting} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-[12px] text-white shadow-sm disabled:opacity-50 transition-colors ${theme.primary} hover:opacity-90`}>
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending Request...
                  </>
                ) : (
                  'Send Request'
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px; }`}</style>
    </div>
  );
}

export default Company;