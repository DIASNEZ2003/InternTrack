import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

function Journal() {
  const [department, setDepartment] = useState('');
  const [profile, setProfile] = useState(null);
  const [savedJournals, setSavedJournals] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingFile, setIsFetchingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentMode, setDocumentMode] = useState('create'); 

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [journalToDelete, setJournalToDelete] = useState(null);
  const [editingJournal, setEditingJournal] = useState(null); 
  const [isDeleting, setIsDeleting] = useState(false);

  const [modalMonth, setModalMonth] = useState(new Date().getMonth().toString());
  const [modalYear, setModalYear] = useState(new Date().getFullYear().toString());
  const [selectedWeekId, setSelectedWeekId] = useState('');

  const [customFileName, setCustomFileName] = useState('');
  const [generatedReport, setGeneratedReport] = useState({ weekNumber: '1', activities: '', learnings: '', totalHours: '', inclusiveDates: '' });

  // GLOBAL DARK MODE LISTENER
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    const handleThemeChange = () => setIsDarkMode(localStorage.getItem('theme') === 'dark');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => { fetchProfileAndData(); }, []);

  const fetchProfileAndData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from('profiles').select('first_name, last_name, department').eq('id', user.id).single();
      if (profileData) { setProfile(profileData); setDepartment(profileData.department); }
      const { data: logsData } = await supabase.from('daily_logs').select('*').eq('user_id', user.id).order('date', { ascending: true });
      if (logsData && logsData.length > 0) setWeeks(groupLogsByWeek(logsData));
      const { data: savedData } = await supabase.from('saved_journals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setSavedJournals(savedData || []);
    } catch (error) { console.error("Error fetching data:", error); } finally { setIsLoading(false); }
  };

  const getWeekLabel = (dateObject) => {
    const dateNum = dateObject.getDate();
    const weekNum = Math.ceil(dateNum / 7);
    const month = dateObject.toLocaleString('en-US', { month: 'long' });
    const year = dateObject.getFullYear();
    let suffix = "th";
    if (weekNum === 1) suffix = "st";
    if (weekNum === 2) suffix = "nd";
    if (weekNum === 3) suffix = "rd";
    return { label: `${weekNum}${suffix} week of ${month} ${year}`, weekNumber: weekNum.toString() };
  };

  const groupLogsByWeek = (logs) => {
    const groups = {};
    logs.forEach(log => {
      const date = new Date(log.date + 'T00:00:00'); 
      const day = date.getDay() || 7; 
      const monday = new Date(date);
      monday.setDate(date.getDate() - day + 1);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      const key = `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
      const { label, weekNumber } = getWeekLabel(monday);
      const startMonth = monday.toLocaleDateString('en-US', { month: 'long' });
      const startDay = monday.getDate();
      const endMonth = friday.toLocaleDateString('en-US', { month: 'long' });
      const endDay = friday.getDate();
      const year = friday.getFullYear();
      let dateRangeString = startMonth === endMonth ? `${startMonth} ${startDay} - ${endDay}, ${year}` : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;

      if (!groups[key]) groups[key] = { id: key, label: label, weekNumber: weekNumber, dateRangeString: dateRangeString, mondayDate: monday, logs: [] };
      groups[key].logs.push(log);
    });
    return Object.values(groups).sort((a, b) => b.mondayDate - a.mondayDate);
  };

  const availableYears = [...new Set(weeks.map(w => w.mondayDate.getFullYear()))].sort((a, b) => b - a);
  const filteredModalWeeks = weeks.filter(week => (modalMonth === 'all' || week.mondayDate.getMonth().toString() === modalMonth) && (modalYear === 'all' || week.mondayDate.getFullYear().toString() === modalYear));

  const getThemeColors = (deptCode) => {
    switch (deptCode) {
      case 'BSIT': return { primary: 'bg-purple-600', ring: 'focus:ring-purple-400', border: 'border-purple-500/50', text: 'text-purple-400', bgLight: 'bg-purple-500/20' };
      case 'BSAB': return { primary: 'bg-green-600', ring: 'focus:ring-green-400', border: 'border-green-500/50', text: 'text-green-400', bgLight: 'bg-green-500/20' };
      case 'BSHM': return { primary: 'bg-yellow-600', ring: 'focus:ring-yellow-400', border: 'border-yellow-500/50', text: 'text-yellow-400', bgLight: 'bg-yellow-500/20' };
      case 'BSCRIM': return { primary: 'bg-rose-700', ring: 'focus:ring-rose-400', border: 'border-rose-500/50', text: 'text-rose-400', bgLight: 'bg-rose-500/20' };
      case 'COTED': return { primary: 'bg-blue-600', ring: 'focus:ring-blue-400', border: 'border-blue-500/50', text: 'text-blue-400', bgLight: 'bg-blue-500/20' };
      default: return { primary: 'bg-gray-700', ring: 'focus:ring-gray-400', border: 'border-gray-500/50', text: 'text-gray-300', bgLight: 'bg-gray-500/20' };
    }
  };

  const theme = getThemeColors(department);
  const bgCard = isDarkMode ? 'bg-gray-900/40 border-white/10 shadow-lg' : 'bg-white border-gray-200 shadow-sm';
  const bgHeader = isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200';
  const bgInput = isDarkMode ? 'bg-black/40 border-white/10 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const bgHover = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50/80';

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedWeekId) return;
    setIsGenerating(true);
    try {
      const weekData = weeks.find(w => w.id === selectedWeekId);
      if (!weekData) throw new Error("Week data not found.");
      const { logs, dateRangeString, weekNumber } = weekData;
      
      const prompt = `You are helping an intern compile their daily notes into a Weekly Progress Report. Read the following daily logs and write TWO paragraphs in the first person ("I"):
1. A summary of the tasks and activities completed during the week.
2. A summary of the overall skills developed and lessons learned.
Write in simple, natural, everyday English. Make it sound human and conversational, like a real student wrote it. Do not use overly complex or formal words.

Daily Logs:
${logs.map(l => `Tasks: ${l.description} | Learnings: ${l.learnings}`).join('\n')}

Respond strictly with a pure JSON object following this exact schema without any markdown formatting:
{
  "activities": "A single paragraph summarizing the tasks.",
  "learnings": "A single paragraph summarizing the learnings."
}`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`, 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ model: 'openai/gpt-oss-120b', messages: [{ role: 'user', content: prompt }], response_format: { type: "json_object" }, temperature: 0.8, max_completion_tokens: 1024, top_p: 1 }) 
      });
      
      if (!response.ok) throw new Error("Failed to communicate with Groq API.");
      const responseData = await response.json();
      let rawContent = responseData.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiGeneratedText = JSON.parse(rawContent);
      
      setGeneratedReport({ 
        weekNumber: weekNumber, 
        activities: aiGeneratedText.activities || "", 
        learnings: aiGeneratedText.learnings || "", 
        inclusiveDates: dateRangeString 
      });
      setCustomFileName(`Weekly_Report_Week_${weekNumber}`);
      setEditingJournal(null); setDocumentMode('create'); setIsGenerateModalOpen(false); setIsResultModalOpen(true);
    } catch (error) { alert(`AI Error: ${error.message}`); } finally { setIsGenerating(false); }
  };

  const handleOpenDocument = async (journal, mode) => {
    setIsFetchingFile(true);
    try {
      const { data, error } = await supabase.storage.from('journals').download(journal.file_path);
      if (error) throw error;
      const text = await data.text();
      
      let activitiesText = '';
      let learningsText = '';
      
      // Support opening the new clean JSON format OR fallback to older HTML versions
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
      
      setGeneratedReport({ weekNumber: journal.week_number, inclusiveDates: journal.inclusive_dates, activities: activitiesText, learnings: learningsText });
      setCustomFileName(journal.file_name.replace(/\.(json|docx|doc)$/i, ''));
      setEditingJournal(journal); setDocumentMode(mode); setIsResultModalOpen(true);
    } catch (error) { alert("Failed to load document."); } finally { setIsFetchingFile(false); }
  };

  const handleSaveToSupabase = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // We safely store the raw data as JSON in Supabase to avoid all HTML corruption issues
      const cleanedBase = customFileName.replace(/\.(json|docx|doc)$/i, '').trim();
      const finalFileName = cleanedBase === '' ? `Weekly_Report_Week_${generatedReport.weekNumber}.json` : `${cleanedBase}.json`;
      
      const reportData = {
        weekNumber: generatedReport.weekNumber,
        inclusiveDates: generatedReport.inclusiveDates,
        activities: generatedReport.activities,
        learnings: generatedReport.learnings,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || ''
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const filePath = editingJournal && cleanedBase === editingJournal.file_name.replace(/\.(json|docx|doc)$/i, '') ? editingJournal.file_path : `${user.id}/${Date.now()}_${finalFileName}`;
      
      const { error: uploadError } = await supabase.storage.from('journals').upload(filePath, blob, { contentType: 'application/json', upsert: true });
      if (uploadError) throw uploadError;

      if (editingJournal) {
        if (filePath !== editingJournal.file_path) await supabase.storage.from('journals').remove([editingJournal.file_path]);
        await supabase.from('saved_journals').update({ week_number: generatedReport.weekNumber, inclusive_dates: generatedReport.inclusiveDates, file_name: finalFileName, file_path: filePath }).eq('id', editingJournal.id); 
      } else {
        await supabase.from('saved_journals').insert([{ user_id: user.id, week_number: generatedReport.weekNumber, inclusive_dates: generatedReport.inclusiveDates, file_name: finalFileName, file_path: filePath }]);
      }
      setIsSaveModalOpen(false); setIsResultModalOpen(false); fetchProfileAndData(); 
    } catch (error) { alert('Failed to save file: ' + error.message); } finally { setIsSaving(false); }
  };

  const handleDownload = async (journal) => {
    try {
      const { data, error } = await supabase.storage.from('journals').download(journal.file_path);
      if (error) throw error;
      
      let reportData = { weekNumber: '', inclusiveDates: '', activities: '', learnings: '', firstName: profile?.first_name || '', lastName: profile?.last_name || '' };
      const text = await data.text();

      // Read the clean JSON data from Supabase, or extract HTML if it's an old file
      if (journal.file_name.endsWith('.json')) {
        reportData = { ...reportData, ...JSON.parse(text) };
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
        reportData.weekNumber = journal.week_number;
        reportData.inclusiveDates = journal.inclusive_dates;
      }

      // Convert line breaks into separate paragraphs for Word
      const createParagraphs = (textStr) => {
          if (!textStr) return [new Paragraph({ text: "" })];
          return textStr.split('\n').map(line => new Paragraph({ text: line, indent: { firstLine: 720 }, spacing: { after: 120 } }));
      };

      // Construct a mathematically perfect, native Word Document using docx
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

      // Generate the binary DOCX blob and force the browser to download it
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
      
    } catch (error) { alert('Failed to download file: ' + error.message); }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await supabase.storage.from('journals').remove([journalToDelete.file_path]);
      await supabase.from('saved_journals').delete().eq('id', journalToDelete.id);
      setSavedJournals(savedJournals.filter(item => item.id !== journalToDelete.id));
      setIsDeleteModalOpen(false); setJournalToDelete(null);
    } catch (error) { alert('Failed to delete report.'); } finally { setIsDeleting(false); }
  };

  const openGenerateModal = () => { setModalMonth(new Date().getMonth().toString()); setModalYear(new Date().getFullYear().toString()); setSelectedWeekId(''); setIsGenerateModalOpen(true); };

  const filteredJournals = savedJournals.filter(journal => {
    const query = searchQuery.toLowerCase();
    return (
      (journal.file_name || '').toLowerCase().includes(query) ||
      (journal.inclusive_dates || '').toLowerCase().includes(query) ||
      (journal.week_number || '').toString().includes(query)
    );
  });

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 animate-fade-in w-full relative">
      <div className={`flex flex-col md:flex-row md:items-center justify-between w-full mb-4 gap-3 p-3 rounded-xl border ${bgCard}`}>
        <div className="relative w-full max-w-sm flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search reports by name, dates, or week..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] font-medium outline-none transition-colors ${bgInput} ${theme.ring}`} />
        </div>
        <button onClick={openGenerateModal} className={`w-full md:w-auto flex items-center justify-center gap-1.5 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm shrink-0 transition-colors ${theme.primary} hover:opacity-90`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg> Generate Report
        </button>
      </div>

      <div className={`flex-1 rounded-xl overflow-hidden flex flex-col relative border ${bgCard}`}>
        {(isLoading || isFetchingFile) && (
          <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center ${isDarkMode ? 'bg-black/50 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'}`}>
            <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${theme.border} mb-2`}></div>
          </div>
        )}

        {filteredJournals.length === 0 && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <h3 className={`text-sm font-bold mb-1 ${textMain}`}>No reports found</h3>
            <p className={`text-xs ${textMuted}`}>Click "Generate Report" to compile logs into a document.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className={`sticky top-0 z-10 border-b ${bgHeader}`}>
                <tr>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider w-16 text-center ${textMuted}`}>Week</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Document</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Dates</th>
                  <th className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-right ${textMuted}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                {filteredJournals.map((item) => (
                  <tr key={item.id} className={`transition-colors group ${bgHover}`}>
                    <td className="py-2 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-bold ${isDarkMode ? theme.bgLight : 'bg-gray-100'} ${theme.text}`}>{item.week_number}</span>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/><path d="M8 12h8v2H8zm0 4h8v2H8z"/></svg>
                        </div>
                        <div>
                          {/* Force UI to look like a docx even though we save it intelligently */}
                          <p className={`text-[13px] font-bold leading-tight ${textMain}`}>{item.file_name.replace(/\.json$/i, '.docx')}</p>
                          <p className={`text-[11px] ${textMuted}`}>{new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`py-2 px-4 text-[12px] font-medium ${textMuted}`}>{item.inclusive_dates}</td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleOpenDocument(item, 'view')} disabled={isFetchingFile} className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white bg-white/5 hover:bg-white/10' : 'text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50'}`}>View</button>
                        <button onClick={() => handleOpenDocument(item, 'edit')} disabled={isFetchingFile} className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${isDarkMode ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20' : 'text-gray-500 hover:text-amber-600 bg-gray-50 hover:bg-amber-50'}`}>Edit</button>
                        <button onClick={() => handleDownload(item)} className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors border ${isDarkMode ? 'border-white/10 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-gray-200 text-gray-600 hover:text-emerald-700 bg-white hover:bg-emerald-50'}`}>Download</button>
                        <button onClick={() => {setJournalToDelete(item); setIsDeleteModalOpen(true);}} className={`p-1.5 ml-1 rounded-md transition-colors ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-white/5' : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GENERATE MODAL */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
              <h2 className={`text-lg font-bold ${textMain}`}>Generate Report</h2>
              <button onClick={() => setIsGenerateModalOpen(false)} className={`${textMuted} hover:text-white hover:bg-white/10 p-1.5 rounded-md`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleGenerate} className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${textMuted}`}>Month</label>
                  <select value={modalMonth} onChange={(e) => { setModalMonth(e.target.value); setSelectedWeekId(''); }} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors border ${bgInput} ${theme.ring}`}>
                    <option value="all">All</option>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (<option key={i} value={i.toString()}>{m}</option>))}
                  </select>
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${textMuted}`}>Year</label>
                  <select value={modalYear} onChange={(e) => { setModalYear(e.target.value); setSelectedWeekId(''); }} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors border ${bgInput} ${theme.ring}`}>
                    <option value="all">All</option>
                    {availableYears.map(year => <option key={year} value={year.toString()}>{year}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${textMuted}`}>Select Week</label>
                <select value={selectedWeekId} onChange={(e) => setSelectedWeekId(e.target.value)} required disabled={filteredModalWeeks.length === 0} className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-colors border ${bgInput} ${theme.ring} disabled:opacity-50`}>
                  <option value="" disabled>{filteredModalWeeks.length === 0 ? "No logs for this filter" : "Choose a week..."}</option>
                  {filteredModalWeeks.map((week) => (<option key={week.id} value={week.id}>{week.label} ({week.logs.length} Logs)</option>))}
                </select>
              </div>
              <div className={`pt-2 flex justify-end gap-2 mt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                <button type="button" onClick={() => setIsGenerateModalOpen(false)} className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>Cancel</button>
                <button type="submit" disabled={isGenerating || filteredModalWeeks.length === 0} className={`px-5 py-2 rounded-lg font-bold text-xs text-white shadow-sm flex items-center gap-1.5 ${theme.primary} disabled:opacity-50`}>{isGenerating ? 'Generating...' : 'Generate'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE RESPONSIVE A4 DOCUMENT VIEWER */}
      {isResultModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex flex-col p-2 sm:p-6 animate-fade-in">
          <div className={`rounded-xl shadow-2xl w-full max-w-5xl mx-auto flex flex-col h-full overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-gray-200 border-gray-400'}`}>
            
            {/* Toolbar Header */}
            <div className={`px-4 py-3 flex justify-between items-center border-b shrink-0 shadow-sm ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-gray-100 border-gray-300'}`}>
              <h3 className={`text-sm sm:text-base font-bold flex items-center gap-2 ${textMain}`}>
                {documentMode === 'view' ? 'Viewing Document' : editingJournal ? 'Editing Document' : 'Generated Document'}
                {documentMode === 'view' && <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>Read Only</span>}
              </h3>
              <div className="flex gap-2">
                <button onClick={() => { setIsResultModalOpen(false); setEditingJournal(null); }} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-200'}`}>Close</button>
                {documentMode === 'view' ? (
                  <button onClick={() => setDocumentMode('edit')} className={`px-4 py-1.5 rounded-lg font-bold text-xs text-white shadow-sm flex items-center gap-1.5 ${theme.primary}`}>Edit</button>
                ) : (
                  <button onClick={() => setIsSaveModalOpen(true)} className={`px-4 py-1.5 rounded-lg font-bold text-xs text-white shadow-sm flex items-center gap-1.5 ${theme.primary}`}>{editingJournal ? 'Save Updates' : 'Save Document'}</button>
                )}
              </div>
            </div>

            {/* The "Paper" Container */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-8 flex justify-center custom-scrollbar">
              <div 
                className="bg-white shadow-xl border border-gray-300 shrink-0 mx-auto transition-all"
                style={{ 
                  width: '100%', maxWidth: '210mm', minHeight: '297mm', padding: 'clamp(1.5rem, 5vw, 3rem)', fontFamily: 'Arial, sans-serif', color: 'black' 
                }}
              >
                <h1 className="text-center text-sm sm:text-base font-bold uppercase mb-8">WEEKLY PROGRESS REPORT</h1>
                
                {/* Responsive Header Grid */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8 text-[12px] sm:text-[13px]">
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex items-center"><span className="w-24 shrink-0">Student's Name:</span><strong className="font-bold flex-1">{profile?.first_name} {profile?.last_name}</strong></div>
                    <div className="flex items-center"><span className="w-24 shrink-0">Week #:</span>
                      <input type="text" value={generatedReport.weekNumber} onChange={(e) => setGeneratedReport({...generatedReport, weekNumber: e.target.value})} readOnly={documentMode === 'view'} className={`font-bold w-16 border-b outline-none text-black bg-transparent ${documentMode === 'view' ? 'border-transparent' : 'border-gray-400 focus:border-blue-500'}`} />
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center sm:justify-end"><span className="mr-2">Inclusive Dates:</span>
                      <input type="text" value={generatedReport.inclusiveDates} onChange={(e) => setGeneratedReport({...generatedReport, inclusiveDates: e.target.value})} readOnly={documentMode === 'view'} className={`font-bold w-full sm:w-[160px] border-b outline-none text-black bg-transparent sm:text-right ${documentMode === 'view' ? 'border-transparent' : 'border-gray-400 focus:border-blue-500'}`} />
                    </div>
                  </div>
                </div>
                
                {/* Content Sections */}
                <div className="mb-6">
                  <h3 className="text-[13px] sm:text-[14px] mb-2 font-bold">Activities:</h3>
                  <textarea 
                    value={generatedReport.activities} 
                    onChange={(e) => setGeneratedReport({...generatedReport, activities: e.target.value})} 
                    rows="6" 
                    readOnly={documentMode === 'view'} 
                    className={`w-full outline-none resize-none text-[12px] sm:text-[13px] leading-relaxed bg-transparent text-black ${documentMode === 'view' ? 'border-transparent' : 'border border-gray-300 p-2 focus:border-blue-500 rounded'}`} 
                    style={{ textIndent: '2rem' }} 
                  />
                </div>
                
                <div className="mb-6">
                  <h3 className="text-[13px] sm:text-[14px] mb-2 font-bold">Learning Experience:</h3>
                  <textarea 
                    value={generatedReport.learnings} 
                    onChange={(e) => setGeneratedReport({...generatedReport, learnings: e.target.value})} 
                    rows="10" 
                    readOnly={documentMode === 'view'} 
                    className={`w-full outline-none resize-none text-[12px] sm:text-[13px] leading-relaxed bg-transparent text-black ${documentMode === 'view' ? 'border-transparent' : 'border border-gray-300 p-2 focus:border-blue-500 rounded'}`} 
                    style={{ textIndent: '2rem' }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
              <h3 className={`text-base font-bold ${textMain}`}>{editingJournal ? 'Update Report' : 'Save Report'}</h3>
            </div>
            <div className="p-6">
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${textMuted}`}>File Name</label>
              <div className={`flex items-center border rounded-lg px-3 shadow-sm transition-colors ${bgInput} ${theme.ring}`}>
                 <input type="text" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} placeholder="e.g. Week_1" className="py-2 bg-transparent outline-none font-medium text-[13px] w-full" />
                 <span className={`font-bold text-xs select-none ${textMuted}`}>.docx</span>
              </div>
            </div>
            <div className={`px-6 py-4 flex justify-end gap-2 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
              <button onClick={() => setIsSaveModalOpen(false)} className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>Cancel</button>
              <button onClick={handleSaveToSupabase} disabled={isSaving || !customFileName.trim()} className={`px-5 py-1.5 rounded-lg font-bold text-xs text-white shadow-sm ${theme.primary} disabled:opacity-50`}>{isSaving ? 'Saving...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-xl w-full max-w-[300px] flex flex-col p-6 text-center items-center border ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 text-red-500 flex items-center justify-center mb-4"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
            <h3 className={`text-lg font-bold mb-2 ${textMain}`}>Delete Report?</h3>
            <p className={`text-xs mb-6 ${textMuted}`}>Remove "{journalToDelete?.file_name}"?</p>
            <div className="w-full flex gap-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${isDarkMode ? 'text-gray-300 bg-white/5 hover:bg-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}>Cancel</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-2 rounded-lg font-bold text-xs text-white bg-red-600 hover:bg-red-500 disabled:opacity-50">{isDeleting ? '...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
}

export default Journal;