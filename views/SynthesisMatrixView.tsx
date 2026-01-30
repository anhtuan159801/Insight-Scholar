
import React, { useState } from 'react';
import { Document, SynthesisMatrixColumn, SynthesisRow, Language } from '../types';
import { generateMatrixData } from '../services/geminiService';
import { Plus, Trash2, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface SynthesisMatrixViewProps {
  documents: Document[];
  language: Language;
}

const SynthesisMatrixView: React.FC<SynthesisMatrixViewProps> = ({ documents, language }) => {
  const [columns, setColumns] = useState<SynthesisMatrixColumn[]>([
    { id: 'method', header: language === 'vi' ? 'Phương pháp' : 'Methodology', promptKey: 'methodology' },
    { id: 'sample', header: language === 'vi' ? 'Cỡ mẫu' : 'Sample Size', promptKey: 'sample size' },
    { id: 'findings', header: language === 'vi' ? 'Kết quả chính' : 'Key Findings', promptKey: 'key findings' },
  ]);
  const [newCol, setNewCol] = useState('');
  const [rows, setRows] = useState<SynthesisRow[]>([]);
  const [loading, setLoading] = useState(false);

  const addColumn = () => {
    if (!newCol.trim()) return;
    const id = newCol.toLowerCase().replace(/\s+/g, '_');
    setColumns([...columns, { id, header: newCol, promptKey: newCol }]);
    setNewCol('');
  };

  const removeColumn = (id: string) => {
    setColumns(columns.filter(c => c.id !== id));
  };

  const handleGenerate = async () => {
    const readyDocs = documents.filter(d => d.status === 'SUCCESS');
    if (readyDocs.length === 0) return;
    setLoading(true);
    try {
      const data = await generateMatrixData(documents, columns, language);
      setRows(data);
    } catch (e) {
        alert("Failed to generate matrix");
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SynthesisMatrix");
      XLSX.writeFile(wb, "Synthesis_Matrix.xlsx");
  };

  const readyCount = documents.filter(d => d.status === 'SUCCESS').length;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-slate-800">
                 {language === 'vi' ? 'Ma trận Tổng quan' : 'Synthesis Matrix'} ({readyCount})
             </h2>
             {rows.length > 0 && (
                 <button onClick={exportExcel} className="flex items-center gap-2 text-green-600 hover:bg-green-50 px-3 py-1 rounded text-sm font-medium border border-green-200">
                     <Download size={16} /> {language === 'vi' ? 'Xuất Excel' : 'Export Excel'}
                 </button>
             )}
        </div>
        
        <div className="flex flex-wrap gap-3 mb-6">
          {columns.map(col => (
            <div key={col.id} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-sm text-slate-700">
              <span>{col.header}</span>
              <button onClick={() => removeColumn(col.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 max-w-md mb-6">
          <input
            value={newCol}
            onChange={(e) => setNewCol(e.target.value)}
            placeholder={language === 'vi' ? "Thêm cột (vd: Địa điểm)" : "Add column (e.g., Location)"}
            className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
          <button onClick={addColumn} className="bg-slate-200 text-slate-700 p-2 rounded hover:bg-slate-300"><Plus size={20} /></button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || readyCount === 0}
          className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 flex justify-center gap-2"
        >
          {loading && <Loader2 className="animate-spin" />}
          {language === 'vi' ? 'Tạo Ma trận' : 'Generate Matrix'}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-700 min-w-[200px] sticky left-0 bg-slate-50 border-r">{language === 'vi' ? 'Tên bài báo' : 'Document Title'}</th>
                {columns.map(col => (
                  <th key={col.id} className="p-4 font-semibold text-slate-700 min-w-[200px]">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="p-4 text-sm font-medium text-slate-900 sticky left-0 bg-white border-r">{row.docTitle}</td>
                  {columns.map(col => (
                    <td key={col.id} className="p-4 text-sm text-slate-600 align-top">{row[col.id] || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SynthesisMatrixView;
