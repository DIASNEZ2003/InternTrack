import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';

function Logs() {
  const [department, setDepartment] = useState('');
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // NEW SEARCH STATE

  // Modal States
  const [activeItem, setActiveItem] = useState(null);
  const [modalType, setModalType] = useState(null); // 'view_log', 'edit_log', 'view_journal', 'edit_journal'
  const [logFormData, setLogFormData] = useState({ date: '', start_shift: '', end_shift: '', category: '', hours: '', description: '', learnings: '' });
  const [journalDocData, setJournalDocData] = useState({ weekNumber: '', inclusiveDates: '', fileName: '', activityLogs: [], learnings: '', filePath: '' });

  // GLOBAL DARK MODE LISTENER
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => {
    fetchAllActivities();
  }, []);

  const fetchAllActivities = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) {
        setProfile(profileData);
        setDepartment(profileData.department || '');
      }

      const { data: logsData, error: logsError } = await supabase.from('daily_logs').select('*').eq('user_id', user.id);
      if (logsError) throw logsError;

      const { data: journalsData, error: journalsError } = await supabase.from('saved_journals').select('*').eq('user_id', user.id);
      if (journalsError) throw journalsError;

      const formattedLogs = (logsData || []).map(log => ({
        id: `log_${log.id}`,
        rawId: log.id,
        type: 'log',
        title: log.category,
        description: log.description,
        date: log.date,
        timestamp: new Date(log.created_at || log.date).getTime(),
        badge: log.hours,
        rawData: log
      }));

      const formattedJournals = (journalsData || []).map(journal => ({
        id: `journal_${journal.id}`,
        rawId: journal.id,
        type: 'journal',
        title: journal.file_name,
        description: `Generated Weekly Report • Week ${journal.week_number}`,
        date: new Date(journal.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        timestamp: new Date(journal.created_at).getTime(),
        badge: 'DOCX',
        rawData: journal
      }));

      setActivities([...formattedLogs, ...formattedJournals].sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { primary: 'bg-purple-600', text: 'text-purple-400', border: 'border-purple-500/30', bgLight: 'bg-purple-500/20', ring: 'focus:ring-purple-400 focus:border-purple-400' };
      case 'BSAB': return { primary: 'bg-green-600', text: 'text-green-400', border: 'border-green-500/30', bgLight: 'bg-green-500/20', ring: 'focus:ring-green-400 focus:border-green-400' };
      case 'BSHM': return { primary: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30', bgLight: 'bg-yellow-500/20', ring: 'focus:ring-yellow-400 focus:border-yellow-400' };
      case 'BSCRIM': return { primary: 'bg-rose-700', text: 'text-rose-400', border: 'border-rose-500/30', bgLight: 'bg-rose-500/20', ring: 'focus:ring-rose-400 focus:border-rose-400' };
      case 'COTED': return { primary: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500/30', bgLight: 'bg-blue-500/20', ring: 'focus:ring-blue-400 focus:border-blue-400' };
      default: return { primary: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-500/30', bgLight: 'bg-gray-500/20', ring: 'focus:ring-gray-400 focus:border-gray-400' };
    }
  };

  const theme = getThemeColors(department);
  const bgCard = isDarkMode ? 'bg-gray-900/40 border-white/10 shadow-lg' : 'bg-white border-gray-200 shadow-sm';
  const bgHeader = isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200';
  const bgInput = isDarkMode ? 'bg-black/40 border-white/10 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const bgHover = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50/80';

  // --- FILTER LOGIC ---
  const filteredActivities = activities.filter(activity => {
    const query = searchQuery.toLowerCase();
    return (
      activity.title.toLowerCase().includes(query) ||
      activity.description.toLowerCase().includes(query) ||
      activity.date.toLowerCase().includes(query)
    );
  });

  // --- ACTIONS HANDLERS ---
  const handleOpenView = async (item) => {
    setActiveItem(item);
    if (item.type === 'log') {
      setLogFormData(item.rawData);
      setModalType('view_log');
    } else {
      await fetchAndParseJournal(item.rawData, 'view_journal');
    }
  };

  const handleOpenEdit = async (item) => {
    setActiveItem(item);
    if (item.type === 'log') {
      setLogFormData(item.rawData);
      setModalType('edit_log');
    } else {
      await fetchAndParseJournal(item.rawData, 'edit_journal');
    }
  };

  const handleDownload = async (item) => {
    if (item.type !== 'journal') return;
    try {
      const { data, error } = await supabase.storage.from('journals').download(item.rawData.file_path);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.rawData.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download file: ' + error.message);
    }
  };

  const fetchAndParseJournal = async (journal, targetModal) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.storage.from('journals').download(journal.file_path);
      if (error) throw error;

      const text = await data.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      let extractedLogs = [];
      const table = doc.querySelector('table');
      if (table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            extractedLogs.push({
              date: cells[0].textContent.trim(),
              description: cells[1].innerHTML.replace(/<br\s*[\/]?>/gi, '\n').trim()
            });
          }
        });
      }

      let learningsText = '';
      const headings = doc.querySelectorAll('h3');
      headings.forEach(h => {
        if (h.textContent.includes('Learning Experience')) {
          let nextEl = h.nextElementSibling;
          if (nextEl && nextEl.tagName === 'P') {
            learningsText = nextEl.innerHTML.replace(/<br\s*[\/]?>/gi, '\n').trim();
          }
        }
      });

      setJournalDocData({
        weekNumber: journal.week_number,
        inclusiveDates: journal.inclusive_dates,
        fileName: journal.file_name,
        activityLogs: extractedLogs,
        learnings: learningsText,
        filePath: journal.file_path
      });
      setModalType(targetModal);
    } catch (error) {
      alert('Failed to load document content: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- SAVE UPDATES ---
  const handleSaveLog = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('daily_logs').update({
        category: logFormData.category,
        description: logFormData.description,
        learnings: logFormData.learnings,
        start_shift: logFormData.start_shift,
        end_shift: logFormData.end_shift
      }).eq('id', activeItem.rawId);

      if (error) throw error;
      await fetchAllActivities();
      setModalType(null);
    } catch (err) {
      alert('Failed to update log: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveJournalDoc = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      let activitiesTableHtml = `<table style="width:100%; border-collapse: collapse; font-family:Arial; font-size:13px; margin-bottom: 20px;"><tbody>`;
      journalDocData.activityLogs.forEach(log => {
        activitiesTableHtml += `<tr><td style="border: 1px solid black; padding: 6px; vertical-align: top; width: 100px; font-weight: bold;">${log.date}</td><td style="border: 1px solid black; padding: 6px; vertical-align: top;">${log.description.replace(/\n/g, '<br/>')}</td></tr>`;
      });
      activitiesTableHtml += `</tbody></table>`;

      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>";
      const docHtml = `${header}<body><h2 style="text-align:center; font-family:Arial; font-size:16px;">WEEKLY PROGRESS REPORT</h2><p style="font-family:Arial; font-size:13px;"><b>Student's Name:</b> ${profile?.first_name} ${profile?.last_name}</p><p style="font-family:Arial; font-size:13px;"><b>Week #:</b> ${journalDocData.weekNumber} &nbsp;&nbsp;&nbsp;&nbsp; <b>Inclusive Dates:</b> ${journalDocData.inclusiveDates}</p><br/><h3 style="font-family:Arial; font-size:14px;">Activities:</h3>${activitiesTableHtml}<h3 style="font-family:Arial; font-size:14px;">Learning Experience:</h3><p style="font-family:Arial; font-size:13px; text-indent:2rem; line-height:1.6;">${journalDocData.learnings.replace(/\n/g, '<br/>')}</p></body></html>`;

      const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
      const { error: uploadError } = await supabase.storage.from('journals').upload(journalDocData.filePath, blob, { contentType: 'application/msword', upsert: true });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('saved_journals').update({
        week_number: journalDocData.weekNumber,
        inclusive_dates: journalDocData.inclusiveDates
      }).eq('id', activeItem.rawId);
      if (dbError) throw dbError;

      await fetchAllActivities();
      setModalType(null);
    } catch (error) {
      alert('Failed to save document: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 animate-fade-in w-full relative">
      
      {/* Top Action Bar / Search */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between w-full mb-4 gap-3 p-3 rounded-xl border ${bgCard}`}>
        <div className="relative flex-1 max-w-sm">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text" 
            placeholder="Search activities by title, description, or date..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} 
          />
        </div>
      </div>

      {/* Main Table View */}
      <div className={`flex-1 rounded-xl overflow-hidden flex flex-col relative border ${bgCard}`}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${theme.border}`}></div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <h3 className={`text-sm font-bold mb-1 ${textMain}`}>No activities found</h3>
            <p className={`text-xs ${textMuted}`}>Try adjusting your search query.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className={`sticky top-0 z-10 border-b ${bgHeader}`}>
                <tr>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider w-16 text-center ${textMuted}`}>Type</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Title</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Description</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Date</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-center ${textMuted}`}>Status</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-right ${textMuted}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                {filteredActivities.map((activity) => (
                  <tr key={activity.id} className={`transition-colors group ${bgHover}`}>
                    
                    {/* Icon Type Column */}
                    <td className="py-2 px-4 text-center">
                      <div className="flex justify-center items-center">
                        {activity.type === 'journal' ? (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/><path d="M8 12h8v2H8zm0 4h8v2H8z"/></svg>
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${theme.bgLight} ${theme.text} ${theme.border}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title Column */}
                    <td className="py-2.5 px-4">
                      <p className={`text-[13px] font-bold truncate max-w-[200px] ${textMain}`} title={activity.title}>
                        {activity.title}
                      </p>
                    </td>

                    {/* Description Column */}
                    <td className="py-2.5 px-4">
                      <p className={`text-[12px] truncate max-w-[250px] ${textMuted}`} title={activity.description}>
                        {activity.description}
                      </p>
                    </td>

                    {/* Date Column */}
                    <td className="py-2.5 px-4">
                      <p className={`text-[12px] font-medium ${textMuted}`}>{activity.date}</p>
                    </td>

                    {/* Status / Badge Column */}
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${activity.type === 'journal' ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700') : (isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700')}`}>
                        {activity.badge}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleOpenView(activity)} className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white bg-white/5 hover:bg-white/10' : 'text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50'}`}>
                          View
                        </button>
                        <button onClick={() => handleOpenEdit(activity)} className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${isDarkMode ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20' : 'text-gray-500 hover:text-amber-600 bg-gray-50 hover:bg-amber-50'}`}>
                          Edit
                        </button>
                        {activity.type === 'journal' && (
                          <button onClick={() => handleDownload(activity)} className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors border ${isDarkMode ? 'border-white/10 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-gray-200 text-gray-600 hover:text-emerald-700 bg-white hover:bg-emerald-50'}`}>
                            Download
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- DAILY LOG MODAL (VIEW / EDIT) --- */}
      {(modalType === 'view_log' || modalType === 'edit_log') && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
              <h2 className={`text-base font-bold ${textMain}`}>{modalType === 'view_log' ? 'Log Details' : 'Edit Daily Log'}</h2>
              <button onClick={() => setModalType(null)} className={`${textMuted} hover:text-white p-1 rounded-md`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSaveLog} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${textMuted}`}>Date</label>
                  <input type="text" value={logFormData.date || ''} readOnly className={`w-full px-3 py-2 rounded-lg text-xs outline-none border cursor-not-allowed ${bgInput}`} />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${textMuted}`}>Category</label>
                  <input type="text" value={logFormData.category || ''} onChange={(e) => setLogFormData({ ...logFormData, category: e.target.value })} readOnly={modalType === 'view_log'} className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${bgInput} ${theme.ring}`} />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${textMuted}`}>Tasks Description</label>
                <textarea rows="3" value={logFormData.description || ''} onChange={(e) => setLogFormData({ ...logFormData, description: e.target.value })} readOnly={modalType === 'view_log'} className={`w-full px-3 py-2 rounded-lg text-xs outline-none resize-none border ${bgInput} ${theme.ring}`} />
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${textMuted}`}>Learnings & Skills</label>
                <textarea rows="3" value={logFormData.learnings || ''} onChange={(e) => setLogFormData({ ...logFormData, learnings: e.target.value })} readOnly={modalType === 'view_log'} className={`w-full px-3 py-2 rounded-lg text-xs outline-none resize-none border ${bgInput} ${theme.ring}`} />
              </div>

              <div className={`pt-3 flex justify-end gap-2 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                <button type="button" onClick={() => setModalType(null)} className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Close</button>
                {modalType === 'edit_log' && (
                  <button type="submit" disabled={isProcessing} className={`px-5 py-2 rounded-lg font-bold text-xs text-white shadow-sm transition-colors ${theme.primary} disabled:opacity-50`}>{isProcessing ? 'Saving...' : 'Save Changes'}</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- JOURNAL DOC MODAL (VIEW / EDIT) --- */}
      {(modalType === 'view_journal' || modalType === 'edit_journal') && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className={`rounded-2xl shadow-xl w-full max-w-4xl flex flex-col h-full max-h-[90vh] overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-gray-100 border-gray-300'}`}>
            <div className={`px-5 py-3 flex justify-between items-center border-b shrink-0 ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-base font-bold flex items-center gap-2 ${textMain}`}>
                {modalType === 'view_journal' ? 'Viewing Document' : 'Editing Document'}
                {modalType === 'view_journal' && <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>Read Only</span>}
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setModalType(null)} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>Close</button>
                {modalType === 'edit_journal' && (
                  <button onClick={handleSaveJournalDoc} disabled={isProcessing} className={`px-4 py-1.5 rounded-lg font-bold text-xs text-white shadow-sm flex items-center gap-1.5 ${theme.primary} disabled:opacity-50 transition-colors`}>
                    {isProcessing ? 'Saving...' : 'Save Document'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex justify-center custom-scrollbar">
              <div className={`shadow-sm border p-8 sm:p-12 shrink-0 ${isDarkMode ? 'bg-gray-800 border-white/10' : 'bg-white border-gray-200'}`} style={{ width: '100%', maxWidth: '750px', minHeight: '900px', fontFamily: 'Arial, sans-serif' }}>
                <h1 className={`text-center text-base font-bold uppercase mb-6 ${textMain}`}>WEEKLY PROGRESS REPORT</h1>
                <div className={`grid grid-cols-2 gap-x-2 gap-y-3 mb-8 text-[13px] ${textMain}`}>
                  <div className="flex"><span className="w-28">Student’s Name:</span><strong className="font-bold flex-1">{profile?.first_name} {profile?.last_name}</strong></div>
                  <div></div>
                  <div className="flex items-center"><span className="w-28">Week #:</span>
                    <input type="text" value={journalDocData.weekNumber} onChange={(e) => setJournalDocData({ ...journalDocData, weekNumber: e.target.value })} readOnly={modalType === 'view_journal'} className={`font-bold w-10 border-b outline-none transition-colors ${modalType === 'view_journal' ? 'border-transparent bg-transparent' : `border-gray-400 bg-transparent ${theme.ring}`}`} />
                  </div>
                  <div className="flex items-center justify-end"><span className="mr-2">Inclusive Dates:</span>
                    <input type="text" value={journalDocData.inclusiveDates} onChange={(e) => setJournalDocData({ ...journalDocData, inclusiveDates: e.target.value })} readOnly={modalType === 'view_journal'} className={`font-bold w-[160px] border-b outline-none text-right transition-colors ${modalType === 'view_journal' ? 'border-transparent bg-transparent' : `border-gray-400 bg-transparent ${theme.ring}`}`} />
                  </div>
                </div>

                <div className="mb-5">
                  <h3 className={`text-[13px] mb-2 font-normal ${textMain}`}>Activities:</h3>
                  <table className={`w-full border-collapse ${textMain}`}>
                    <tbody>
                      {journalDocData.activityLogs && journalDocData.activityLogs.length > 0 ? (
                        journalDocData.activityLogs.map((log, idx) => (
                          <tr key={idx}>
                            <td className={`p-1.5 border w-24 align-top text-[12px] ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                              {modalType === 'view_journal' ? (<strong>{log.date}</strong>) : (<input value={log.date} onChange={(e) => { const copy = [...journalDocData.activityLogs]; copy[idx].date = e.target.value; setJournalDocData({ ...journalDocData, activityLogs: copy }); }} className="w-full bg-transparent outline-none font-bold" />)}
                            </td>
                            <td className={`p-1.5 border align-top text-[13px] ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                              {modalType === 'view_journal' ? (<div className="whitespace-pre-wrap leading-snug">{log.description}</div>) : (<textarea value={log.description} onChange={(e) => { const copy = [...journalDocData.activityLogs]; copy[idx].description = e.target.value; setJournalDocData({ ...journalDocData, activityLogs: copy }); }} rows="2" className="w-full bg-transparent outline-none resize-none leading-snug" onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px'; }} />)}
                            </td>
                          </tr>
                        ))
                      ) : (<tr><td className={`italic p-1.5 border text-[12px] ${isDarkMode ? 'text-gray-400 border-gray-600' : 'text-gray-400 border-gray-300'}`}>No activities.</td></tr>)}
                    </tbody>
                  </table>
                </div>

                <div className="mb-5">
                  <h3 className={`text-[13px] mb-2 font-normal ${textMain}`}>Learning Experience:</h3>
                  <textarea value={journalDocData.learnings} onChange={(e) => setJournalDocData({ ...journalDocData, learnings: e.target.value })} rows="8" readOnly={modalType === 'view_journal'} className={`w-full outline-none resize-none text-[13px] leading-relaxed bg-transparent border p-1.5 transition-colors ${modalType === 'view_journal' ? 'border-transparent' : `border-gray-400 ${theme.ring}`} ${textMain}`} style={{ textIndent: '2rem' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
}

export default Logs;