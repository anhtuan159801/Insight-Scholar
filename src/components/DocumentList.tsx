
import React from 'react';
import { Document, ProcessingStatus, Language, AnalysisType } from '../types';
import { FileText, CheckCircle2, Loader2, AlertCircle, PlayCircle, Zap, Ban, Filter, ArrowUp, XCircle, Eye, GraduationCap, Scale, ToggleLeft, ToggleRight, List } from 'lucide-react';

interface DocumentListProps {
  documents: Document[];
  language: Language;
  researchObjective: string;
  analysisMode: AnalysisType;
  setAnalysisMode: (mode: AnalysisType) => void;
  engineMode: 'auto' | 'ollama';
  setEngineMode: (engine: 'auto' | 'ollama') => void;
  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;
  ollamaModel: string;
  setOllamaModel: (m: string) => void;
  useSmartFilter: boolean; 
  setUseSmartFilter: (enabled: boolean) => void; 
  onAnalyze: (docId: string) => void;
  onSmartAnalyze: (objective: string) => void;
  onDelete: (docId: string) => void;
  onView: (docId: string) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ 
  documents, 
  language, 
  researchObjective, 
  analysisMode,
  setAnalysisMode,
  engineMode,
  setEngineMode,
  ollamaUrl,
  setOllamaUrl,
  ollamaModel,
  setOllamaModel,
  useSmartFilter,
  setUseSmartFilter,
  onAnalyze, 
  onSmartAnalyze, 
  onDelete, 
  onView 
}) => {
  if (documents.length === 0) return null;

  const pendingDocs = documents.filter(d => d.status === ProcessingStatus.PENDING || d.status === ProcessingStatus.ERROR || d.status === ProcessingStatus.SKIPPED);
  const pendingCount = pendingDocs.length;
  const isAnalyzing = documents.some(d => d.status === ProcessingStatus.ANALYZING || d.status === ProcessingStatus.FILTERING);

  const handleSmartClick = () => {
    // If filter is OFF, we allow running even if objective is empty (fallback to bulk analyze)
    if(useSmartFilter && !researchObjective.trim()) return;
    onSmartAnalyze(researchObjective || "Bulk Analysis");
  };

  const getStatusBadge = (status: ProcessingStatus) => {
      const styles = {
          [ProcessingStatus.PARSING]: "bg-slate-100 text-slate-600",
          [ProcessingStatus.PENDING]: "bg-slate-100 text-slate-600",
          [ProcessingStatus.FILTERING]: "bg-blue-100 text-blue-700 border-blue-200",
          [ProcessingStatus.ANALYZING]: "bg-sky-100 text-sky-700 border-sky-200",
          [ProcessingStatus.SUCCESS]: "bg-emerald-100 text-emerald-700 border-emerald-200",
          [ProcessingStatus.ERROR]: "bg-red-100 text-red-700 border-red-200",
          [ProcessingStatus.SKIPPED]: "bg-slate-100 text-slate-500 border-slate-200",
      };
      
      const labels = {
          [ProcessingStatus.PARSING]: "Parsing",
          [ProcessingStatus.PENDING]: "Ready",
          [ProcessingStatus.FILTERING]: "Filtering...",
          [ProcessingStatus.ANALYZING]: "Analyzing...",
          [ProcessingStatus.SUCCESS]: "Completed",
          [ProcessingStatus.ERROR]: "Error",
          [ProcessingStatus.SKIPPED]: "Skipped",
      };

      return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide border ${styles[status]}`}>
              {labels[status]}
          </span>
      );
  };

  return (
    <div className="mt-10 animate-fade-in">
      {/* Smart Filter & Analysis Mode Action Bar */}
      <div className={`rounded-2xl p-6 mb-8 text-white shadow-xl border border-slate-700/50 flex flex-col xl:flex-row items-center gap-6 justify-between transition-colors duration-300 ${useSmartFilter ? 'bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900' : 'bg-slate-800'}`}>
         
         <div className="flex-1 w-full">
             <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className={`p-1.5 rounded-lg ${useSmartFilter ? 'bg-blue-500/20' : 'bg-slate-600'}`}>
                    <Filter className={useSmartFilter ? "text-blue-300" : "text-slate-400"} size={20} />
                </div>
                <h3 className="font-bold text-lg">{language === 'vi' ? 'Sàng lọc thông minh' : 'Smart Relevance Filter'}</h3>

                {/* Filter Toggle Switch */}
                <button
                    onClick={() => setUseSmartFilter(!useSmartFilter)}
                    className={`ml-2 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all border ${useSmartFilter ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                >
                    {useSmartFilter ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {useSmartFilter ? (language === 'vi' ? 'ĐANG BẬT' : 'ENABLED') : (language === 'vi' ? 'ĐANG TẮT' : 'DISABLED')}
                </button>
                
                {/* Mode Toggler */}
                <div className="ml-auto flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                    <button
                        onClick={() => setAnalysisMode('ACADEMIC')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${analysisMode === 'ACADEMIC' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <GraduationCap size={14} />
                        {language === 'vi' ? 'Nghiên cứu' : 'Academic'}
                    </button>
                    <button
                        onClick={() => setAnalysisMode('POLICY')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${analysisMode === 'POLICY' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Scale size={14} />
                        {language === 'vi' ? 'Chính sách' : 'Policy'}
                    </button>
                </div>
                {/* Engine Selector */}
                <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                    <button
                        onClick={() => setEngineMode('auto')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${engineMode === 'auto' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                    >
                        {language === 'vi' ? 'Tự động (Gemini/OpenRouter)' : 'Auto (Gemini/OpenRouter)'}
                    </button>
                    <button
                        onClick={() => setEngineMode('ollama')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${engineMode === 'ollama' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                    >
                        Ollama
                    </button>
                </div>

                {engineMode === 'ollama' && (
                  <div className="w-full mt-4 bg-slate-900/50 border border-slate-800 rounded-lg p-3 grid gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-1">
                          <label className="text-[11px] uppercase font-semibold text-slate-300">Ollama Base URL</label>
                          <input
                            value={ollamaUrl}
                            onChange={(e) => setOllamaUrl(e.target.value)}
                            placeholder="https://<your-ngrok>.ngrok-free.app"
                            className="w-full px-3 py-2 rounded-md bg-slate-900/80 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Chỉ cần base URL, hệ thống tự thêm /api/chat nếu thiếu.</p>
                      </div>
                      <div className="flex flex-col gap-1">
                          <label className="text-[11px] uppercase font-semibold text-slate-300">Ollama Model</label>
                          <input
                            value={ollamaModel}
                            onChange={(e) => setOllamaModel(e.target.value)}
                            placeholder="llama3.2"
                            className="w-full px-3 py-2 rounded-md bg-slate-900/80 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Nhập tên model bạn chạy trên Ollama server.</p>
                      </div>
                  </div>
                )}
             </div>
             
             {useSmartFilter ? (
                 researchObjective ? (
                    <div className="bg-white/10 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
                        <p className="text-blue-200 text-xs uppercase font-semibold mb-1 tracking-wider">{language === 'vi' ? 'Đang sử dụng mục tiêu:' : 'Using Objective:'}</p>
                        <p className="font-medium text-white italic truncate text-sm">"{researchObjective}"</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-amber-300 bg-amber-900/20 p-3 rounded-lg border border-amber-900/30">
                        <ArrowUp size={18} />
                        <p className="text-sm font-medium">
                            {language === 'vi' ? 'Vui lòng nhập mục tiêu nghiên cứu ở trên để kích hoạt AI.' : 'Enter a research objective above to activate AI filtering.'}
                        </p>
                    </div>
                )
             ) : (
                <div className="text-slate-400 text-sm flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 italic">
                    <List size={16} />
                    {language === 'vi' ? 'Chế độ lọc đã tắt. Hệ thống sẽ phân tích toàn bộ tài liệu chờ.' : 'Filtering disabled. System will analyze all pending documents.'}
                </div>
             )}
             
             {engineMode === 'ollama' && (
              <div className="mt-3 text-xs text-amber-200 bg-amber-900/30 border border-amber-800/50 rounded-lg p-3 flex gap-2">
                <AlertCircle size={16} />
                <span>Nhập URL cơ sở (ví dụ: https://xxx.ngrok-free.app) và model Ollama để dùng proxy riêng. Hệ thống sẽ tự thêm đuôi /api/chat nếu thiếu.</span>
              </div>
             )}
         </div>

         <button
            onClick={handleSmartClick}
            disabled={pendingCount === 0 || isAnalyzing || (useSmartFilter && !researchObjective)}
            className={`w-full xl:w-auto pl-5 pr-6 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 shadow-lg transition-all hover:-translate-y-0.5 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white
                ${analysisMode === 'ACADEMIC' 
                    ? (useSmartFilter ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/30') 
                    : (useSmartFilter ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30' : 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/30')
                }
            `}
         >
            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
            <div className="text-left">
                <div className="text-sm font-bold leading-tight">
                    {useSmartFilter 
                        ? (language === 'vi' ? 'Lọc & Phân tích' : 'Filter & Analyze')
                        : (language === 'vi' ? 'Phân tích Tất cả' : 'Analyze All')
                    }
                </div>
                <div className="text-[10px] opacity-80 font-normal">{pendingCount} {language === 'vi' ? 'tài liệu chờ' : 'docs pending'}</div>
            </div>
         </button>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {language === 'vi' ? 'Danh sách tài liệu' : 'Document List'} 
            <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{documents.length}</span>
        </h3>
      </div>
      
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((doc) => (
          <div 
            key={doc.id} 
            className={`
                group bg-white p-5 rounded-xl border transition-all duration-200 flex flex-col h-full
                ${doc.status === ProcessingStatus.SKIPPED ? 'border-slate-100 opacity-70 hover:opacity-100 bg-slate-50/50' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200'}
            `}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-2.5 rounded-lg shrink-0 ${doc.status === ProcessingStatus.SKIPPED ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                    <FileText size={22} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate text-sm leading-tight mb-0.5" title={doc.fileName}>{doc.fileName}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{doc.fileType.split('/').pop()?.toUpperCase().replace('VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDPROCESSINGML.DOCUMENT', 'DOCX')}</p>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                  {getStatusBadge(doc.status)}
                  {doc.analysisType && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${doc.analysisType === 'ACADEMIC' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          {doc.analysisType}
                      </span>
                  )}
              </div>
            </div>

            {/* Content / Status Messages */}
            <div className="flex-1 mb-4">
                {doc.status === ProcessingStatus.FILTERING && (
                    <div className="text-xs text-blue-700 bg-blue-50 p-3 rounded-lg flex items-center gap-2 border border-blue-100">
                        <Loader2 size={14} className="animate-spin" /> 
                        {language === 'vi' ? 'AI đang đọc và đánh giá...' : 'AI is reading & evaluating...'}
                    </div>
                )}

                {doc.relevanceReason && doc.status === ProcessingStatus.SKIPPED && (
                    <div className="text-xs text-slate-600 bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold mb-1">
                            <Ban size={12} className="text-slate-500"/>
                            {language === 'vi' ? 'Bỏ qua:' : 'Skipped:'}
                        </div>
                        <p className="italic leading-relaxed opacity-80">{doc.relevanceReason}</p>
                    </div>
                )}

                {doc.relevanceReason && doc.status === ProcessingStatus.SUCCESS && (
                     <div className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                         <div className="flex items-center gap-1.5 font-bold mb-1">
                            <CheckCircle2 size={12} className="text-emerald-600"/>
                            {language === 'vi' ? 'Phù hợp:' : 'Relevant:'}
                        </div>
                        <p className="italic leading-relaxed opacity-80">{doc.relevanceReason}</p>
                    </div>
                )}

                {doc.errorMessage && (
                    <div className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-100 flex gap-2 items-start">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{doc.errorMessage}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-slate-100 mt-auto">
              {(doc.status === ProcessingStatus.PENDING || doc.status === ProcessingStatus.ERROR || doc.status === ProcessingStatus.SKIPPED) && (
                <button
                  onClick={() => onAnalyze(doc.id)}
                  disabled={doc.status === ProcessingStatus.FILTERING}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-white border border-slate-300 text-slate-700 py-3 rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                >
                  <PlayCircle size={14} /> 
                  {doc.status === ProcessingStatus.SKIPPED 
                    ? (language === 'vi' ? 'Phân tích' : 'Force Analyze') 
                    : (language === 'vi' ? 'Phân tích' : 'Analyze')
                  }
                </button>
              )}
              
              {doc.status === ProcessingStatus.ANALYZING && (
                <div className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-blue-50 text-blue-600 py-2.5 rounded-lg cursor-not-allowed border border-blue-100">
                   <Loader2 size={14} className="animate-spin" />
                   {language === 'vi' ? 'Đang xử lý...' : 'Processing...'}
                </div>
              )}
              
              {doc.status === ProcessingStatus.SUCCESS && (
                <button
                    onClick={() => onView(doc.id)}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
                >
                    <Eye size={14} />
                    {language === 'vi' ? 'Xem Báo cáo' : 'View Report'}
                </button>
              )}

              <button
                onClick={() => onDelete(doc.id)}
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-lg transition-colors"
                disabled={doc.status === ProcessingStatus.ANALYZING || doc.status === ProcessingStatus.FILTERING}
                title={language === 'vi' ? 'Xóa tài liệu' : 'Delete document'}
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentList;
