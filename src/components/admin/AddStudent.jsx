import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../api/supabaseClient';

function AddStudent() {
  const [department, setDepartment] = useState('');
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [activeStudentId, setActiveStudentId] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showModalPassword, setShowModalPassword] = useState(false); 
  const [feedback, setFeedback] = useState({ show: false, type: '', message: '' }); 

  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({ 
    first_name: '', 
    last_name: '', 
    username: '', 
    password: '', 
    confirm_password: '', 
    company_id: '',
    avatar_url: ''
  });

  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  
  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => { 
    fetchAdminAndStudents(); 
  }, []);

  const fetchAdminAndStudents = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: adminProfile } = await supabase.from('profiles').select('department').eq('id', user.id).single();
      let adminDept = adminProfile ? adminProfile.department : '';
      setDepartment(adminDept);

      // Fetch students instead of supervisors
      const { data: studentsData } = await supabase.from('profiles').select('*').eq('department', adminDept).eq('role', 'student').order('created_at', { ascending: false });
      const { data: compData } = await supabase.from('companies').select('id, name').eq('department', adminDept);

      const mappedStudents = (studentsData || []).map(student => {
        const comp = (compData || []).find(c => String(c.id) === String(student.company_id));
        return { ...student, company_name: comp ? comp.name : 'Unassigned' };
      });

      setStudents(mappedStudents);
      setCompanies(compData || []);
    } catch (error) { 
      console.error("Error:", error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { primary: 'bg-purple-600 hover:bg-purple-500', ring: 'focus:ring-purple-400 focus:border-purple-400', border: 'border-purple-500/50', text: 'text-purple-400', bgLight: 'bg-purple-500/20' };
      case 'BSAB': return { primary: 'bg-green-600 hover:bg-green-500', ring: 'focus:ring-green-400 focus:border-green-400', border: 'border-green-500/50', text: 'text-green-400', bgLight: 'bg-green-500/20' };
      case 'BSHM': return { primary: 'bg-yellow-600 hover:bg-yellow-500', ring: 'focus:ring-yellow-400 focus:border-yellow-400', border: 'border-yellow-500/50', text: 'text-yellow-400', bgLight: 'bg-yellow-500/20' };
      case 'BSCRIM': return { primary: 'bg-rose-700 hover:bg-rose-600', ring: 'focus:ring-rose-400 focus:border-rose-400', border: 'border-rose-500/50', text: 'text-rose-400', bgLight: 'bg-rose-500/20' };
      case 'COTED': return { primary: 'bg-blue-600 hover:bg-blue-500', ring: 'focus:ring-blue-400 focus:border-blue-400', border: 'border-blue-500/50', text: 'text-blue-400', bgLight: 'bg-blue-500/20' };
      default: return { primary: 'bg-gray-700 hover:bg-gray-600', ring: 'focus:ring-gray-400 focus:border-gray-400', border: 'border-gray-500/50', text: 'text-gray-300', bgLight: 'bg-gray-500/20' };
    }
  };

  const theme = getThemeColors(department);
  const bgCard = isDarkMode ? 'bg-gray-900/40 border-white/10 shadow-lg' : 'bg-white border-gray-200 shadow-sm';
  const bgHeader = isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200';
  const bgInput = isDarkMode ? 'bg-black/40 border-white/10 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const bgHover = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50/80';
  const btnEdit = isDarkMode ? 'text-gray-400 hover:text-amber-400 bg-white/5 hover:bg-amber-500/20 border border-white/5' : 'text-gray-500 hover:text-amber-600 bg-gray-50 hover:bg-amber-50';
  const btnDelete = isDarkMode ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/20 bg-white/5 border border-white/5' : 'text-gray-400 hover:text-red-600 hover:bg-red-50';

  const togglePasswordVisibility = (id) => setVisiblePasswords(p => ({ ...p, [id]: !p[id] }));
  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const closeFeedbackModal = () => setFeedback({ show: false, type: '', message: '' });

  const handlePhotoUpload = async (event) => {
    try {
      setIsUploading(true);
      const file = event.target.files[0];
      if (!file) return;
      const fileName = `stu-${Math.random()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      setFeedback({ show: true, type: 'error', message: 'Error uploading image: ' + error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const openModal = (mode, student = null) => {
    setModalMode(mode);
    setShowModalPassword(false);
    if (student) {
      setFormData({ 
        first_name: student.first_name || '', 
        last_name: student.last_name || '', 
        username: student.username || '', 
        company_id: student.company_id ? String(student.company_id) : '', 
        password: '', 
        confirm_password: '',
        avatar_url: student.avatar_url || ''
      });
      setActiveStudentId(student.id);
    } else {
      setFormData({ first_name: '', last_name: '', username: '', password: '', confirm_password: '', company_id: '', avatar_url: '' });
      setActiveStudentId(null);
    }
    setIsModalOpen(true);
  };
  
  const closeModal = () => { setIsModalOpen(false); setActiveStudentId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password || formData.confirm_password) {
      if (formData.password !== formData.confirm_password) {
        setFeedback({ show: true, type: 'error', message: 'Passwords do not match!' });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();

      const safeCompanyId = formData.company_id && formData.company_id.trim() !== '' ? formData.company_id : null;
      
      const payload = { 
        first_name: formData.first_name, 
        last_name: formData.last_name, 
        username: formData.username, 
        company_id: safeCompanyId,
        company_status: safeCompanyId ? 'active' : 'unassigned', // Auto-set status if they assign a company manually
        department, 
        role: 'student',
        avatar_url: formData.avatar_url
      };

      if (formData.password) payload.raw_password = formData.password;
      
      if (modalMode === 'add') {
        if (!formData.password) throw new Error("Password is required for new students.");
        const authEmail = formData.username.includes('@') ? formData.username : `${formData.username}@student.com`;
        
        const { data: authData, error: authError } = await supabase.auth.signUp({ email: authEmail, password: formData.password });
        if (authError) throw authError;

        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token
          });
        }

        const { error: profileError } = await supabase.from('profiles').upsert([{ id: authData.user.id, ...payload }]);
        if (profileError) throw profileError; 

        setFeedback({ show: true, type: 'success', message: 'Student successfully registered!' });

      } else {
        if (formData.password) {
          const { error: rpcError } = await supabase.rpc('admin_update_user_password', {
            target_user_id: activeStudentId,
            new_password: formData.password
          });
          if (rpcError) throw rpcError; 
        }
        
        const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', activeStudentId);
        if (updateError) throw updateError; 

        setFeedback({ show: true, type: 'success', message: 'Student updated successfully!' });
      }
      
      await fetchAdminAndStudents();
      closeModal();
    } catch (error) { 
      let errorMsg = error.message;
      if (errorMsg.includes('User already registered')) errorMsg = 'This username is already taken. Please choose another.';
      setFeedback({ show: true, type: 'error', message: errorMsg });
    } finally { 
      setIsSubmitting(false); 
    }
  };

  // FULLY DESTROY LOGIN CREDENTIALS
  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setIsSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_delete_user', {
        target_user_id: studentToDelete.id
      });
      if (rpcError) throw rpcError;

      const { error: deleteError } = await supabase.from('profiles').delete().eq('id', studentToDelete.id);
      if (deleteError) throw deleteError; 

      setStudents(students.filter(s => s.id !== studentToDelete.id));
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
      setFeedback({ show: true, type: 'success', message: 'Student completely deleted from the system.' });
    } catch (error) { 
      setFeedback({ show: true, type: 'error', message: 'Failed to completely delete account: ' + error.message });
      setIsDeleteModalOpen(false);
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const filteredStudents = students.filter(student => (
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (student.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (student.company_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  ));

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 animate-fade-in w-full relative overflow-hidden">
      
      <div className={`flex flex-col md:flex-row md:items-center justify-between w-full mb-4 gap-3 p-3 rounded-xl border shrink-0 ${bgCard}`}>
        <div className="relative flex-1 w-full max-w-sm">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search student or company..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} 
          />
        </div>
        <button 
          onClick={() => openModal('add')} 
          className={`w-full md:w-auto flex justify-center items-center gap-1.5 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-lg transition-colors border border-white/10 ${theme.primary}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4M4 12h16" />
          </svg> Add Student
        </button>
      </div>

      <div className={`flex-1 rounded-xl overflow-hidden flex flex-col relative border ${bgCard}`}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${theme.border}`}></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <h3 className={`text-sm font-bold mb-1 ${textMain}`}>No students found</h3>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            
            {/* 🖥️ DESKTOP VIEW (TABLE) */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className={`sticky top-0 border-b z-10 ${bgHeader}`}>
                  <tr>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider w-12 text-center ${textMuted}`}>No.</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Student Profile</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Company Assigned</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Username</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Password</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Role</th>
                    <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-right ${textMuted}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {filteredStudents.map((student, index) => {
                    const displayPassword = student.raw_password || student.password || 'Private Password';
                    const isPrivate = displayPassword === 'Private Password';

                    return (
                      <tr key={student.id} className={`transition-colors group ${bgHover}`}>
                        <td className={`py-2.5 px-4 text-center text-[11px] font-bold ${textMuted}`}>{index + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            {student.avatar_url ? (
                              <img src={student.avatar_url} className={`w-8 h-8 rounded-lg object-cover shrink-0 shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`} />
                            ) : (
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                                {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className={`text-[13px] font-bold leading-tight ${textMain}`}>{student.first_name} {student.last_name}</p>
                              <p className={`text-[11px] uppercase ${textMuted}`}>{department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-[12px] font-medium ${textMain}`}>{student.company_name}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-[12px] font-medium px-2 py-1 rounded-md border ${isDarkMode ? 'bg-black/40 border-white/5 text-gray-300' : 'bg-gray-100 border-transparent text-gray-700'}`}>
                            {student.username || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-[12px] ${isPrivate ? 'font-medium italic opacity-70 text-amber-500' : 'font-mono tracking-wide'} px-2 py-1 rounded-md inline-block min-w-[80px] text-center border ${isDarkMode ? 'bg-black/40 border-white/5 text-gray-300' : 'bg-gray-100 border-transparent text-gray-700'}`}>
                              {visiblePasswords[student.id] ? displayPassword : '••••••••'}
                            </span>
                            <button onClick={() => togglePasswordVisibility(student.id)} className="text-gray-500 hover:text-gray-300 transition-colors p-1">
                              {visiblePasswords[student.id] ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                            Student
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openModal('edit', student)} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${btnEdit}`}>
                              Edit
                            </button>
                            <button onClick={() => {setStudentToDelete(student); setIsDeleteModalOpen(true);}} className={`p-1.5 rounded-md transition-colors ml-1 ${btnDelete}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
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
                const displayPassword = student.raw_password || student.password || 'Private Password';
                const isPrivate = displayPassword === 'Private Password';

                return (
                  <div key={student.id} className={`transition-all duration-300 rounded-xl border p-4 flex flex-col gap-3 relative shadow-sm ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                    
                    {/* Header: Avatar + Info */}
                    <div className="flex items-center gap-3 w-full">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} className={`w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`} />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-[14px] ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                          {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`text-[13px] font-bold truncate ${textMain}`}>{student.first_name} {student.last_name}</span>
                        <span className={`text-[11px] uppercase ${textMuted}`}>{department}</span>
                      </div>
                      <div className={`text-[10px] font-bold px-2 py-1 rounded-md ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        STUDENT
                      </div>
                    </div>

                    <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}></div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${textMuted}`}>Company</span>
                        <span className={`text-[12px] font-medium truncate ${textMain}`}>{student.company_name}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${textMuted}`}>Username</span>
                        <span className={`text-[12px] font-medium truncate ${textMain}`}>{student.username || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${textMuted}`}>Password</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] ${isPrivate ? 'font-medium italic opacity-70 text-amber-500' : 'font-mono tracking-wide'} px-2 py-1 rounded-md inline-block text-center border ${isDarkMode ? 'bg-black/40 border-white/5 text-gray-300' : 'bg-gray-100 border-transparent text-gray-700'}`}>
                          {visiblePasswords[student.id] ? displayPassword : '••••••••'}
                        </span>
                        <button onClick={() => togglePasswordVisibility(student.id)} className="text-gray-500 hover:text-gray-300 transition-colors p-1">
                          {visiblePasswords[student.id] ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex flex-wrap items-center justify-end gap-2 pt-2 mt-1 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                      <button onClick={() => openModal('edit', student)} className={`flex-1 justify-center inline-flex px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${isDarkMode ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20' : 'text-gray-500 hover:text-amber-600 bg-gray-50 hover:bg-amber-50'}`}>
                        Edit Student
                      </button>
                      <button onClick={() => {setStudentToDelete(student); setIsDeleteModalOpen(true);}} className={`justify-center inline-flex p-1.5 rounded-md transition-colors ${isDarkMode ? 'text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* STUDENT MODAL (Add / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-white/10 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
              <div>
                <h2 className={`text-lg font-bold tracking-tight ${textMain}`}>{modalMode === 'add' ? 'Register Student' : 'Edit Student'}</h2>
                <p className={`text-[11px] font-medium uppercase mt-0.5 ${textMuted}`}>Department: {department}</p>
              </div>
              <button onClick={closeModal} className={`${textMuted} hover:text-white hover:bg-white/10 p-1.5 rounded-md`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
              
              <div className="flex flex-col items-center justify-center mb-1">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-16 h-16 rounded-full border-2 border-dashed ${theme.border} ${isDarkMode ? 'bg-black/40' : 'bg-gray-50'} flex items-center justify-center cursor-pointer overflow-hidden relative group transition-colors shadow-sm`}>
                  {isUploading ? <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${theme.border}`}></div> : formData.avatar_url ? <><img src={formData.avatar_url} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[11px] font-bold text-white">Edit</span></div></> : <svg className={`w-6 h-6 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>First Name</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleFormChange} required placeholder="Enter first name" className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>Last Name</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleFormChange} required placeholder="Enter last name" className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
                </div>
              </div>
              
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>Assign Company</label>
                <select name="company_id" value={formData.company_id || ''} onChange={handleFormChange} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors border ${bgInput} ${theme.ring}`}>
                  <option value="">None (Unassigned)</option>
                  {companies.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>Username</label>
                <input type="text" name="username" value={formData.username} onChange={handleFormChange} required placeholder="e.g. jdelacruz" className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>
                    {modalMode === 'edit' ? 'Change Password (Optional)' : 'Password'}
                  </label>
                  <div className="relative">
                    <input type={showModalPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleFormChange} required={modalMode === 'add'} placeholder={modalMode === 'edit' ? "Leave blank to keep" : "Enter password"} className={`w-full px-3 py-2 pr-9 rounded-lg text-[13px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
                    <button type="button" onClick={() => setShowModalPassword(!showModalPassword)} className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${textMuted} hover:${textMain} transition-colors`}>
                      {showModalPassword ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1.5 ${textMuted}`}>
                    {modalMode === 'edit' ? 'Confirm New Password' : 'Confirm Password'}
                  </label>
                  <input type={showModalPassword ? "text" : "password"} name="confirm_password" value={formData.confirm_password} onChange={handleFormChange} required={modalMode === 'add'} placeholder={modalMode === 'edit' ? "Leave blank to keep" : "Confirm password"} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
                </div>
              </div>
              <div className={`pt-3 flex justify-end gap-2 mt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                <button type="button" onClick={closeModal} className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className={`px-5 py-2 rounded-lg font-bold text-xs text-white shadow-lg border border-white/10 ${theme.primary} disabled:opacity-50`}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`rounded-2xl shadow-2xl w-full max-w-[300px] flex flex-col p-6 text-center items-center border border-white/10 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4 border border-red-500/30">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className={`text-lg font-bold mb-2 ${textMain}`}>Remove Student?</h3>
            <p className={`text-[12px] mb-6 leading-relaxed ${textMuted}`}>Delete <span className={`font-bold ${textMain}`}>{studentToDelete?.first_name}</span>?</p>
            <div className="w-full flex gap-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className={`py-2 rounded-lg font-bold text-xs transition-colors flex-1 ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="py-2 rounded-lg font-bold text-xs text-white shadow-lg flex-1 bg-red-600 hover:bg-red-500">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {feedback.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-[320px] flex flex-col p-6 text-center items-center border ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
            {feedback.type === 'error' ? (
              <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 text-red-500 flex items-center justify-center mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
            <h3 className={`text-lg font-bold mb-2 ${textMain}`}>
              {feedback.type === 'error' ? 'Oops! Action Failed' : 'Success!'}
            </h3>
            <p className={`text-[12px] mb-6 leading-relaxed ${textMuted}`}>{feedback.message}</p>
            <button onClick={closeFeedbackModal} className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm ${feedback.type === 'error' ? 'bg-gray-800 text-white hover:bg-black' : `${theme.primary} text-white`}`}>
              Okay, Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default AddStudent;