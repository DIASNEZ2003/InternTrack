import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';

function Overview() {
  const [isLoading, setIsLoading] = useState(true);
  const [department, setDepartment] = useState('');
  const [hasCompany, setHasCompany] = useState(true);
  const [companyData, setCompanyData] = useState({});
  const [processingId, setProcessingId] = useState(null); 
  
  // Dashboard Data States
  const [metrics, setMetrics] = useState({
    totalInterns: 0,
    pendingInterns: 0,
    activeInterns: 0,
    totalReports: 0
  });
  
  const [chartData, setChartData] = useState([]);
  const [activeRoster, setActiveRoster] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // GLOBAL DARK MODE LISTENER
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get Supervisor Profile
      const { data: supProfile } = await supabase.from('profiles').select('department, company_id').eq('id', user.id).single();
      
      if (supProfile) {
        setDepartment(supProfile.department || '');
        
        if (!supProfile.company_id) {
          setHasCompany(false);
          setIsLoading(false);
          return;
        }

        const compId = supProfile.company_id;

        // 2. Fetch Data relevant ONLY to this company
        const [studentsRes, companyRes, reportsRes] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, company_id, avatar_url, company_status').eq('company_id', compId).eq('role', 'student'),
          supabase.from('companies').select('*').eq('id', compId).single(),
          supabase.from('saved_journals').select('id, user_id, week_number, file_name, created_at').order('created_at', { ascending: false })
        ]);

        const students = studentsRes.data || [];
        const companyInfo = companyRes.data || {};
        const allReports = reportsRes.data || [];

        setCompanyData(companyInfo);

        // Filter reports to only include this company's students
        const studentIds = students.map(s => s.id);
        const compReports = allReports.filter(r => studentIds.includes(r.user_id));

        // 3. Compute Metrics
        const pendingCount = students.filter(s => s.company_status === 'pending').length;
        const activeCount = students.filter(s => s.company_status === 'active').length;
        
        setMetrics({
          totalInterns: students.length,
          pendingInterns: pendingCount,
          activeInterns: activeCount,
          totalReports: compReports.length
        });

        // 4. Compute Chart Data (Reports per week)
        const weekCounts = {};
        compReports.forEach(r => {
          const w = r.week_number || 'Other';
          weekCounts[w] = (weekCounts[w] || 0) + 1;
        });
        const formattedChartData = Object.keys(weekCounts).sort().map(week => ({
          week: week.replace('Week', 'Wk').trim(),
          count: weekCounts[week]
        }));
        setChartData(formattedChartData);

        // 5. Format Active Roster
        const activeStus = students.filter(s => s.company_status === 'active').slice(0, 5);
        setActiveRoster(activeStus);

        // 6. Format Recent Reports
        const recent = compReports.slice(0, 5).map(r => {
          const student = students.find(s => s.id === r.user_id);
          return { ...r, student };
        });
        setRecentReports(recent);

        // 7. Format Pending Requests
        const pending = students.filter(s => s.company_status === 'pending');
        setPendingRequests(pending);
      }
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- APPROVAL LOGIC ---
  const handleAcceptRequest = async (studentId) => {
    setProcessingId(studentId);
    try {
      await supabase.from('profiles').update({ company_status: 'active' }).eq('id', studentId);
      await fetchDashboardData(); 
    } catch (error) {
      alert("Failed to accept: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineRequest = async (studentId) => {
    setProcessingId(studentId);
    try {
      await supabase.from('profiles').update({ company_id: null, company_status: 'unassigned' }).eq('id', studentId);
      await fetchDashboardData(); 
    } catch (error) {
      alert("Failed to decline: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  // --- THEME UTILS ---
  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { primary: 'bg-purple-600', text: 'text-purple-400', border: 'border-purple-500/30', bgLight: 'bg-purple-500/20', fill: '#9333ea' };
      case 'BSAB': return { primary: 'bg-green-600', text: 'text-green-400', border: 'border-green-500/30', bgLight: 'bg-green-500/20', fill: '#16a34a' };
      case 'BSHM': return { primary: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30', bgLight: 'bg-yellow-500/20', fill: '#eab308' };
      case 'BSCRIM': return { primary: 'bg-rose-700', text: 'text-rose-400', border: 'border-rose-500/30', bgLight: 'bg-rose-500/20', fill: '#be123c' };
      case 'COTED': return { primary: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500/30', bgLight: 'bg-blue-500/20', fill: '#2563eb' };
      default: return { primary: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-500/30', bgLight: 'bg-gray-500/20', fill: '#374151' };
    }
  };

  const theme = getThemeColors(department);
  const bgCard = isDarkMode ? 'bg-gray-900/40 border-white/10 shadow-lg backdrop-blur-sm' : 'bg-white border-gray-200 shadow-sm';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  // Math for Doughnut Chart (Company Capacity)
  const totalSlots = companyData.capacity || 1; 
  const assigned = metrics.activeInterns;
  const assignedPercentage = Math.round((assigned / totalSlots) * 100);
  const strokeDasharray = 283; 
  const strokeDashoffset = strokeDasharray - (strokeDasharray * Math.min(assignedPercentage, 100)) / 100;

  if (isLoading) return <div className="h-full flex items-center justify-center"><div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${theme.border}`}></div></div>;

  if (!hasCompany) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in w-full">
        <div className={`p-8 rounded-2xl border text-center max-w-md ${bgCard}`}>
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className={`text-xl font-bold mb-2 ${textMain}`}>No Company Assigned</h2>
          <p className={`text-sm ${textMuted}`}>Your supervisor account is not linked to a partner company yet. Please contact your school administrator to be assigned.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 animate-fade-in w-full overflow-y-auto custom-scrollbar gap-6">
      
      {/* 1. THE EXECUTIVE RIBBON (Minimal KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Active Interns */}
        <div className={`p-6 rounded-xl border ${bgCard} flex flex-col justify-center relative`}>
          <div className="flex items-center gap-2 mb-2">
            <svg className={`w-3.5 h-3.5 ${theme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${textMuted}`}>Active Interns</h3>
          </div>
          <p className={`text-3xl font-semibold tracking-tight ${textMain}`}>{metrics.activeInterns}</p>
        </div>

        {/* KPI 2: Pending Requests (Alert) */}
        <div className={`p-6 rounded-xl border ${bgCard} flex flex-col justify-center relative`}>
          <div className="flex items-center gap-2 mb-2">
            <svg className={`w-3.5 h-3.5 ${metrics.pendingInterns > 0 ? 'text-amber-500' : textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${metrics.pendingInterns > 0 ? 'text-amber-500' : textMuted}`}>Pending Approvals</h3>
          </div>
          <p className={`text-3xl font-semibold tracking-tight ${metrics.pendingInterns > 0 ? 'text-amber-500' : textMain}`}>{metrics.pendingInterns}</p>
        </div>

        {/* KPI 3: Total Applications */}
        <div className={`p-6 rounded-xl border ${bgCard} flex flex-col justify-center relative`}>
          <div className="flex items-center gap-2 mb-2">
            <svg className={`w-3.5 h-3.5 ${theme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${textMuted}`}>Total Applications</h3>
          </div>
          <p className={`text-3xl font-semibold tracking-tight ${textMain}`}>{metrics.totalInterns}</p>
        </div>

        {/* KPI 4: Reports Submitted */}
        <div className={`p-6 rounded-xl border ${bgCard} flex flex-col justify-center relative`}>
          <div className="flex items-center gap-2 mb-2">
            <svg className={`w-3.5 h-3.5 ${theme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${textMuted}`}>Reports Received</h3>
          </div>
          <p className={`text-3xl font-semibold tracking-tight ${textMain}`}>{metrics.totalReports}</p>
        </div>
      </div>

      {/* 2. THE ANALYTICS HUB (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Capacity Status (Doughnut) */}
        <div className={`p-6 rounded-xl border ${bgCard} flex flex-col items-center justify-center`}>
          <h3 className={`text-[12px] font-bold uppercase tracking-wider mb-6 w-full text-left ${textMain}`}>Company Capacity</h3>
          <div className="relative w-40 h-40 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke={isDarkMode ? '#374151' : '#e5e7eb'} strokeWidth="10" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={theme.fill} strokeWidth="10" strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${textMain}`}>{assignedPercentage}%</span>
              <span className={`text-[9px] uppercase font-semibold tracking-wider ${textMuted}`}>Filled</span>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-2">
            <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${theme.primary}`}></div><span className={`text-[11px] font-medium ${textMuted}`}>Active ({assigned})</span></div>
            <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div><span className={`text-[11px] font-medium ${textMuted}`}>Slots ({totalSlots})</span></div>
          </div>
        </div>

        {/* Activity Timeline (Bar Chart) */}
        <div className={`p-6 rounded-xl border ${bgCard} lg:col-span-2 flex flex-col`}>
          <h3 className={`text-[12px] font-bold uppercase tracking-wider mb-6 ${textMain}`}>Intern Submissions (By Week)</h3>
          <div className="flex-1 flex items-end justify-around h-[200px] w-full pt-4 relative border-b border-dashed border-gray-500/30">
            {chartData.length === 0 ? (
               <p className={`absolute inset-0 flex items-center justify-center text-sm italic ${textMuted}`}>No reports submitted yet.</p>
            ) : (
              chartData.map((data, index) => {
                const maxCount = Math.max(...chartData.map(d => d.count), 1);
                const heightPercentage = (data.count / maxCount) * 100;
                return (
                  <div key={index} className="flex flex-col items-center group w-1/6">
                    <span className={`opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold mb-2 px-2 py-1 rounded bg-black/80 text-white`}>{data.count} Reports</span>
                    <div className={`w-full max-w-[40px] rounded-t-md transition-all duration-700 ${theme.primary}`} style={{ height: `${heightPercentage}%`, minHeight: '10px' }}></div>
                    <span className={`text-[10px] font-bold mt-3 ${textMuted}`}>{data.week}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. OPERATIONAL OVERVIEWS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pending Approvals Widget */}
        <div className={`p-6 rounded-xl border flex flex-col ${bgCard}`}>
          <div className="flex justify-between items-center mb-5">
             <div className="flex items-center gap-2">
               <h3 className={`text-[12px] font-bold uppercase tracking-wider ${textMain}`}>Pending Approvals</h3>
               {pendingRequests.length > 0 && (
                 <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                   {pendingRequests.length}
                 </span>
               )}
             </div>
          </div>
          <div className="flex flex-col gap-3">
             {pendingRequests.length === 0 ? (
               <p className={`text-sm italic ${textMuted}`}>No pending applications.</p>
             ) : (
               pendingRequests.slice(0, 5).map(req => (
                 <div key={req.id} className={`flex flex-col gap-2 p-3 rounded-xl border transition-colors ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                   <div className="flex items-center gap-3">
                     {req.avatar_url ? (
                       <img src={req.avatar_url} alt="Profile" className={`w-8 h-8 rounded-full object-cover shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
                     ) : (
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] ${theme.bgLight} ${theme.text}`}>
                         {req.first_name?.charAt(0)}{req.last_name?.charAt(0)}
                       </div>
                     )}
                     <div className="flex-1 min-w-0">
                       <p className={`text-[12px] font-bold truncate ${textMain}`}>{req.first_name} {req.last_name}</p>
                       <p className={`text-[10px] truncate uppercase ${textMuted}`}>{department} Intern</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center justify-end gap-2 mt-1">
                     <button 
                       onClick={() => handleDeclineRequest(req.id)}
                       disabled={processingId === req.id}
                       className={`p-1.5 rounded-lg border transition-colors ${isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'} disabled:opacity-50`}
                       title="Decline"
                     >
                       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                     <button 
                       onClick={() => handleAcceptRequest(req.id)}
                       disabled={processingId === req.id}
                       className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'} disabled:opacity-50`}
                     >
                       {processingId === req.id ? (
                         <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                       ) : (
                         <>
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                           <span className="text-[10px] font-bold uppercase tracking-wider">Approve</span>
                         </>
                       )}
                     </button>
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* Active Roster Widget */}
        <div className={`p-6 rounded-xl border flex flex-col ${bgCard}`}>
          <div className="flex justify-between items-center mb-5">
             <h3 className={`text-[12px] font-bold uppercase tracking-wider ${textMain}`}>Active Roster</h3>
          </div>
          <div className="flex flex-col gap-3">
             {activeRoster.length === 0 ? (
               <p className={`text-sm italic ${textMuted}`}>No active interns.</p>
             ) : (
               activeRoster.map(student => (
                 <div key={student.id} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     {student.avatar_url ? (
                       <img src={student.avatar_url} alt="Profile" className={`w-8 h-8 rounded-full object-cover shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
                     ) : (
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] ${theme.bgLight} ${theme.text}`}>
                         {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                       </div>
                     )}
                     <div>
                       <p className={`text-[12px] font-bold ${textMain}`}>{student.first_name} {student.last_name}</p>
                       <p className={`text-[10px] uppercase ${textMuted}`}>Deployed</p>
                     </div>
                   </div>
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className={`p-6 rounded-xl border flex flex-col ${bgCard}`}>
          <div className="flex justify-between items-center mb-5">
             <h3 className={`text-[12px] font-bold uppercase tracking-wider ${textMain}`}>Latest Submissions</h3>
          </div>
          <div className="flex flex-col gap-3">
             {recentReports.length === 0 ? (
               <p className={`text-sm italic ${textMuted}`}>No recent reports.</p>
             ) : (
               recentReports.map(report => (
                 <div key={report.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isDarkMode ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}>
                   {report.student?.avatar_url ? (
                     <img src={report.student.avatar_url} alt="Profile" className={`w-10 h-10 rounded-lg object-cover shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
                   ) : (
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-[12px] ${theme.bgLight} ${theme.text}`}>
                       {report.student?.first_name?.charAt(0)}{report.student?.last_name?.charAt(0)}
                     </div>
                   )}
                   <div className="flex-1 min-w-0">
                     <p className={`text-[13px] font-semibold truncate ${textMain}`}>
                       {report.student?.first_name} {report.student?.last_name}
                     </p>
                     <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${theme.bgLight} ${theme.text}`}>
                          {report.week_number || 'Week ?'}
                        </span>
                        <p className={`text-[11px] truncate ${textMuted}`}>{report.file_name}</p>
                     </div>
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>

      </div>
      
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px; }`}</style>
    </div>
  );
}

export default Overview;