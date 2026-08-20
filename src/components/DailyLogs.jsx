import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../api/supabaseClient';

function DailyLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [department, setDepartment] = useState(''); 
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
  const [activeLogId, setActiveLogId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({ date: '', start_shift: '08:00', end_shift: '17:00', category: '', hours: '', description: '', learnings: '', proof_url: '' });
  
  const [proofFile, setProofFile] = useState(null);
  const fileInputRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  
  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('department').eq('id', user.id).single();
        if (profileData) setDepartment(profileData.department);
        const { data, error } = await supabase.from('daily_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (error) throw error;
        setLogs(data || []);
      }
    } catch (error) { console.error('Error fetching logs:', error.message); } finally { setIsLoading(false); }
  };

  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { primary: 'bg-purple-600', ring: 'focus:ring-purple-400 focus:border-purple-400', spinner: 'border-t-purple-500', text: 'text-purple-400' };
      case 'BSAB': return { primary: 'bg-green-600', ring: 'focus:ring-green-400 focus:border-green-400', spinner: 'border-t-green-500', text: 'text-green-400' };
      case 'BSHM': return { primary: 'bg-yellow-600', ring: 'focus:ring-yellow-400 focus:border-yellow-400', spinner: 'border-t-yellow-500', text: 'text-yellow-400' };
      case 'BSCRIM': return { primary: 'bg-rose-700', ring: 'focus:ring-rose-400 focus:border-rose-400', spinner: 'border-t-rose-500', text: 'text-rose-400' };
      case 'COTED': return { primary: 'bg-blue-600', ring: 'focus:ring-blue-400 focus:border-blue-400', spinner: 'border-t-blue-500', text: 'text-blue-400' };
      default: return { primary: 'bg-gray-700', ring: 'focus:ring-gray-400 focus:border-gray-400', spinner: 'border-t-gray-500', text: 'text-gray-400' };
    }
  };

  const theme = getThemeColors(department);
  const bgCard = isDarkMode ? 'bg-gray-900/40 border-white/10 shadow-lg' : 'bg-white border-gray-200 shadow-sm';
  const bgHeader = isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200';
  const bgInput = isDarkMode ? 'bg-black/40 border-white/10 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const bgHover = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50/80';

  const calculateHours = (start, end) => {
    if (!start || !end) return '';
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    let startTotalMins = (startHour * 60) + startMin;
    let endTotalMins = (endHour * 60) + endMin;
    if (endTotalMins < startTotalMins) endTotalMins += 24 * 60;
    const diffMins = endTotalMins - startTotalMins;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatTime12hr = (time24) => {
    if (!time24) return '';
    const [hourStr, minStr] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; 
    const paddedHour = hour < 10 ? `0${hour}` : hour;
    return `${paddedHour}:${minStr} ${ampm}`;
  };

  const openModal = (mode, log = null) => {
    setModalMode(mode);
    setProofFile(null); 
    if (log) {
      setFormData({ date: log.date, start_shift: log.start_shift, end_shift: log.end_shift, category: log.category, hours: log.hours, description: log.description || '', learnings: log.learnings || '', proof_url: log.proof_url || '' });
      setActiveLogId(log.id);
    } else {
      setFormData({ date: '', start_shift: '08:00', end_shift: '17:00', category: '', hours: '9h', description: '', learnings: '', proof_url: '' });
      setActiveLogId(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setActiveLogId(null); setProofFile(null); };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...formData, [name]: value };
    if (name === 'start_shift' || name === 'end_shift') updatedForm.hours = calculateHours(updatedForm.start_shift, updatedForm.end_shift);
    setFormData(updatedForm);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required.");

      let finalProofUrl = formData.proof_url;

      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('logpicture').upload(fileName, proofFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('logpicture').getPublicUrl(fileName);
        finalProofUrl = publicUrl;
      }

      const payload = { 
        user_id: user.id, 
        date: formData.date,
        start_shift: formData.start_shift,
        end_shift: formData.end_shift,
        category: formData.category,
        hours: formData.hours,
        description: formData.description,
        learnings: formData.learnings,
        proof_url: finalProofUrl
      };

      if (modalMode === 'add') await supabase.from('daily_logs').insert([payload]);
      else if (modalMode === 'edit') await supabase.from('daily_logs').update(payload).eq('id', activeLogId);
      
      await fetchLogs();
      closeModal();
    } catch (error) { 
      alert('Failed to save log: ' + error.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDeleteConfirm = async () => {
    setIsSubmitting(true);
    try {
      await supabase.from('daily_logs').delete().eq('id', activeLogId);
      setLogs(logs.filter(log => log.id !== activeLogId));
      closeModal();
    } catch (error) { alert('Failed to delete: ' + error.message); } finally { setIsSubmitting(false); }
  };

  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      (log.description || '').toLowerCase().includes(query) ||
      (log.category || '').toLowerCase().includes(query) ||
      (log.date || '').toLowerCase().includes(query)
    );
  });

  const previewUrl = proofFile ? URL.createObjectURL(proofFile) : formData.proof_url;

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 animate-fade-in w-full relative">
      
      <div className={`flex flex-col md:flex-row md:items-center justify-between w-full mb-4 gap-3 p-3 rounded-xl border ${bgCard}`}>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:flex-1 max-w-2xl">
          <div className="relative w-full max-w-sm flex-1">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search daily logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
          </div>
          <select className={`px-3 py-2 text-[12px] rounded-lg outline-none font-medium w-full md:w-auto transition-colors border ${bgInput} ${theme.ring}`}>
            <option value="all">All Months</option>
            <option value="jan">January</option>
            <option value="feb">February</option>
            <option value="mar">March</option>
          </select>
        </div>
        <button onClick={() => openModal('add')} className={`w-full md:w-auto flex items-center justify-center gap-1.5 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition-colors border border-white/10 ${theme.primary} hover:opacity-90`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg> Add Log
        </button>
      </div>

      <div className={`flex-1 rounded-xl overflow-hidden flex flex-col relative border ${bgCard}`}>
        {isLoading && (
          <div className={`absolute inset-0 z-20 flex items-center justify-center ${isDarkMode ? 'bg-black/50 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'}`}>
             <div className={`w-6 h-6 border-2 border-gray-200 rounded-full animate-spin ${theme.spinner}`}></div>
          </div>
        )}
        {filteredLogs.length === 0 && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <h3 className={`text-sm font-bold mb-1 ${textMain}`}>No logs found</h3>
            <p className={`text-xs ${textMuted}`}>Try adjusting your search query or add a new log.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className={`sticky top-0 z-10 border-b ${bgHeader}`}>
                <tr>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Date</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Shift</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Tasks Completed</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Hours</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-center ${textMuted}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className={`transition-colors cursor-pointer group ${bgHover}`} onClick={() => openModal('view', log)}>
                    <td className="py-2.5 px-4"><div className={`text-[13px] font-bold ${textMain}`}>{log.date}</div></td>
                    <td className="py-2.5 px-4"><div className={`text-[12px] font-medium ${textMuted}`}>{formatTime12hr(log.start_shift)} - {formatTime12hr(log.end_shift)}</div></td>
                    <td className="py-2.5 px-4"><div className={`text-[13px] font-medium truncate max-w-[200px] xl:max-w-[400px] ${textMain}`} title={log.description}>{log.description}</div></td>
                    <td className="py-2.5 px-4"><div className={`text-[12px] font-bold px-2 py-0.5 rounded-md inline-block ${isDarkMode ? 'bg-black/40 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>{log.hours}</div></td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openModal('view', log); }} className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-800'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                        <button onClick={(e) => { e.stopPropagation(); openModal('edit', log); }} className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-800'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={(e) => { e.stopPropagation(); openModal('delete', log); }} className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-md transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
            {(modalMode === 'add' || modalMode === 'edit' || modalMode === 'view') && (
              <>
                <div className={`px-6 py-4 flex justify-between items-center border-b ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
                  <h2 className={`text-lg font-bold tracking-tight ${textMain}`}>{modalMode === 'add' ? 'Create Log' : modalMode === 'edit' ? 'Update Log' : 'Log Details'}</h2>
                  <button onClick={closeModal} className={`${textMuted} hover:text-white hover:bg-white/10 p-1.5 rounded-md`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>Date</label>
                      <input type="date" name="date" value={formData.date} onChange={handleFormChange} required readOnly={modalMode === 'view'} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors border ${bgInput} ${theme.ring}`} />
                    </div>
                    {/* Kept Category in the modal so you can still record it, just removed from the table */}
                    <div>
                      <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>Category</label>
                      <input type="text" name="category" placeholder="e.g. Documentation" value={formData.category} onChange={handleFormChange} required readOnly={modalMode === 'view'} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors border ${bgInput} ${theme.ring}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>Start Time</label>
                      <input type="time" name="start_shift" value={formData.start_shift} onChange={handleFormChange} required readOnly={modalMode === 'view'} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors border ${bgInput} ${theme.ring}`} />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>End Time</label>
                      <input type="time" name="end_shift" value={formData.end_shift} onChange={handleFormChange} required readOnly={modalMode === 'view'} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors border ${bgInput} ${theme.ring}`} />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>Total Hours</label>
                      <input type="text" value={formData.hours ? `${formData.hours} (Auto)` : ''} readOnly className={`w-full px-3 py-2 rounded-lg border text-[13px] font-bold outline-none cursor-not-allowed ${isDarkMode ? 'bg-black/40 border-white/5 text-gray-500' : 'bg-gray-100 border-gray-100 text-gray-500'}`} />
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>Proof of Work (Attachment)</label>
                    {modalMode === 'view' ? (
                      formData.proof_url ? (
                        <div className={`mt-2 rounded-xl overflow-hidden border max-h-64 flex justify-center ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-black/5'}`}>
                           <img src={formData.proof_url} alt="Proof" className="object-contain w-full h-full" />
                        </div>
                      ) : (
                        <p className={`text-xs italic ${textMuted}`}>No proof attached for this log.</p>
                      )
                    ) : (
                      <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors relative overflow-hidden ${isDarkMode ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        
                        {previewUrl ? (
                          <div className="flex flex-col items-center gap-3">
                             <div className="w-full max-h-48 flex justify-center overflow-hidden rounded-lg">
                               <img src={previewUrl} alt="Preview" className="object-contain w-full h-full" />
                             </div>
                             <button type="button" onClick={() => fileInputRef.current.click()} className={`text-[10px] font-bold px-3 py-1.5 rounded border transition-colors ${isDarkMode ? 'bg-black/40 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                               Change Image
                             </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 cursor-pointer py-4" onClick={() => fileInputRef.current.click()}>
                            <svg className={`w-8 h-8 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className={`text-xs font-bold ${textMuted}`}>Click to upload a picture</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-5">
                    <div>
                      <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>Specific Tasks</label>
                      <textarea name="description" rows="4" value={formData.description} onChange={handleFormChange} required readOnly={modalMode === 'view'} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors resize-none border ${bgInput} ${theme.ring}`} />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>Skills & Learnings</label>
                      <textarea name="learnings" rows="4" value={formData.learnings} onChange={handleFormChange} required readOnly={modalMode === 'view'} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors resize-none border ${bgInput} ${theme.ring}`} />
                    </div>
                  </div>
                  <div className={`pt-3 flex justify-end gap-2 mt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                    <button type="button" onClick={closeModal} className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>{modalMode === 'view' ? 'Close' : 'Cancel'}</button>
                    {modalMode !== 'view' && (
                      <button type="submit" disabled={isSubmitting || !formData.hours} className={`px-5 py-2 rounded-lg font-bold text-xs text-white shadow-sm transition-colors ${theme.primary} disabled:opacity-50`}>
                        {isSubmitting ? 'Saving...' : (modalMode === 'add' ? 'Save Log' : 'Update')}
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
            {modalMode === 'delete' && (
               <div className="p-8 text-center flex flex-col items-center">
                 <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 text-red-500 flex items-center justify-center mb-4"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
                 <h3 className={`text-lg font-bold mb-2 ${textMain}`}>Delete Log</h3>
                 <p className={`text-[12px] mb-6 ${textMuted}`}>Are you sure you want to remove this log entry?</p>
                 <div className="w-full flex gap-3">
                   <button onClick={closeModal} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>Cancel</button>
                   <button onClick={handleDeleteConfirm} disabled={isSubmitting} className="flex-1 py-2 rounded-lg font-bold text-xs text-white bg-red-600 hover:bg-red-500 disabled:opacity-50">Delete</button>
                 </div>
               </div>
            )}
          </div>
        </div>
      )}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px; }`}</style>
    </div>
  );
}

export default DailyLogs;