import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../api/supabaseClient';

function Company() {
  const [department, setDepartment] = useState('');
  const [companies, setCompanies] = useState([]);
  const [students, setStudents] = useState([]); 
  const [supervisors, setSupervisors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null); 

  // Modal States
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCompanyForAssign, setSelectedCompanyForAssign] = useState(null);
  const [studentToAssign, setStudentToAssign] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [companyToView, setCompanyToView] = useState(null);

  // Pending Requests Modal States
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Photo Upload States
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form & Feedback States
  const [formData, setFormData] = useState({
    name: '', address: '', capacity: '', required_hours: '', logo_url: ''
  });
  const [feedback, setFeedback] = useState({ show: false, type: '', message: '' });

  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: adminProfile } = await supabase.from('profiles').select('department').eq('id', user.id).single();
        
      let adminDept = adminProfile ? adminProfile.department : '';
      setDepartment(adminDept);

      const { data: companiesData } = await supabase.from('companies').select('*').eq('department', adminDept).order('created_at', { ascending: false });
      const { data: studentsData } = await supabase.from('profiles').select('id, first_name, last_name, company_id, avatar_url, company_status').eq('department', adminDept).eq('role', 'student');
      const { data: supervisorsData } = await supabase.from('profiles').select('id, first_name, last_name, company_id, avatar_url').eq('department', adminDept).eq('role', 'supervisor');

      setCompanies(companiesData || []);
      setStudents(studentsData || []);
      setSupervisors(supervisorsData || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (formData.address && formData.address.length > 2 && showSuggestions) {
        searchPHAddress(formData.address);
      } else {
        setAddressSuggestions([]);
      }
    }, 600); 
    return () => clearTimeout(delayDebounceFn);
  }, [formData.address, showSuggestions]);

  const searchPHAddress = async (query) => {
    setIsSearchingAddress(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=ph&format=json&addressdetails=1&limit=5`);
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        setAddressSuggestions([]);
        return;
      }

      const formattedSuggestions = data.map(item => {
        const addr = item.address || {};
        const parts = [addr.road, addr.neighbourhood, addr.village, addr.suburb, addr.city || addr.town || addr.municipality, addr.state || addr.province || addr.county];
        const cleanName = [...new Set(parts.filter(Boolean))].join(', ');
        return { ...item, clean_name: cleanName || item.display_name.split(',')[0] };
      });
      setAddressSuggestions(formattedSuggestions);
    } catch (error) {
      console.error("Error:", error);
      setAddressSuggestions([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSelectAddress = (addressName) => {
    setFormData({ ...formData, address: addressName });
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  // FIX: Added the missing handleFormChange function that caused the white screen crash!
  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const closeFeedbackModal = () => setFeedback({ show: false, type: '', message: '' });

  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { primary: 'bg-purple-600 hover:bg-purple-500', ring: 'focus:ring-purple-400', border: 'border-purple-500/50', text: 'text-purple-400', bgLight: 'bg-purple-500/20' };
      case 'BSAB': return { primary: 'bg-green-600 hover:bg-green-500', ring: 'focus:ring-green-400', border: 'border-green-500/50', text: 'text-green-400', bgLight: 'bg-green-500/20' };
      case 'BSHM': return { primary: 'bg-yellow-600 hover:bg-yellow-500', ring: 'focus:ring-yellow-400', border: 'border-yellow-500/50', text: 'text-yellow-400', bgLight: 'bg-yellow-500/20' };
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
  const btnEdit = isDarkMode ? 'text-gray-400 hover:text-amber-400 bg-white/5 hover:bg-amber-500/20 border border-white/5' : 'text-gray-500 hover:text-amber-600 bg-gray-50 hover:bg-amber-50';
  const btnDelete = isDarkMode ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/20 bg-white/5 border border-white/5' : 'text-gray-400 hover:text-red-600 hover:bg-red-50';

  const handlePhotoUpload = async (event) => {
    try {
      setIsUploading(true);
      const file = event.target.files[0];
      if (!file) return;
      const fileName = `company-${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
    } catch (error) {
      setFeedback({ show: true, type: 'error', message: 'Error uploading image: ' + error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const openCompanyModal = (mode, company = null) => {
    setModalMode(mode);
    setShowSuggestions(false);
    setAddressSuggestions([]);
    if (company) {
      setFormData({ 
        name: company.name || '', 
        address: company.address || '', 
        capacity: company.capacity ?? '', 
        required_hours: company.required_hours ?? '', 
        logo_url: company.logo_url || '' 
      });
      setActiveCompanyId(company.id);
    } else {
      setFormData({ name: '', address: '', capacity: '', required_hours: '', logo_url: '' });
      setActiveCompanyId(null);
    }
    setIsCompanyModalOpen(true);
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { 
        name: formData.name, 
        address: formData.address, 
        capacity: parseInt(formData.capacity) || 0, 
        required_hours: parseInt(formData.required_hours) || 0, 
        department, 
        logo_url: formData.logo_url 
      };

      if (modalMode === 'add') {
        await supabase.from('companies').insert([payload]);
        setFeedback({ show: true, type: 'success', message: 'Company added successfully!' });
      } else {
        await supabase.from('companies').update(payload).eq('id', activeCompanyId);
        setFeedback({ show: true, type: 'success', message: 'Company updated successfully!' });
      }
      await fetchData();
      setIsCompanyModalOpen(false);
    } catch (error) { 
      setFeedback({ show: true, type: 'error', message: 'Failed to save: ' + error.message });
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;
    setIsSubmitting(true);
    try {
      await supabase.from('companies').delete().eq('id', companyToDelete.id);
      setCompanies(companies.filter(c => c.id !== companyToDelete.id));
      setIsDeleteModalOpen(false);
      setFeedback({ show: true, type: 'success', message: 'Company successfully deleted.' });
    } catch (error) { 
      setFeedback({ show: true, type: 'error', message: 'Failed to delete company: ' + error.message });
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const openAssignModal = (company) => { 
    setSelectedCompanyForAssign(company); 
    setStudentToAssign(''); 
    setIsAssignModalOpen(true); 
  };

  const handleAssignStudent = async (e) => {
    e.preventDefault();
    if (!studentToAssign || !selectedCompanyForAssign) return;
    setIsSubmitting(true);
    try {
      await supabase.from('profiles').update({ company_id: selectedCompanyForAssign.id, company_status: 'active' }).eq('id', studentToAssign);
      await fetchData();
      setIsAssignModalOpen(false);
      setFeedback({ show: true, type: 'success', message: 'Student successfully assigned!' });
    } catch (error) { 
      setFeedback({ show: true, type: 'error', message: 'Failed to assign: ' + error.message });
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleAcceptRequest = async (studentId) => {
    setProcessingId(studentId);
    try {
      await supabase.from('profiles').update({ company_status: 'active' }).eq('id', studentId);
      await fetchData();
    } catch (error) {
      setFeedback({ show: true, type: 'error', message: "Failed to accept: " + error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineRequest = async (studentId) => {
    setProcessingId(studentId);
    try {
      await supabase.from('profiles').update({ company_id: null, company_status: 'unassigned' }).eq('id', studentId);
      await fetchData();
    } catch (error) {
      setFeedback({ show: true, type: 'error', message: "Failed to decline: " + error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const getAssignedStudents = (companyId) => students.filter(s => 
    String(s.company_id) === String(companyId) && (s.company_status === 'active' || !s.company_status)
  );
  
  const getPendingStudents = (companyId) => students.filter(s => 
    String(s.company_id) === String(companyId) && s.company_status === 'pending'
  );
  
  const getUnassignedStudents = () => students.filter(s => 
    !s.company_id || s.company_status === 'unassigned' || !s.company_status
  );
  
  const getCompanySupervisors = (companyId) => supervisors.filter(s => String(s.company_id) === String(companyId));

  const openViewModal = (company) => { setCompanyToView(company); setIsViewModalOpen(true); };

  const filteredCompanies = companies.filter(company => {
    const query = searchQuery.toLowerCase();
    return (company.name || '').toLowerCase().includes(query) || (company.address || '').toLowerCase().includes(query);
  });

  const allPendingRequests = students.filter(s => s.company_status === 'pending');
  const filteredPendingRequests = allPendingRequests.filter(s => 
    `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(pendingSearchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 animate-fade-in w-full relative">
      
      {/* Top Action Bar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between w-full mb-4 gap-3 p-3 rounded-xl border ${bgCard}`}>
        <div className="relative flex-1 max-w-sm">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search company by name or address..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
        </div>
        
        <div className="flex items-center gap-3">
          {/* NOTIFICATION BELL BUTTON */}
          <button 
            onClick={() => setIsPendingModalOpen(true)} 
            className={`relative p-2.5 rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-white/10 hover:bg-gray-700 text-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {allPendingRequests.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-md animate-pulse">
                {allPendingRequests.length}
              </span>
            )}
          </button>

          <button onClick={() => openCompanyModal('add')} className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-lg transition-colors border border-white/10 ${theme.primary}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4M4 12h16" /></svg> Add Company
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className={`flex-1 rounded-xl overflow-hidden flex flex-col relative border ${bgCard}`}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center"><div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${theme.border}`}></div></div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <h3 className={`text-sm font-bold mb-1 ${textMain}`}>No companies found</h3>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className={`sticky top-0 border-b z-10 ${bgHeader}`}>
                <tr>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider w-12 text-center ${textMuted}`}>No.</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Company Profile</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Supervisor(s)</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Assigned Students</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-center ${textMuted}`}>Slots</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-center ${textMuted}`}>Req. Hours</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-right ${textMuted}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                {filteredCompanies.map((company, index) => {
                  const assignedStudents = getAssignedStudents(company.id);
                  const pendingStudentsCount = getPendingStudents(company.id).length;
                  const totalOccupied = assignedStudents.length + pendingStudentsCount;
                  const isFull = totalOccupied >= company.capacity;
                  const companySups = getCompanySupervisors(company.id);

                  return (
                    <tr key={company.id} className={`transition-colors group ${bgHover}`}>
                      <td className={`py-2.5 px-4 text-center text-[11px] font-bold ${textMuted}`}>{index + 1}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          {company.logo_url ? (
                            <img src={company.logo_url} className={`w-8 h-8 rounded-lg object-cover shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`} />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                          )}
                          <div>
                            <p className={`text-[13px] font-bold leading-tight ${textMain}`}>{company.name}</p>
                            <p className={`text-[11px] truncate max-w-[200px] xl:max-w-[300px] ${textMuted}`}>{company.address || 'No address provided'}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-2.5 px-4">
                        {companySups.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {companySups.map(sup => (
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
                          <span className={`text-[11px] italic ${textMuted}`}>No supervisor</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2 overflow-hidden">
                            {assignedStudents.slice(0, 3).map(student => (
                              student.avatar_url ? (
                                <img key={student.id} src={student.avatar_url} className={`inline-block h-6 w-6 rounded-full ring-2 object-cover ${isDarkMode ? 'ring-gray-800' : 'ring-white'}`} />
                              ) : (
                                <div key={student.id} className={`inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ${isDarkMode ? 'ring-gray-800' : 'ring-white'} ${theme.bgLight} ${theme.text} text-[8px] font-bold`}>
                                  {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                </div>
                              )
                            ))}
                            {assignedStudents.length > 3 && <div className={`inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ${isDarkMode ? 'ring-gray-800 bg-gray-700 text-gray-300' : 'ring-white bg-gray-100 text-gray-600'} text-[8px] font-bold`}>+{assignedStudents.length - 3}</div>}
                            {assignedStudents.length === 0 && <span className={`text-[11px] italic ${textMuted}`}>None</span>}
                          </div>
                          {assignedStudents.length > 0 && <button onClick={() => openViewModal(company)} className={`text-[10px] font-bold hover:underline ${theme.text}`}>View</button>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center justify-center gap-1">
                          <div className="flex items-baseline text-[13px] font-bold">
                            <span className={isFull ? 'text-red-500' : textMain}>{totalOccupied}</span>
                            <span className={`mx-1 ${textMuted}`}>/</span>
                            <span className={textMuted}>{company.capacity}</span>
                          </div>
                          {pendingStudentsCount > 0 && <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-1.5 rounded">{pendingStudentsCount} pending</span>}
                          {isFull && pendingStudentsCount === 0 && <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Full</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className={`inline-flex items-center justify-center gap-1.5 text-[12px] font-bold ${textMain}`}>
                          <svg className={`w-3.5 h-3.5 ${theme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {company.required_hours > 0 ? `${company.required_hours} hrs` : <span className={`italic font-normal ${textMuted}`}>Not set</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openAssignModal(company)} disabled={isFull} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${isFull ? (isDarkMode ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5' : 'bg-gray-100 text-gray-400 cursor-not-allowed') : (isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100')}`}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4M4 12h16" /></svg> Assign
                          </button>
                          <button onClick={() => openCompanyModal('edit', company)} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ml-1 ${btnEdit}`}>Edit</button>
                          <button onClick={() => {setCompanyToDelete(company); setIsDeleteModalOpen(true);}} className={`p-1.5 rounded-md transition-colors ml-1 ${btnDelete}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- PENDING REQUESTS MODAL --- */}
      {isPendingModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-white/10 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <div>
                  <h2 className={`text-lg font-bold tracking-tight ${textMain}`}>Pending Approvals</h2>
                  <p className={`text-[11px] font-medium mt-0.5 ${textMuted}`}>Review student deployment requests</p>
                </div>
              </div>
              <button onClick={() => setIsPendingModalOpen(false)} className={`${textMuted} hover:text-white hover:bg-white/10 p-1.5 rounded-md`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className={`p-4 border-b ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50/50'}`}>
              <div className="relative w-full">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                  type="text" 
                  placeholder="Search student name..." 
                  value={pendingSearchQuery} 
                  onChange={(e) => setPendingSearchQuery(e.target.value)} 
                  className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors border ${isDarkMode ? 'bg-gray-800 border-white/10 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'} ${theme.ring}`} 
                />
              </div>
            </div>

            <div className="p-0 max-h-[400px] overflow-y-auto custom-scrollbar">
              {filteredPendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-center">
                  <p className={`text-sm font-bold ${textMain}`}>No pending requests</p>
                  <p className={`text-xs mt-1 ${textMuted}`}>All student requests have been handled.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className={`sticky top-0 ${isDarkMode ? 'bg-gray-800/90 backdrop-blur-sm' : 'bg-gray-50/90 backdrop-blur-sm'}`}>
                    <tr>
                      <th className={`py-2 px-4 text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Student</th>
                      <th className={`py-2 px-4 text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Requested Company</th>
                      <th className={`py-2 px-4 text-[10px] font-bold uppercase tracking-wider text-right ${textMuted}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                    {filteredPendingRequests.map(student => {
                      const reqCompany = companies.find(c => String(c.id) === String(student.company_id));
                      return (
                        <tr key={student.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {student.avatar_url ? (
                                <img src={student.avatar_url} className={`w-8 h-8 rounded-full object-cover border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
                              ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                                  {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                </div>
                              )}
                              <span className={`text-[13px] font-bold ${textMain}`}>{student.first_name} {student.last_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[12px] font-bold ${theme.text}`}>{reqCompany?.name || 'Unknown Company'}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleDeclineRequest(student.id)}
                                disabled={processingId === student.id}
                                className={`p-1.5 rounded-lg border transition-colors ${isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'} disabled:opacity-50`}
                                title="Decline Request"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                              <button 
                                onClick={() => handleAcceptRequest(student.id)}
                                disabled={processingId === student.id}
                                className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'} disabled:opacity-50`}
                              >
                                {processingId === student.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Approve</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT COMPANY MODAL --- */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-visible border border-white/10 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
              <div>
                <h2 className={`text-lg font-bold tracking-tight ${textMain}`}>{modalMode === 'add' ? 'Register Company' : 'Edit Company'}</h2>
                <p className={`text-[11px] font-medium uppercase mt-0.5 ${textMuted}`}>Department: {department}</p>
              </div>
              <button onClick={() => setIsCompanyModalOpen(false)} className={`${textMuted} hover:text-white hover:bg-white/10 p-1.5 rounded-md transition-colors`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <form onSubmit={handleCompanySubmit} className="p-6 flex flex-col gap-4">
              
              <div className="flex flex-col items-center justify-center mb-1">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-16 h-16 rounded-2xl border-2 border-dashed ${theme.border} ${isDarkMode ? 'bg-black/40' : 'bg-gray-50'} flex items-center justify-center cursor-pointer overflow-hidden relative group transition-colors shadow-sm`}>
                  {isUploading ? <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${theme.border}`}></div> : formData.logo_url ? <><img src={formData.logo_url} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[11px] font-bold text-white">Edit</span></div></> : <svg className={`w-6 h-6 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${textMuted}`}>Company Name</label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} required placeholder="Enter company name" className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
              </div>

              <div className="relative">
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${textMuted}`}>Address / Location</label>
                <div className="relative">
                  <input type="text" name="address" value={formData.address || ''} onChange={handleFormChange} onFocus={() => setShowSuggestions(true)} placeholder="Enter address" autoComplete="off" required className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
                  {isSearchingAddress && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className={`w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin ${theme.border}`}></div></div>}
                </div>
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className={`absolute z-[100] w-full mt-1 border rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-gray-800 border-white/10' : 'bg-white border-gray-200'}`}>
                    {addressSuggestions.map((suggestion) => (
                      <div key={suggestion.place_id} onClick={() => handleSelectAddress(suggestion.clean_name)} className={`px-3 py-2.5 text-[12px] cursor-pointer border-b last:border-0 leading-snug font-medium transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-200 border-white/5' : 'hover:bg-blue-50 text-gray-700 border-gray-100'}`}>
                        {suggestion.clean_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${textMuted}`}>Student Count</label>
                  <input type="number" name="capacity" value={formData.capacity ?? ''} onChange={handleFormChange} min="1" required placeholder="Slots" className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${textMuted}`}>Required Hours</label>
                  <input type="number" name="required_hours" value={formData.required_hours ?? ''} onChange={handleFormChange} min="1" required placeholder="Enter hours" className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
                </div>
              </div>

              <div className={`pt-3 flex justify-end gap-2 mt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                <button type="button" onClick={() => setIsCompanyModalOpen(false)} className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`px-5 py-2 rounded-lg font-bold text-xs text-white shadow-lg border border-white/10 flex items-center gap-1.5 ${theme.primary} disabled:opacity-50 transition-colors`}>{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ASSIGN STUDENT MODAL --- */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-white/10 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
              <h2 className={`text-lg font-bold tracking-tight ${textMain}`}>Assign Student</h2>
              <p className={`text-[11px] font-medium mt-0.5 ${textMuted}`}>To: <span className="font-bold">{selectedCompanyForAssign?.name}</span></p>
            </div>
            <form onSubmit={handleAssignStudent} className="p-6 flex flex-col gap-4">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${textMuted}`}>Select Unassigned Student</label>
                <select value={studentToAssign} onChange={(e) => setStudentToAssign(e.target.value)} required className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`}>
                  <option value="" disabled>Choose a student...</option>
                  {getUnassignedStudents().map(student => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}
                </select>
                {getUnassignedStudents().length === 0 && <p className="text-xs text-red-500 font-bold mt-2">No unassigned students in this department.</p>}
              </div>
              <div className={`pt-3 flex justify-end gap-2 mt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>Cancel</button>
                <button type="submit" disabled={isSubmitting || !studentToAssign} className={`px-5 py-2 rounded-lg font-bold text-xs text-white shadow-lg border border-white/10 flex items-center gap-1.5 ${theme.primary} disabled:opacity-50 transition-colors`}>{isSubmitting ? 'Assigning...' : 'Confirm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW STUDENTS MODAL --- */}
      {isViewModalOpen && companyToView && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-white/10 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
              <div>
                <h2 className={`text-lg font-bold tracking-tight ${textMain}`}>Assigned Students</h2>
                <p className={`text-[11px] font-medium mt-0.5 ${textMuted}`}>{companyToView.name}</p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className={`${textMuted} hover:text-white hover:bg-white/10 p-1.5 rounded-md`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-4 max-h-[350px] overflow-y-auto custom-scrollbar">
              {getAssignedStudents(companyToView.id).length === 0 ? (
                <p className={`text-center text-sm my-6 font-medium ${textMuted}`}>No students assigned yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {getAssignedStudents(companyToView.id).map(student => (
                    <div key={student.id} className={`flex items-center gap-3 p-2.5 rounded-xl border border-transparent transition-colors ${isDarkMode ? 'hover:bg-white/5 hover:border-white/10' : 'hover:bg-gray-50 hover:border-gray-100'}`}>
                      {student.avatar_url ? (
                        <img src={student.avatar_url} className={`w-9 h-9 rounded-full object-cover shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>{student.first_name?.charAt(0)}{student.last_name?.charAt(0)}</div>
                      )}
                      <div>
                        <p className={`text-[13px] font-bold leading-tight ${textMain}`}>{student.first_name} {student.last_name}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>{department} Intern</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl w-full max-w-[300px] flex flex-col p-6 text-center items-center border border-white/10 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4 border border-red-500/30">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className={`text-lg font-bold mb-2 ${textMain}`}>Remove Company?</h3>
            <p className={`text-[12px] mb-6 leading-relaxed ${textMuted}`}>Delete <span className={`font-bold ${textMain}`}>{companyToDelete?.name}</span>? Students assigned here will be unassigned.</p>
            <div className="w-full flex gap-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className={`py-2 rounded-lg font-bold text-xs transition-colors flex-1 ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={isSubmitting} className={`py-2 rounded-lg font-bold text-xs text-white shadow-lg border border-red-500/50 flex-1 transition-colors bg-red-600 hover:bg-red-500 disabled:opacity-50`}>{isSubmitting ? '...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- FEEDBACK MODAL --- */}
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
              {feedback.type === 'error' ? 'Something went wrong' : 'Success!'}
            </h3>
            <p className={`text-[12px] mb-6 leading-relaxed ${textMuted}`}>{feedback.message}</p>
            <button onClick={closeFeedbackModal} className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm ${feedback.type === 'error' ? 'bg-gray-800 text-white hover:bg-black' : `${theme.primary} text-white`}`}>
              Okay, got it
            </button>
          </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; }`}</style>
    </div>
  );
}

export default Company;