
import React from 'react';
import { Document, PolicyAnalysisResult, AnalysisResult } from '../types';
import { ArrowLeft, Download, Scale, Calendar, Users, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AnalysisViewProps {
  doc: Document;
  onBack: () => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ doc, onBack }) => {
  const result = doc.analysis;

  if (!result) return <div className="p-8 text-center">Chưa có dữ liệu phân tích.</div>;

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet([result]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${doc.fileName}_analysis.xlsx`);
  };

  // Render Logic for ACADEMIC
  const renderAcademic = (res: AnalysisResult) => (
      <div className="p-6 grid grid-cols-1 gap-8">
          <Section title="Luận đề & Bối cảnh" content={res.thesis_background} />
          
          <div className="grid md:grid-cols-2 gap-6">
              <Section title="Khung Lý thuyết" content={res.theoretical_framework} />
              <Section title="Khung Khái niệm" content={res.conceptual_framework} />
          </div>
          
          <div className="border-b border-slate-100 pb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Định nghĩa & Biến số</h3>
            <div className="space-y-3">
              {res.definitions_variables.map((def, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="font-bold text-slate-800">{def.term}</p>
                  <p className="text-slate-600 text-sm mt-1">{def.definition}</p>
                  {def.quote && <p className="text-xs text-slate-400 mt-2 italic">"{def.quote}"</p>}
                </div>
              ))}
              {res.definitions_variables.length === 0 && (
                <p className="text-slate-500 italic">Không tìm thấy định nghĩa cụ thể.</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Phương pháp luận" content={res.methodology} />
            <Section title="Kết quả & Diễn giải" content={res.results_interpretation} />
          </div>

          <Section title="Phạm vi & Hạn chế" content={res.scope_limitations} />
          <Section title="Đóng góp & Hướng đi tương lai" content={res.contributions_future_research} />
          
          <div className="bg-blue-900 text-slate-200 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-2">Kết luận Tổng thể</h3>
            <p>{res.overall_conclusion}</p>
          </div>
      </div>
  );

  // Render Logic for POLICY/NEWS
  const renderPolicy = (res: PolicyAnalysisResult) => (
      <div className="p-6 grid grid-cols-1 gap-8">
          <div className="grid md:grid-cols-2 gap-6 border-b border-slate-100 pb-6">
              <div>
                  <h3 className="text-sm font-bold text-emerald-600 uppercase mb-2 flex items-center gap-1"><Calendar size={14}/> Nguồn & Ngày tháng</h3>
                  <p className="text-slate-800 font-medium">{res.source_date || "Không xác định"}</p>
              </div>
              <div>
                  <h3 className="text-sm font-bold text-emerald-600 uppercase mb-2 flex items-center gap-1"><FileText size={14}/> Loại văn bản</h3>
                  <p className="text-slate-800 font-medium">{res.document_category}</p>
              </div>
          </div>

          <Section title="Chủ đề chính" content={res.main_subject} color="emerald" />

          <div className="border-b border-slate-100 pb-6">
             <h3 className="text-lg font-semibold text-emerald-700 mb-3 flex items-center gap-2"><Scale size={18} /> Cơ sở Pháp lý</h3>
             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-line">
                 {res.legal_basis || "Không đề cập văn bản luật cụ thể."}
             </div>
          </div>

           <div className="border-b border-slate-100 pb-6">
             <h3 className="text-lg font-semibold text-emerald-700 mb-3 flex items-center gap-2"><Users size={18} /> Các bên liên quan (Stakeholders)</h3>
             <div className="flex flex-wrap gap-2">
                 {res.key_stakeholders.map((st, i) => (
                     <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-700 text-sm font-medium shadow-sm">{st}</span>
                 ))}
             </div>
          </div>

          <div className="border-b border-slate-100 pb-6">
              <h3 className="text-lg font-semibold text-emerald-700 mb-3">Nội dung Chính (Tóm tắt)</h3>
              <ul className="space-y-2">
                  {res.key_points.map((point, i) => (
                      <li key={i} className="flex gap-3 text-slate-700">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></span>
                          <span>{point}</span>
                      </li>
                  ))}
              </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Tác động & Hệ quả" content={res.implications_impact} color="emerald" />
            <Section title="Tranh luận & Phản biện" content={res.controversies_criticism} color="emerald" />
          </div>

          <div className="bg-emerald-900 text-slate-200 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-2">Kết luận & Nhận định</h3>
            <p>{res.conclusion_summary}</p>
          </div>
      </div>
  );

  const isAcademic = result.type === 'ACADEMIC' || !result.type; 

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={20} /> Quay lại danh sách
        </button>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm shadow-sm">
            <Download size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className={`p-6 border-b border-slate-100 ${isAcademic ? 'bg-blue-50/50' : 'bg-emerald-50/50'}`}>
          <div className="flex gap-2 mb-2">
               <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${isAcademic ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                   {isAcademic ? 'Academic Analysis' : 'Policy Analysis'}
               </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{result.title}</h2>
          
          {isAcademic && (
             <>
                <p className="text-slate-600 mt-2 italic">{(result as AnalysisResult).authors.join(', ')}</p>
                <div className="mt-3 p-3 bg-white border border-blue-100 rounded text-sm text-blue-800 font-mono inline-block">
                    {(result as AnalysisResult).citation_apa}
                </div>
             </>
          )}
        </div>

        {/* Dynamic Content */}
        {isAcademic ? renderAcademic(result as AnalysisResult) : renderPolicy(result as PolicyAnalysisResult)}

        <div className="p-6 pt-0">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Từ khóa</h3>
            <div className="flex flex-wrap gap-2">
              {result.keywords.vi.map((k, i) => <span key={`vi-${i}`} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{k}</span>)}
              {result.keywords.en.map((k, i) => <span key={`en-${i}`} className={`px-2 py-1 rounded text-xs ${isAcademic ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{k}</span>)}
            </div>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; content: string; color?: 'blue' | 'emerald' }> = ({ title, content, color = 'blue' }) => {
  const displayContent = content && content.trim().length > 0 && content !== "undefined" 
    ? content 
    : "Không tìm thấy thông tin cụ thể trong tài liệu.";
  
  const titleColor = color === 'blue' ? 'text-blue-600' : 'text-emerald-700';

  return (
    <div className="border-b border-slate-100 pb-6 last:border-0">
      <h3 className={`text-lg font-semibold ${titleColor} mb-2`}>{title}</h3>
      <p className="text-slate-700 leading-relaxed whitespace-pre-line">{displayContent}</p>
    </div>
  );
};

export default AnalysisView;
