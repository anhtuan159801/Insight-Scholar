
import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import FileUpload from './components/FileUpload';
import DocumentList from './components/DocumentList';
import AnalysisView from './views/AnalysisView';
import BibliometricView from './views/BibliometricView';
import SynthesisMatrixView from './views/SynthesisMatrixView';
import FolderManager from './components/FolderManager';
import { Document, ProcessingStatus, Language, ResearchFolder, AnalysisType, LegacyAnalysisResult, PolicyAnalysisResult } from './types';
import { parseFile } from './services/fileParser';
import { analyzeDocument, analyzePolicyDocument, classifyDocument, checkRelevance, setOpenRouterModel, setPreferredEngine, setOllamaConfig } from './services/geminiService';
import { FileText, Book, Target, Menu, Sparkles, Scale } from 'lucide-react';
import { useEffect } from 'react';
import { isAcademicV2 } from './services/analysisNormalizer';
import { formatAcademicReport } from './services/analysisProjection';
import { createE2EDocument } from './services/e2eFixture';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(() => process.env.E2E_MODE === 'true' ? [createE2EDocument()] : []);
  const [folders, setFolders] = useState<ResearchFolder[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [language, setLanguage] = useState<Language>('vi'); 
  const [researchObjective, setResearchObjective] = useState('');
  
  // Sidebar States
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  const [analysisMode, setAnalysisMode] = useState<AnalysisType>('ACADEMIC'); 
  const [useSmartFilter, setUseSmartFilter] = useState(true);
  const defaultOpenRouterModel = (process.env.OPENROUTER_MODEL as string) || 'meta-llama/llama-3.3-70b-instruct';
  const [openRouterModel, setOpenRouterModelState] = useState<string>(defaultOpenRouterModel);
  const [engineMode, setEngineMode] = useState<'auto' | 'ollama'>('auto');
  const [ollamaUrl, setOllamaUrl] = useState<string>(process.env.OLLAMA_BASE_URL || '');
  const [ollamaModel, setOllamaModel] = useState<string>(process.env.OLLAMA_MODEL || '');

  useEffect(() => {
    setOpenRouterModel(openRouterModel);
    if (engineMode === 'ollama' && ollamaUrl && ollamaModel) {
      setPreferredEngine('ollama');
      setOllamaConfig(ollamaModel, ollamaUrl);
    } else {
      setPreferredEngine('auto');
    }
  }, [openRouterModel, engineMode, ollamaUrl, ollamaModel]);

  // Handle file upload
  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    
    // Sequential parsing
    for (const file of files) {
      try {
        const docData = await parseFile(file);
        setDocuments(prev => {
           if(prev.find(d => d.fileName === docData.fileName!)) return prev;
           return [...prev, docData as Document];
        });
      } catch (error) {
        console.error(`Error parsing ${file.name}`, error);
      }
    }
    setIsProcessing(false);
  }, []);

  // Handle Individual Analysis
  const handleAnalyze = async (docId: string) => {
    if (engineMode === 'ollama') {
      setOllamaConfig(ollamaModel, ollamaUrl);
    }
    setPreferredEngine(engineMode);
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: ProcessingStatus.ANALYZING, errorMessage: undefined, analysisType: analysisMode } : d));

    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    try {
      let result;
      // Route based on mode
      if (analysisMode === 'POLICY') {
        result = await analyzePolicyDocument(doc.content, language);
      } else {
        result = await analyzeDocument(doc.content, language);
      }

      // Auto-classify logic
      let matchedFolderIds: string[] = [];
      if (folders.length > 0) {
          try {
              matchedFolderIds = await classifyDocument(result, folders, language);
          } catch (classErr) {
              console.warn("Auto-classification failed", classErr);
          }
      }

      setDocuments(prev => prev.map(d => 
        d.id === docId 
        ? { ...d, status: ProcessingStatus.SUCCESS, analysis: result, folderIds: matchedFolderIds } 
        : d
      ));
    } catch (error: any) {
      const baseMsg = error?.message || '';
      const isQuota = (error?.message?.toLowerCase?.()?.includes('quota') || error?.code === 429);
      const friendly = isQuota
        ? (language === 'vi'
            ? 'Hết hạn mức/Quota. Đã xoay vòng key; thử lại sau ít phút.'
            : 'Quota exceeded. Keys rotated; please retry in a few minutes.')
        : (baseMsg || (language === 'vi' ? 'Lỗi xử lý.' : 'Processing error.'));

      setDocuments(prev => prev.map(d => 
        d.id === docId 
        ? { ...d, status: ProcessingStatus.ERROR, errorMessage: friendly } 
        : d
      ));
      if (baseMsg) console.error('[LLM Error]', baseMsg);
    }
  };

  // Smart Analyze (Bulk Action)
  const handleSmartAnalyze = async (objective: string) => {
      if (engineMode === 'ollama') {
        setOllamaConfig(ollamaModel, ollamaUrl);
      }
      setPreferredEngine(engineMode);
      const pendingDocs = documents.filter(d => d.status === ProcessingStatus.PENDING || d.status === ProcessingStatus.ERROR || d.status === ProcessingStatus.SKIPPED);
      if (pendingDocs.length === 0) return;

      // Mark all selected docs as queued
      setDocuments(prev => prev.map(d => 
          pendingDocs.find(pd => pd.id === d.id) 
          ? { ...d, status: useSmartFilter ? ProcessingStatus.FILTERING : ProcessingStatus.ANALYZING, relevanceReason: undefined, errorMessage: undefined, analysisType: analysisMode } 
          : d
      ));

      // Sequential processing to avoid simultaneous load on providers
      for (const doc of pendingDocs) {
          try {
              if (useSmartFilter) {
                  const relevanceCheck = await checkRelevance(doc.content, objective, language);
                  
                  if (!relevanceCheck.isRelevant) {
                      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: ProcessingStatus.SKIPPED, relevanceReason: relevanceCheck.reason } : d));
                      continue; 
                  }
                  setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: ProcessingStatus.ANALYZING, relevanceReason: relevanceCheck.reason } : d));
              } 

              let result;
              if (analysisMode === 'POLICY') {
                  result = await analyzePolicyDocument(doc.content, language);
              } else {
                  result = await analyzeDocument(doc.content, language);
              }
              
              let matchedFolderIds: string[] = [];
              if (folders.length > 0) {
                  try {
                      matchedFolderIds = await classifyDocument(result, folders, language);
                  } catch (e) { console.warn(e); }
              }

              setDocuments(prev => prev.map(d => 
                d.id === doc.id 
                ? { ...d, status: ProcessingStatus.SUCCESS, analysis: result, folderIds: matchedFolderIds } 
                : d
              ));

          } catch (error: any) {
               const baseMsg = error?.message || '';
               const isQuota = (error?.message?.toLowerCase?.()?.includes('quota') || error?.code === 429);
               const friendly = isQuota
                  ? (language === 'vi'
                      ? 'Hết hạn mức/Quota. Đã xoay vòng key; thử lại sau ít phút.'
                      : 'Quota exceeded. Keys rotated; please retry in a few minutes.')
                  : (baseMsg || (language === 'vi' ? 'Lỗi xử lý.' : 'Processing error.'));

               setDocuments(prev => prev.map(d => 
                d.id === doc.id 
                ? { ...d, status: ProcessingStatus.ERROR, errorMessage: friendly } 
                : d
              ));
              if (baseMsg) console.error('[LLM Error]', baseMsg);
          }
      }
  };

  // Folder & Export Handlers
  const handleAddFolder = (name: string) => setFolders([...folders, { id: Math.random().toString(36).substring(7), name }]);
  const handleDeleteFolder = (id: string) => {
    setFolders(folders.filter(f => f.id !== id));
    setDocuments(prev => prev.map(d => ({ ...d, folderIds: d.folderIds?.filter(fid => fid !== id) })));
  };
  const handleClassifyDocs = async () => {
     const analyzedDocs = documents.filter(d => d.status === ProcessingStatus.SUCCESS && d.analysis);
     if (analyzedDocs.length === 0 || folders.length === 0) return;
     setIsClassifying(true);
     for (const doc of analyzedDocs) {
        try {
            const matchedIds = await classifyDocument(doc.analysis!, folders, language);
            setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, folderIds: matchedIds } : d));
            await new Promise(r => setTimeout(r, 500)); 
        } catch (e) {}
     }
     setIsClassifying(false);
  };
  const handleDelete = (docId: string) => setDocuments(prev => prev.filter(d => d.id !== docId));
  
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleExportTxt = () => {
      const successDocs = documents.filter(d => d.status === ProcessingStatus.SUCCESS && d.analysis);
      if (successDocs.length === 0) { alert("Không có dữ liệu."); return; }
      
      let content = "INSIGHT SCHOLAR FULL REPORT\nGenerated by Insight Scholar AI\n=================================================================\n\n";
      
      successDocs.forEach((doc, i) => { 
          const a = doc.analysis!; 
          content += `DOCUMENT #${i+1}: ${a.title}\n`;

          if (isAcademicV2(a)) {
              content += `${formatAcademicReport(doc, language)}\n`;
              content += `=================================================================\n\n\n`;
              return;
          }
          
          if(a.type === 'POLICY') {
              const p = a as PolicyAnalysisResult;
              content += `TYPE: POLICY / LEGAL DOCUMENT\n`;
              content += `SOURCE & DATE: ${p.source_date}\n`;
              content += `CATEGORY: ${p.document_category}\n`;
              content += `--------------------------------------------------\n`;
              content += `[1] MAIN SUBJECT / CHỦ ĐỀ CHÍNH:\n${p.main_subject}\n\n`;
              content += `[2] KEY STAKEHOLDERS / CÁC BÊN LIÊN QUAN:\n- ${p.key_stakeholders.join('\n- ')}\n\n`;
              content += `[3] LEGAL BASIS / CƠ SỞ PHÁP LÝ:\n${p.legal_basis}\n\n`;
              content += `[4] KEY POINTS / NỘI DUNG CHÍNH:\n- ${p.key_points.join('\n- ')}\n\n`;
              content += `[5] IMPLICATIONS & IMPACT / TÁC ĐỘNG & HỆ QUẢ:\n${p.implications_impact}\n\n`;
              content += `[6] CONTROVERSIES / TRANH LUẬN:\n${p.controversies_criticism}\n\n`;
              content += `[7] CONCLUSION / KẾT LUẬN:\n${p.conclusion_summary}\n\n`;
          } else {
              const ac = a as LegacyAnalysisResult;
              content += `TYPE: ACADEMIC RESEARCH\n`;
              content += `AUTHORS: ${ac.authors?.join(', ')}\n`;
              content += `CITATION: ${ac.citation_apa}\n`;
              if(ac.doi) content += `DOI: ${ac.doi}\n`;
              content += `--------------------------------------------------\n`;
              content += `[1] THESIS & BACKGROUND / LUẬN ĐỀ & BỐI CẢNH:\n${ac.thesis_background}\n\n`;
              content += `[2] THEORETICAL FRAMEWORK / KHUNG LÝ THUYẾT:\n${ac.theoretical_framework}\n\n`;
              content += `[3] CONCEPTUAL FRAMEWORK / KHUNG KHÁI NIỆM:\n${ac.conceptual_framework}\n\n`;
              
              content += `[4] DEFINITIONS & VARIABLES / ĐỊNH NGHĨA & BIẾN SỐ:\n`;
              if (ac.definitions_variables && ac.definitions_variables.length > 0) {
                  ac.definitions_variables.forEach((def: any) => {
                      content += `   * ${def.term}: ${def.definition}\n`;
                  });
              } else {
                  content += `   (None identified / Không tìm thấy)\n`;
              }
              content += `\n`;
              
              content += `[5] METHODOLOGY / PHƯƠNG PHÁP LUẬN:\n${ac.methodology}\n\n`;
              content += `[6] RESULTS & INTERPRETATION / KẾT QUẢ & DIỄN GIẢI:\n${ac.results_interpretation}\n\n`;
              content += `[7] SCOPE & LIMITATIONS / PHẠM VI & HẠN CHẾ:\n${ac.scope_limitations}\n\n`;
              content += `[8] CONTRIBUTIONS / ĐÓNG GÓP MỚI:\n${ac.contributions_future_research}\n\n`;
              content += `[9] OVERALL CONCLUSION / KẾT LUẬN CHUNG:\n${ac.overall_conclusion}\n\n`;
          }
          
          // Keywords section
          const kws = a.keywords ? (language === 'vi' ? a.keywords.vi : a.keywords.en) : [];
          content += `[KEYWORDS]: ${kws.join(', ')}\n`;
          content += `=================================================================\n\n\n`;
      });
      
      downloadFile(content, `Insight_Scholar_Full_Report.txt`, 'text/plain');
  };
  
  const handleExportBib = () => {
      const successDocs = documents.filter(d => d.status === ProcessingStatus.SUCCESS && d.analysis);
      if (successDocs.length === 0) { alert("Không có dữ liệu."); return; }
      let c = "";
      successDocs.forEach((doc, i) => {
         const a = doc.analysis!;
         if (a.type === 'POLICY') {
              const year = a.source_date?.match(/(?:19|20)\d{2}/)?.[0] || 'unknown';
              c += `@misc{ref${i}, title={${a.title}}, author={{${a.document_category}}}, year={${year}}, note={Source: ${a.source_date}}}\n\n`;
         } else {
              const year = isAcademicV2(a) ? a.publication_year : a.citation_apa?.match(/(?:19|20)\d{2}/)?.[0] || 'unknown';
              c += `@article{ref${i}, title={${a.title}}, author={${a.authors?.join(' and ')}}, year={${year}}}\n\n`;
         }
      });
      downloadFile(c, `refs.bib`, 'application/x-bibtex');
  };

  // Render Views
  const renderContent = () => {
    if (viewingDocId) {
        const doc = documents.find(d => d.id === viewingDocId);
        if (doc) return <AnalysisView doc={doc} language={language} onBack={() => setViewingDocId(null)} />;
    }

    switch (activeTab) {
      case 'upload':
        return (
          <div className="animate-fade-in max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8 text-center md:text-left">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
                    {language === 'vi' ? 'Trung tâm Nghiên cứu' : 'Research Center'}
                </h2>
                <p className="text-slate-500 text-lg">
                    {language === 'vi' ? 'Tổ chức, sàng lọc và phân tích tài liệu khoa học/chính sách với sức mạnh của AI.' : 'Organize, screen, and analyze scientific/policy documents with AI power.'}
                </p>
            </div>

            {/* RESEARCH OBJECTIVE HERO INPUT */}
            <div className={`bg-white rounded-2xl shadow-lg shadow-slate-200/50 border mb-8 overflow-hidden group focus-within:ring-2 focus-within:ring-blue-500/50 transition-all ${useSmartFilter ? 'border-blue-200' : 'border-slate-200 opacity-90'}`}>
               <div className="p-6">
                   <div className="flex items-center gap-2.5 mb-3">
                      <div className={`p-2 rounded-lg ${useSmartFilter ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Target size={20} />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {language === 'vi' ? 'Mục tiêu (Nghiên cứu hoặc Tìm hiểu)' : 'Objective (Research or Inquiry)'}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border ${useSmartFilter ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            Context
                        </span>
                      </h3>
                   </div>
                   
                   <textarea
                      value={researchObjective}
                      onChange={(e) => setResearchObjective(e.target.value)}
                      className="w-full text-lg text-slate-700 placeholder:text-slate-300 border-none focus:ring-0 resize-none h-24 p-0 bg-transparent leading-relaxed"
                      placeholder={language === 'vi' 
                        ? "Ví dụ: Tôi đang tìm hiểu về khung pháp lý cho AI tại Việt Nam hoặc các bài báo liên quan đến biến đổi khí hậu..." 
                        : "E.g., I am researching the legal framework for AI in Vietnam or news articles related to climate change..."}
                   />
               </div>
               <div className="bg-slate-50 px-6 py-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                    <span className={`flex items-center gap-1.5 ${useSmartFilter ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                        <Sparkles size={12} /> {useSmartFilter ? (language === 'vi' ? 'Đang dùng để lọc tài liệu' : 'Active for filtering') : (language === 'vi' ? 'Chỉ dùng để tham khảo' : 'Reference only')}
                    </span>
                    <span>{researchObjective.length} chars</span>
               </div>
            </div>

            <FileUpload onFilesSelected={handleFilesSelected} />
            
            {isProcessing && <div className="mt-6 flex flex-col items-center justify-center p-8 text-slate-400">
                <div className="animate-spin text-blue-500 mb-2"><Book size={32} /></div>
                <p className="italic">{language === 'vi' ? 'Đang đọc tài liệu...' : 'Reading documents...'}</p>
            </div>}

            <DocumentList 
                documents={documents} 
                language={language}
                researchObjective={researchObjective}
                analysisMode={analysisMode}
                setAnalysisMode={setAnalysisMode}
                engineMode={engineMode}
                setEngineMode={setEngineMode}
                ollamaUrl={ollamaUrl}
                setOllamaUrl={setOllamaUrl}
                ollamaModel={ollamaModel}
                setOllamaModel={setOllamaModel}
                useSmartFilter={useSmartFilter} // Pass state
                setUseSmartFilter={setUseSmartFilter} // Pass setter
                onAnalyze={handleAnalyze} 
                onSmartAnalyze={handleSmartAnalyze}
                onDelete={handleDelete} 
                onView={(id) => { setViewingDocId(id); setActiveTab('analysis'); }} 
            />
          </div>
        );
      case 'folders':
          return (
             <div className="max-w-5xl mx-auto">
                 <FolderManager 
                  documents={documents}
                  folders={folders}
                  language={language}
                  onAddFolder={handleAddFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onClassify={handleClassifyDocs}
                  isClassifying={isClassifying}
                />
             </div>
          );
      case 'analysis':
        const analyzedDocs = documents.filter(d => d.status === ProcessingStatus.SUCCESS);
        return (
            <div className="animate-fade-in max-w-7xl mx-auto">
                 <div className="mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                        {language === 'vi' ? 'Thư viện Phân tích' : 'Analysis Library'}
                    </h2>
                    <p className="text-slate-500 text-lg">
                        {language === 'vi' ? 'Xem lại chi tiết các báo cáo đã được AI xử lý.' : 'Review detailed reports processed by AI.'}
                    </p>
                </div>
                {analyzedDocs.length === 0 ? (
                    <div className="text-center p-16 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>{language === 'vi' ? 'Chưa có tài liệu nào được phân tích thành công.' : 'No documents have been successfully analyzed.'}</p>
                    </div>
                ) : (
                    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                         {analyzedDocs.map(doc => (
                             <button 
                                key={doc.id}
                                data-testid={`analysis-card-${doc.id}`}
                                onClick={() => setViewingDocId(doc.id)}
                                className="group p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 text-left transition-all duration-300 flex flex-col h-full"
                             >
                                 <div className={`mb-4 p-3 rounded-xl w-fit transition-colors ${doc.analysis?.type === 'POLICY' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                    {doc.analysis?.type === 'POLICY' ? <Scale size={24} /> : <FileText size={24} />}
                                 </div>
                                 <h3 className="font-bold text-slate-800 line-clamp-2 mb-2 group-hover:text-blue-700 transition-colors">{doc.analysis?.title || doc.fileName}</h3>
                                 <p className="text-sm text-slate-500 line-clamp-1 mb-4">
                                     {doc.analysis?.type === 'POLICY' 
                                        ? (doc.analysis as any).source_date 
                                        : (doc.analysis as any).authors?.join(', ')}
                                 </p>
                                 <div className="mt-auto pt-4 border-t border-slate-50 text-xs font-semibold flex items-center gap-1 justify-between">
                                    <span className={doc.analysis?.type === 'POLICY' ? 'text-emerald-600' : 'text-blue-600'}>
                                        {language === 'vi' ? 'Xem chi tiết' : 'View Details'} &rarr;
                                    </span>
                                    {doc.analysis?.type === 'POLICY' && <span className="text-[9px] bg-slate-100 px-1 rounded">POLICY</span>}
                                 </div>
                             </button>
                         ))}
                    </div>
                )}
            </div>
        );
      case 'bibliometric':
        return <div className="max-w-6xl mx-auto"><BibliometricView documents={documents} language={language} /></div>;
      case 'matrix':
        return <div className="max-w-full mx-auto"><SynthesisMatrixView documents={documents} language={language} /></div>;
      case 'export':
        return (
            <div className="animate-fade-in max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-2">{language === 'vi' ? 'Xuất Dữ liệu' : 'Export Data'}</h2>
                </div>
                 <div className="grid md:grid-cols-2 gap-6">
                        <button onClick={handleExportTxt} className="p-10 bg-white border border-slate-200 rounded-2xl hover:shadow-xl transition-all">
                            <h3 className="text-xl font-bold mb-2">TXT Report</h3>
                        </button>
                        <button onClick={handleExportBib} className="p-10 bg-white border border-slate-200 rounded-2xl hover:shadow-xl transition-all">
                            <h3 className="text-xl font-bold mb-2">BibTeX</h3>
                        </button>
                    </div>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 text-slate-900 font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setViewingDocId(null); }} 
        docsCount={documents.length} 
        isMobileOpen={mobileSidebarOpen}
        setIsMobileOpen={setMobileSidebarOpen}
        isDesktopCollapsed={desktopSidebarCollapsed}
        setIsDesktopCollapsed={setDesktopSidebarCollapsed}
      />
      
      <main className={`flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300 ${desktopSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-20 shrink-0 sticky top-0">
             <div className="flex items-center gap-3">
                 <button data-testid="mobile-menu" onClick={() => setMobileSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
                 <h1 className="md:hidden font-bold text-slate-800 text-lg flex items-center gap-2"><Book className="text-blue-600" size={20} /> Insight Scholar</h1>
             </div>
             <div className="flex items-center gap-4 ml-auto flex-wrap justify-end">
                <div className="hidden md:flex flex-col text-right">
                  <label className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide">{language === 'vi' ? 'Model fallback' : 'Fallback model'}</label>
                  <select
                    value={openRouterModel}
                    onChange={(e) => setOpenRouterModelState(e.target.value)}
                    className="bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[220px]"
                  >
                    <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B Instruct</option>
                    <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="gpt-4o-mini">GPT-4o mini</option>
                    <option value="qwen/qwen3-next-80b-a3b-instruct:free">Qwen 3 Next 80B (free, dễ rate limit)</option>
                    <option value={openRouterModel}>{openRouterModel}</option>
                  </select>
                </div>

                <div className="bg-slate-100 rounded-lg p-1 flex items-center">
                    <button onClick={() => setLanguage('en')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>EN</button>
                    <button onClick={() => setLanguage('vi')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${language === 'vi' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>VI</button>
                </div>
             </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
            {renderContent()}
            <div className="h-10"></div>
        </div>
      </main>
    </div>
  );
};

export default App;
