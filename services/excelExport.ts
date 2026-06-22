import ExcelJS from 'exceljs';
import { Document, Language } from '../types';
import { isAcademicV2 } from './analysisNormalizer';
import { CORE_MATRIX_COLUMNS, LiteratureMatrixColumn, toCriticalAppraisalRows, toLiteratureMatrixRow } from './analysisProjection';

export interface CustomMatrixColumn {
  id: string;
  header: string;
}

const styleWorksheet = (worksheet: ExcelJS.Worksheet) => {
  worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: worksheet.columnCount } };
  worksheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.alignment = { wrapText: true, vertical: 'middle' };
  });
  worksheet.eachRow(row => row.eachCell(cell => {
    cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'top' };
  }));
};

export const buildLiteratureWorkbook = (
  documents: Document[],
  language: Language,
  customColumns: CustomMatrixColumn[] = [],
  customValues: Record<string, Record<string, string>> = {},
): ExcelJS.Workbook => {
  const academicDocs = documents.filter(doc => isAcademicV2(doc.analysis));
  if (!academicDocs.length) throw new Error('No schema V2 academic analysis is available for export.');

  const columns: Array<Pick<LiteratureMatrixColumn, 'id'> & { header: string }> = [
    ...CORE_MATRIX_COLUMNS.map(column => ({ id: column.id, header: column[language] })),
    ...customColumns,
  ];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Insight Scholar';
  workbook.created = new Date();

  const matrixSheet = workbook.addWorksheet('Literature Matrix');
  matrixSheet.columns = columns.map(column => ({
    key: column.id,
    header: column.header,
    width: column.id === 'title' || column.id === 'citation_apa' ? 42 : 26,
  }));
  academicDocs.forEach(doc => {
    const projected = toLiteratureMatrixRow(doc, language)!;
    matrixSheet.addRow(columns.reduce<Record<string, string>>((row, column) => {
      row[column.id] = projected[column.id] || customValues[doc.id]?.[column.id] || '';
      return row;
    }, {}));
  });
  styleWorksheet(matrixSheet);

  const appraisalSheet = workbook.addWorksheet('Critical Appraisal');
  appraisalSheet.columns = [
    { key: 'studyId', header: language === 'vi' ? 'Mã nghiên cứu' : 'Study ID', width: 18 },
    { key: 'title', header: language === 'vi' ? 'Tên bài báo' : 'Title', width: 42 },
    { key: 'phase', header: language === 'vi' ? 'Giai đoạn' : 'Phase', width: 22 },
    { key: 'step', header: language === 'vi' ? 'Bước' : 'Step', width: 8 },
    { key: 'criterion', header: language === 'vi' ? 'Tiêu chí' : 'Criterion', width: 28 },
    { key: 'assessment', header: language === 'vi' ? 'Nhận định' : 'Assessment', width: 60 },
    { key: 'evidenceClaim', header: language === 'vi' ? 'Bằng chứng' : 'Evidence Claim', width: 60 },
    { key: 'evidenceSource', header: language === 'vi' ? 'Nguồn bằng chứng' : 'Evidence Source', width: 28 },
  ];
  academicDocs.flatMap(doc => toCriticalAppraisalRows(doc, language)).forEach(row => appraisalSheet.addRow(row));
  styleWorksheet(appraisalSheet);

  const metadataSheet = workbook.addWorksheet('Metadata');
  metadataSheet.columns = [
    { key: 'studyId', header: 'Study ID', width: 18 },
    { key: 'sourceFile', header: 'Source File', width: 36 },
    { key: 'generatedAt', header: 'Generated At', width: 26 },
    { key: 'schemaVersion', header: 'Schema Version', width: 16 },
    { key: 'analysisLanguage', header: 'Analysis Language', width: 22 },
    { key: 'extractionLimitations', header: 'Extraction Limitations', width: 70 },
    { key: 'application', header: 'Application', width: 22 },
  ];
  academicDocs.forEach(doc => {
    const analysis = doc.analysis!;
    if (!isAcademicV2(analysis)) return;
    metadataSheet.addRow({
      studyId: doc.id,
      sourceFile: doc.fileName,
      generatedAt: new Date().toISOString(),
      schemaVersion: analysis.schema_version,
      analysisLanguage: analysis.analysis_language,
      extractionLimitations: analysis.extraction_limitations,
      application: 'Insight Scholar',
    });
  });
  styleWorksheet(metadataSheet);
  return workbook;
};

export const exportLiteratureWorkbook = async (
  documents: Document[],
  language: Language,
  filename: string,
  customColumns: CustomMatrixColumn[] = [],
  customValues: Record<string, Record<string, string>> = {},
) => {
  const buffer = await buildLiteratureWorkbook(documents, language, customColumns, customValues).xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
