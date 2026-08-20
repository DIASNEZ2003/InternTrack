import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

function InternJournals() {
  const [department, setDepartment] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [hasCompany, setHasCompany] = useState(true);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [weekFilter, setWeekFilter] = useState('');

  // View Document States
  const [isFetchingFile, setIsFetchingFile] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [generatedReport, setGeneratedReport] = useState({
    weekNumber: '',
    inclusiveDates: '',
    activities: '',
    learnings: ''
  });

  // GLOBAL DARK MODE LISTENER
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  
  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => {
    fetchSupervisorAndJournals();
  }, []);

  const fetchSupervisorAndJournals = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get Supervisor's Profile & Assigned Company
      const { data: supProfile } = await supabase.from('profiles').select('department, company_id').eq('id', user.id).single();
      
      if (supProfile) {
        setDepartment(supProfile.department || '');

        if (!supProfile.company_id) {
          setHasCompany(false);
          setIsLoading(false);
          return;
        }

        // Fetch company name for UI
        const { data: compData } = await supabase.from('companies').select('name').eq('id', supProfile.company_id).single();
        if (compData) setCompanyName(compData.name);

        // 2. Fetch ONLY the students assigned to this Supervisor's company
        const { data: studentsData, error: studentsError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, department')
          .eq('company_id', supProfile.company_id)
          .eq('role', 'student');

        if (studentsError) throw studentsError;

        if (!studentsData || studentsData.length === 0) {
          setReports([]);
          setIsLoading(false);
          return;
        }

        // 3. Extract just the student IDs
        const studentIds = studentsData.map(student => student.id);

        // 4. Fetch journals ONLY for those specific student IDs
        const { data: journalsData, error: journalsError } = await supabase
          .from('saved_journals')
          .select('*')
          .in('user_id', studentIds) 
          .order('created_at', { ascending: false });

        if (journalsError) throw journalsError;

        // 5. Combine the data so the UI can display the student's name/avatar with their report
        const combinedData = (journalsData || []).map(journal => {
          const studentProfile = studentsData.find(s => s.id === journal.user_id);
          return {
            ...journal,
            profiles: studentProfile || {} 
          };
        });

        setReports(combinedData);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- DARK MODE THEME COLORS ---
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

  // Dynamic Theme Variables
  const bgCard = isDarkMode ? 'bg-gray-900/40 border-white/10 shadow-lg' : 'bg-white border-gray-200 shadow-sm';
  const bgHeader = isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200';
  const bgInput = isDarkMode ? 'bg-black/40 border-white/10 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const selectBg = isDarkMode ? 'bg-black/40 border-white/10 text-gray-200' : 'bg-white border-gray-200 text-gray-600';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const bgHover = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50/80';

  const filteredReports = reports.filter(report => {
    const studentName = `${report.profiles.first_name} ${report.profiles.last_name}`.toLowerCase();
    const fileName = (report.file_name || '').toLowerCase();
    const searchMatch = studentName.includes(searchQuery.toLowerCase()) || fileName.includes(searchQuery.toLowerCase());
    
    let reportMonth = null;
    if (report.created_at) {
      reportMonth = new Date(report.created_at).getMonth() + 1;
    }
    
    const monthMatch = monthFilter && reportMonth ? reportMonth.toString() === monthFilter : true;
    const weekMatch = weekFilter ? report.week_number === weekFilter : true;
    
    return searchMatch && monthMatch && weekMatch;
  });

  // --- DOCUMENT VIEWING LOGIC ---
  const handleViewDocument = async (journal) => {
    setIsFetchingFile(true);
    try {
      const { data, error } = await supabase.storage.from('journals').download(journal.file_path);
      if (error) throw error;

      const text = await data.text();
      let activitiesText = '';
      let learningsText = '';

      // Handle both new .json format and old .html format safely
      if (journal.file_name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        activitiesText = parsed.activities || '';
        learningsText = parsed.learnings || '';
      } else {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const headings = doc.querySelectorAll('h3');
        headings.forEach(h => {
          if (h.textContent.includes('Activities')) {
            let nextEl = h.nextElementSibling;
            if (nextEl && nextEl.tagName === 'P') activitiesText = nextEl.innerHTML.replace(/<br\s*[\/]?>/gi, '\n').trim();
          }
          if (h.textContent.includes('Learning Experience')) {
            let nextEl = h.nextElementSibling;
            if (nextEl && nextEl.tagName === 'P') learningsText = nextEl.innerHTML.replace(/<br\s*[\/]?>/gi, '\n').trim();
          }
        });
      }

      setGeneratedReport({ 
        weekNumber: journal.week_number, 
        inclusiveDates: journal.inclusive_dates, 
        activities: activitiesText, 
        learnings: learningsText 
      });
      setViewingProfile(journal.profiles);
      setIsResultModalOpen(true);
    } catch (error) {
      alert("Failed to load document.");
    } finally {
      setIsFetchingFile(false);
    }
  };

  // --- DOCUMENT DOWNLOAD LOGIC ---
  const handleDownload = async (journal) => {
    try {
      const { data, error } = await supabase.storage.from('journals').download(journal.file_path);
      if (error) throw error;
      
      const text = await data.text();
      let reportData = {
        weekNumber: journal.week_number,
        inclusiveDates: journal.inclusive_dates,
        activities: '',
        learnings: '',
        firstName: journal.profiles?.first_name || '',
        lastName: journal.profiles?.last_name || ''
      };

      if (journal.file_name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        reportData.activities = parsed.activities || '';
        reportData.learnings = parsed.learnings || '';
      } else {
        const parser = new DOMParser();
        const docParser = parser.parseFromString(text, 'text/html');
        const headings = docParser.querySelectorAll('h3');
        headings.forEach(h => { 
          if (h.textContent.includes('Activities')) { 
            let nextEl = h.nextElementSibling; 
            if (nextEl && nextEl.tagName === 'P') reportData.activities = nextEl.textContent.trim(); 
          }
          if (h.textContent.includes('Learning Experience')) { 
            let nextEl = h.nextElementSibling; 
            if (nextEl && nextEl.tagName === 'P') reportData.learnings = nextEl.textContent.trim(); 
          } 
        });
      }

      // Convert line breaks into separate paragraphs for Word
      const createParagraphs = (textStr) => {
          if (!textStr) return [new Paragraph({ text: "" })];
          return textStr.split('\n').map(line => new Paragraph({ text: line, indent: { firstLine: 720 }, spacing: { after: 120 } }));
      };

      // Construct a perfectly valid Word Document using docx
      const doc = new Document({
        creator: "InternTrack",
        title: `Weekly Report - Week ${reportData.weekNumber}`,
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "WEEKLY PROGRESS REPORT",
              alignment: AlignmentType.CENTER,
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({ text: "" }), // Spacing
            new Paragraph({
              children: [
                new TextRun({ text: "Student's Name: ", bold: true }),
                new TextRun(`${reportData.firstName} ${reportData.lastName}`),
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Week #: ", bold: true }),
                new TextRun(`${reportData.weekNumber}`),
                new TextRun({ text: "    Inclusive Dates: ", bold: true }),
                new TextRun(`${reportData.inclusiveDates}`),
              ]
            }),
            new Paragraph({ text: "" }), // Spacing
            new Paragraph({
              children: [new TextRun({ text: "Activities:", bold: true, size: 24 })],
              spacing: { before: 240, after: 120 }
            }),
            ...createParagraphs(reportData.activities),
            new Paragraph({
              children: [new TextRun({ text: "Learning Experience:", bold: true, size: 24 })],
              spacing: { before: 240, after: 120 }
            }),
            ...createParagraphs(reportData.learnings)
          ]
        }]
      });

      // Generate the DOCX file and trigger download
      const blob = await Packer.toBlob(doc);
      const dlName = journal.file_name.replace(/\.(json|doc|docx)$/i, '') + '.docx';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = dlName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) { 
      alert('Failed to download file.'); 
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (!hasCompany) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in w-full">
        <div className={`p-8 rounded-2xl border text-center max-w-md ${bgCard}`}>
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className={`text-xl font-bold mb-2 ${textMain}`}>No Company Assigned</h2>
          <p className={`text-sm ${textMuted}`}>You have not been assigned to a company yet. You cannot view intern journals until your account is linked to a partner company.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 animate-fade-in w-full relative">
      
      {/* Top Action Bar with Filters */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between w-full mb-4 gap-3 p-4 rounded-xl border ${bgCard}`}>
        <div>
          <h2 className={`text-lg font-bold tracking-tight ${textMain}`}>Intern Journals</h2>
          <p className={`text-[11px] font-medium uppercase tracking-wider mt-0.5 ${textMuted}`}>{companyName}</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:max-w-[200px]">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search intern or file..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className={`w-full md:w-auto px-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors ${selectBg} ${theme.ring}`}>
              <option value="">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} className={`w-full md:w-auto px-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors ${selectBg} ${theme.ring}`}>
              <option value="">All Weeks</option>
              <option value="1">1st Week</option>
              <option value="2">2nd Week</option>
              <option value="3">3rd Week</option>
              <option value="4">4th Week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className={`flex-1 rounded-xl overflow-hidden flex flex-col relative border ${bgCard}`}>
        {(isLoading || isFetchingFile) && (
          <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center ${isDarkMode ? 'bg-black/50 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'}`}>
            <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${theme.border} mb-2`}></div>
            {isFetchingFile && <p className={`text-[11px] font-bold ${textMuted}`}>Opening Document...</p>}
          </div>
        )}
        
        {filteredReports.length === 0 && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <h3 className={`text-sm font-bold mb-1 ${textMain}`}>No journals found</h3>
            <p className={`text-xs max-w-sm mx-auto ${textMuted}`}>There are no submitted journals matching your criteria from interns at {companyName}.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className={`sticky top-0 border-b z-10 ${bgHeader}`}>
                <tr>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider w-16 text-center ${textMuted}`}>Week</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Intern</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Document Name</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Inclusive Dates</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-center ${textMuted}`}>Submitted</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-right ${textMuted}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                {filteredReports.map((report) => (
                  <tr key={report.id} className={`transition-colors group ${bgHover}`}>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-bold ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                        {report.week_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        {report.profiles.avatar_url ? (
                          <img src={report.profiles.avatar_url} className={`w-8 h-8 rounded-lg object-cover shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`} />
                        ) : (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs shadow-sm border ${isDarkMode ? 'border-white/5' : 'border-transparent'} ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>
                            {report.profiles.first_name?.charAt(0)}{report.profiles.last_name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className={`text-[13px] font-bold leading-tight ${textMain}`}>{report.profiles.first_name} {report.profiles.last_name}</p>
                          <p className={`text-[10px] uppercase font-bold tracking-wider ${textMuted}`}>{department} Intern</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/><path d="M8 12h8v2H8zm0 4h8v2H8z"/></svg>
                        </div>
                        {/* Ensure file name appears as .docx visually even if backed by json */}
                        <p className={`text-[12px] font-bold ${textMain}`}>{report.file_name.replace(/\.json$/i, '.docx')}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[11px] font-medium px-2 py-1 rounded-md border ${isDarkMode ? 'bg-black/40 border-white/5 text-gray-300' : 'bg-gray-100 border-transparent text-gray-700'}`}>{report.inclusive_dates || 'N/A'}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`text-[12px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(report.created_at)}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleViewDocument(report)} disabled={isFetchingFile} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30' : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-700 border'}`}>
                          View
                        </button>
                        <button onClick={() => handleDownload(report)} disabled={isFetchingFile} className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30' : 'bg-white border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 border'}`}>
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL: VIEW DOCUMENT --- */}
      {isResultModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className={`rounded-2xl shadow-xl w-full max-w-4xl flex flex-col h-full max-h-[90vh] overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-gray-100 border-gray-300'}`}>
            <div className={`px-5 py-3 flex justify-between items-center border-b shrink-0 shadow-sm ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-base font-bold flex items-center gap-2 ${textMain}`}>
                Viewing Document
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>Read Only</span>
              </h3>
              <button onClick={() => setIsResultModalOpen(false)} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>Close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex justify-center custom-scrollbar">
              <div className={`shadow-sm border p-8 sm:p-12 shrink-0 ${isDarkMode ? 'bg-gray-800 border-white/10' : 'bg-white border-gray-200'}`} style={{ width: '100%', maxWidth: '750px', minHeight: '900px', fontFamily: 'Arial, sans-serif' }}>
                <h1 className={`text-center text-base font-bold uppercase mb-6 ${textMain}`}>WEEKLY PROGRESS REPORT</h1>
                <div className={`grid grid-cols-2 gap-x-2 gap-y-3 mb-8 text-[13px] ${textMain}`}>
                  <div className="flex"><span className="w-28">Student’s Name:</span><strong className="font-bold flex-1">{viewingProfile?.first_name} {viewingProfile?.last_name}</strong></div>
                  <div></div>
                  <div className="flex items-center"><span className="w-28">Week #:</span><span className="font-bold">{generatedReport.weekNumber}</span></div>
                  <div className="flex items-center justify-end"><span className="mr-2">Inclusive Dates:</span><span className="font-bold">{generatedReport.inclusiveDates}</span></div>
                </div>
                
                <div className="mb-5">
                  <h3 className={`text-[13px] mb-2 font-bold ${textMain}`}>Activities:</h3>
                  <div className={`w-full text-[13px] leading-relaxed p-1.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{ textIndent: '2rem' }}>
                    <div className="whitespace-pre-wrap">{generatedReport.activities}</div>
                  </div>
                </div>

                <div className="mb-5">
                  <h3 className={`text-[13px] mb-2 font-bold ${textMain}`}>Learning Experience:</h3>
                  <div className={`w-full text-[13px] leading-relaxed p-1.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`} style={{ textIndent: '2rem' }}>
                    <div className="whitespace-pre-wrap">{generatedReport.learnings}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; }`}</style>
    </div>
  );
}

export default InternJournals;