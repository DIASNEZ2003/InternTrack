import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';

function ListStudents() {
  const [department, setDepartment] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [hasCompany, setHasCompany] = useState(true);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // View Profile Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // GLOBAL DARK MODE LISTENER
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => {
    fetchSupervisorAndInterns();
  }, []);

  const fetchSupervisorAndInterns = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch the logged-in Supervisor's profile
      const { data: supProfile } = await supabase
        .from('profiles')
        .select('department, company_id')
        .eq('id', user.id)
        .single();

      if (supProfile) {
        setDepartment(supProfile.department || '');
        
        // 2. Check if the supervisor is actually assigned to a company
        if (!supProfile.company_id) {
          setHasCompany(false);
          setIsLoading(false);
          return;
        }

        // 3. Fetch the company name for the UI
        const { data: compData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', supProfile.company_id)
          .single();
          
        if (compData) setCompanyName(compData.name);

        // 4. Fetch ALL STUDENTS assigned to this specific company_id
        const { data: internsData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url, department, company_status')
          .eq('role', 'student')
          .eq('company_id', supProfile.company_id)
          .order('first_name', { ascending: true });

        setStudents(internsData || []);
      }
    } catch (error) {
      console.error("Error fetching interns:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { primary: 'bg-purple-600 hover:bg-purple-500', ring: 'focus:ring-purple-400', border: 'border-purple-500/30', text: 'text-purple-400', bgLight: 'bg-purple-500/20' };
      case 'BSAB': return { primary: 'bg-green-600 hover:bg-green-500', ring: 'focus:ring-green-400', border: 'border-green-500/30', text: 'text-green-400', bgLight: 'bg-green-500/20' };
      case 'BSHM': return { primary: 'bg-yellow-600 hover:bg-yellow-500', ring: 'focus:ring-yellow-400', border: 'border-yellow-500/30', text: 'text-yellow-400', bgLight: 'bg-yellow-500/20' };
      case 'BSCRIM': return { primary: 'bg-rose-700 hover:bg-rose-600', ring: 'focus:ring-rose-400', border: 'border-rose-500/50', text: 'text-rose-400', bgLight: 'bg-rose-500/20' };
      case 'COTED': return { primary: 'bg-blue-600 hover:bg-blue-500', ring: 'focus:ring-blue-400', border: 'border-blue-500/50', text: 'text-blue-400', bgLight: 'bg-blue-500/20' };
      default: return { primary: 'bg-gray-700 hover:bg-gray-600', ring: 'focus:ring-gray-400', border: 'border-gray-500/50', text: 'text-gray-300', bgLight: 'bg-gray-500/20' };
    }
  };

  const theme = getThemeColors(department);
  const bgCard = isDarkMode ? 'bg-gray-900/40 border-white/10 shadow-lg' : 'bg-white border-gray-200 shadow-sm';
  const bgHeader = isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200';
  const bgInput = isDarkMode ? 'bg-black/40 border-white/10 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const bgHover = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50/80';

  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase();
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const username = (student.username || '').toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });

  const openViewModal = (student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  if (!hasCompany) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in w-full overflow-hidden">
        <div className={`p-8 rounded-2xl border text-center max-w-md ${bgCard}`}>
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className={`text-xl font-bold mb-2 ${textMain}`}>No Company Assigned</h2>
          <p className={`text-sm ${textMuted}`}>You have not been assigned to a company yet. Please contact your school administrator to link your account to a partner company.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 animate-fade-in w-full relative overflow-hidden">
      
      {/* Top Search Bar (Title Removed) */}
      <div className={`flex flex-col md:flex-row md:items-center justify-end w-full mb-4 gap-4 p-4 rounded-xl border shrink-0 ${bgCard}`}>
        <div className="relative w-full md:max-w-xs">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search intern by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors ${bgInput} focus:ring-1 ${theme.ring}`} />
        </div>
      </div>

      {/* Main Container */}
      <div className={`flex-1 rounded-xl overflow-hidden flex flex-col relative border ${bgCard}`}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${theme.border}`}></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <h3 className={`text-sm font-bold mb-1 ${textMain}`}>No interns found</h3>
            <p className={`text-xs ${textMuted}`}>There are currently no interns assigned to {companyName}.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            
            {/* 🖥️ DESKTOP VIEW (TABLE) */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className={`sticky top-0 z-10 border-b ${bgHeader}`}>
                  <tr>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider w-12 text-center ${textMuted}`}>No.</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Intern Profile</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Username</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Status</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-right ${textMuted}`}>Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {filteredStudents.map((student, index) => {
                    const isPending = student.company_status === 'pending';
                    
                    return (
                      <tr key={student.id} className={`transition-colors group ${bgHover}`}>
                        <td className={`py-3 px-4 text-center text-[11px] font-bold ${textMuted}`}>{index + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {student.avatar_url ? (
                              <img src={student.avatar_url} className={`w-9 h-9 rounded-full object-cover shrink-0 shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                                {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className={`text-[13px] font-bold leading-tight ${textMain}`}>{student.first_name} {student.last_name}</p>
                              <p className={`text-[11px] uppercase ${textMuted}`}>{student.department} Intern</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[12px] font-medium px-2 py-1 rounded-md border ${isDarkMode ? 'bg-black/40 border-white/5 text-gray-300' : 'bg-gray-100 border-transparent text-gray-700'}`}>
                            {student.username || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isPending ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                              Pending Approval
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              Active Intern
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => openViewModal(student)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors border shadow-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                            View Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 📱 MOBILE VIEW (CARDS) */}
            <div className="md:hidden flex flex-col gap-3 p-3 w-full">
              {filteredStudents.map((student) => {
                const isPending = student.company_status === 'pending';

                return (
                  <div key={student.id} className={`transition-all duration-300 rounded-xl border p-4 flex flex-col gap-3 relative shadow-sm ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                    
                    {/* Header: Avatar + Info */}
                    <div className="flex items-center gap-3 w-full">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} className={`w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-[14px] ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                          {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`text-[13px] font-bold truncate ${textMain}`}>{student.first_name} {student.last_name}</span>
                        <span className={`text-[11px] uppercase ${textMuted}`}>{student.department} Intern</span>
                      </div>
                    </div>

                    <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}></div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${textMuted}`}>Username</span>
                        <span className={`text-[12px] font-medium truncate px-2 py-1 rounded-md border w-max ${isDarkMode ? 'bg-black/40 border-white/5 text-gray-300' : 'bg-gray-100 border-transparent text-gray-700'}`}>{student.username || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col items-start sm:items-end">
                        <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${textMuted}`}>Status</span>
                        {isPending ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                            Pending
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex flex-wrap items-center justify-end gap-2 pt-2 mt-1 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                      <button onClick={() => openViewModal(student)} className={`flex-1 justify-center inline-flex px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors border shadow-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                        View Profile
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* VIEW PROFILE MODAL */}
      {isViewModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
              <h2 className={`text-lg font-bold tracking-tight ${textMain}`}>Intern Profile</h2>
              <button onClick={() => setIsViewModalOpen(false)} className={`${textMuted} hover:text-white hover:bg-white/10 p-1.5 rounded-md transition-colors`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center text-center">
              {selectedStudent.avatar_url ? (
                <img src={selectedStudent.avatar_url} alt="Avatar" className={`w-24 h-24 rounded-full object-cover shadow-sm border-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} mb-4`} />
              ) : (
                <div className={`w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl mb-4 ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                  {selectedStudent.first_name?.charAt(0)}{selectedStudent.last_name?.charAt(0)}
                </div>
              )}
              
              <h3 className={`text-2xl font-bold ${textMain}`}>{selectedStudent.first_name} {selectedStudent.last_name}</h3>
              <p className={`text-[12px] font-bold uppercase tracking-widest ${textMuted} mt-1 mb-6`}>{selectedStudent.department} Intern</p>

              <div className="w-full flex flex-col gap-3">
                <div className={`p-4 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Username</span>
                  <span className={`text-[13px] font-semibold ${textMain}`}>{selectedStudent.username || 'N/A'}</span>
                </div>
                
                <div className={`p-4 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Status</span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedStudent.company_status === 'pending' ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {selectedStudent.company_status === 'pending' ? 'Pending Approval' : 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div className={`px-6 py-4 border-t flex justify-end ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
              <button onClick={() => setIsViewModalOpen(false)} className={`w-full py-2.5 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-900 text-white hover:bg-black'}`}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; }`}</style>
    </div>
  );
}

export default ListStudents;