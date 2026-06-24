import React, { useMemo, useState } from 'react';
import { Download, Loader2, Plus, Trash2 } from 'lucide-react';
import { Document, Language, SynthesisMatrixColumn } from '../types';
import { generateMatrixData } from '../services/llmService';
import {
  CORE_MATRIX_COLUMNS,
  MATRIX_GROUP_LABELS,
  LiteratureMatrixRow,
  MatrixGroup,
  toLiteratureMatrixRow,
} from '../services/analysisProjection';
import { exportLiteratureWorkbook } from '../services/excelExport';
import { isAcademicV2 } from '../services/analysisNormalizer';

interface SynthesisMatrixViewProps {
  documents: Document[];
  language: Language;
}

interface CustomColumn extends SynthesisMatrixColumn {
  core: false;
}

const ALL_GROUPS = Object.keys(MATRIX_GROUP_LABELS) as MatrixGroup[];

const SynthesisMatrixView: React.FC<SynthesisMatrixViewProps> = ({ documents, language }) => {
  const [visibleGroups, setVisibleGroups] = useState<Set<MatrixGroup>>(new Set(['IDENTIFICATION', 'SCOPE']));
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, Record<string, string>>>({});
  const [newColumn, setNewColumn] = useState('');
  const [loading, setLoading] = useState(false);

  const academicDocs = useMemo(() => documents.filter(doc => doc.status === 'SUCCESS' && isAcademicV2(doc.analysis)), [documents]);
  const rows = useMemo(() => academicDocs.map(doc => toLiteratureMatrixRow(doc, language)).filter((row): row is LiteratureMatrixRow => Boolean(row)), [academicDocs, language]);
  const visibleCoreColumns = CORE_MATRIX_COLUMNS.filter(column => visibleGroups.has(column.group));
  const visibleColumns = [
    ...visibleCoreColumns.map(column => ({ id: column.id, header: column[language], core: true as const })),
    ...customColumns.map(column => ({ id: column.id, header: column.header, core: false as const })),
  ];

  const toggleGroup = (group: MatrixGroup) => {
    setVisibleGroups(current => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  };

  const addColumn = () => {
    const header = newColumn.trim();
    if (!header) return;
    const base = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'custom';
    let id = `custom_${base}`;
    let suffix = 2;
    while (customColumns.some(column => column.id === id)) id = `custom_${base}_${suffix++}`;
    setCustomColumns(columns => [...columns, { id, header, promptKey: header, core: false }]);
    setNewColumn('');
  };

  const removeCustomColumn = (id: string) => {
    setCustomColumns(columns => columns.filter(column => column.id !== id));
    setCustomValues(values => Object.fromEntries(Object.entries(values).map(([docId, row]) => {
      const next = { ...(row as Record<string, string>) };
      delete next[id];
      return [docId, next];
    })));
  };

  const generateCustomValues = async () => {
    if (!customColumns.length || !academicDocs.length) return;
    setLoading(true);
    try {
      const generated = await generateMatrixData(academicDocs, customColumns, language);
      setCustomValues(current => {
        const next = { ...current };
        generated.forEach(row => {
          next[row.docId] = { ...(next[row.docId] || {}) };
          customColumns.forEach(column => { next[row.docId][column.id] = row[column.id] || ''; });
        });
        return next;
      });
    } catch (error) {
      console.error('Custom matrix generation failed', error);
      alert(language === 'vi' ? 'Không thể tạo dữ liệu cho cột tùy chỉnh. Các cột chuẩn vẫn được giữ nguyên.' : 'Could not generate custom-column data. Core columns were preserved.');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => exportLiteratureWorkbook(
    academicDocs,
    language,
    'Insight_Scholar_Literature_Matrix.xlsx',
    customColumns.map(({ id, header }) => ({ id, header })),
    customValues,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{language === 'vi' ? 'Literature Matrix chuẩn hóa' : 'Standardized Literature Matrix'}</h2>
            <p className="mt-1 text-sm text-slate-500">{language === 'vi' ? `${academicDocs.length} bài báo sử dụng quy trình phản biện 7 bước.` : `${academicDocs.length} papers use the seven-step appraisal workflow.`}</p>
          </div>
          <button data-testid="export-matrix" onClick={exportExcel} disabled={!academicDocs.length} className="flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"><Download size={16} /> {language === 'vi' ? 'Xuất Excel' : 'Export Excel'}</button>
        </div>

        <div className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{language === 'vi' ? 'Nhóm cột chuẩn' : 'Core column groups'}</p>
          <div className="flex flex-wrap gap-2">
            {ALL_GROUPS.map(group => <button data-testid={`matrix-group-${group}`} key={group} onClick={() => toggleGroup(group)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${visibleGroups.has(group) ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{MATRIX_GROUP_LABELS[group][language]} ({CORE_MATRIX_COLUMNS.filter(column => column.group === group).length})</button>)}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{language === 'vi' ? 'Cột chuyên ngành tùy chỉnh' : 'Custom domain columns'}</p>
          <div className="mb-3 flex max-w-xl gap-2">
            <input data-testid="custom-column-input" value={newColumn} onChange={event => setNewColumn(event.target.value)} onKeyDown={event => event.key === 'Enter' && addColumn()} placeholder={language === 'vi' ? 'Ví dụ: Thang đo sử dụng' : 'Example: Measurement scale'} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            <button data-testid="add-custom-column" onClick={addColumn} className="rounded-lg bg-slate-200 p-2 text-slate-700 hover:bg-slate-300"><Plus size={20} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {customColumns.map(column => <span key={column.id} className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-900">{column.header}<button aria-label={`Remove ${column.header}`} onClick={() => removeCustomColumn(column.id)} className="text-amber-500 hover:text-red-600"><Trash2 size={14} /></button></span>)}
          </div>
          {customColumns.length > 0 && <button onClick={generateCustomValues} disabled={loading || !academicDocs.length} className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{loading && <Loader2 size={16} className="animate-spin" />}{language === 'vi' ? 'Tạo dữ liệu cột tùy chỉnh bằng AI' : 'Generate custom fields with AI'}</button>}
        </div>
      </section>

      {!academicDocs.length ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-500">{language === 'vi' ? 'Chưa có bài báo nào được phân tích bằng schema 7 bước. Hãy phân tích hoặc phân tích lại một bài báo học thuật.' : 'No paper has been analyzed with the seven-step schema yet. Analyze or re-analyze an academic paper.'}</div>
      ) : (
        <div className="max-h-[68vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20 bg-slate-100">
              <tr>{visibleColumns.map(column => <th key={column.id} className={`min-w-[220px] border-b border-r border-slate-200 p-3 font-bold text-slate-700 ${column.id === 'title' ? 'sticky left-0 z-30 bg-slate-100' : ''}`}>{column.header}{column.core && <span className="ml-2 text-[9px] uppercase text-blue-500">core</span>}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(row => <tr key={row.docId} className="border-b border-slate-100 align-top hover:bg-slate-50">{visibleColumns.map(column => <td key={column.id} className={`max-w-sm whitespace-pre-line border-r border-slate-100 p-3 text-slate-600 ${column.id === 'title' ? 'sticky left-0 z-10 bg-white font-semibold text-slate-900' : ''}`}>{row[column.id] || customValues[row.docId]?.[column.id] || '-'}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SynthesisMatrixView;
