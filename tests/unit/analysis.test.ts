import { describe, expect, it } from 'vitest';
import { normalizeAcademicAnalysis } from '../../services/analysisNormalizer';
import { CORE_MATRIX_COLUMNS, toCriticalAppraisalRows, toLiteratureMatrixRow } from '../../services/analysisProjection';
import { buildLiteratureWorkbook } from '../../services/excelExport';
import { createE2EDocument } from '../../services/e2eFixture';

describe('academic analysis V2 contract', () => {
  it('normalizes partial provider output without undefined fields', () => {
    const result = normalizeAcademicAnalysis({
      title: 'Partial result',
      step1_overview: { assessment: 'Overview', evidence: ['Abstract evidence'] },
    }, 'en');

    expect(result.schema_version).toBe(2);
    expect(result.step1_overview.evidence[0]).toEqual({ claim: 'Abstract evidence', source: 'Not reported in the document.' });
    expect(result.step4_method_evaluation.sample_size).toBe('Not reported in the document.');
    expect(result.step7_alternatives_and_confounders.evidence_strength).toBe('NOT_ENOUGH_INFORMATION');
  });

  it('rejects a non-object response', () => {
    expect(() => normalizeAcademicAnalysis('invalid', 'en')).toThrow(/not a JSON object/i);
  });

  it('projects every core matrix column to a scalar string', () => {
    const document = createE2EDocument();
    const row = toLiteratureMatrixRow(document, 'en');
    expect(row).not.toBeNull();
    for (const column of CORE_MATRIX_COLUMNS) {
      expect(row).toHaveProperty(column.id);
      expect(typeof row![column.id]).toBe('string');
      expect(row![column.id]).not.toContain('[object Object]');
      expect(row![column.id]).not.toBe('undefined');
    }
  });

  it('preserves evidence claims and sources in critical-appraisal rows', () => {
    const rows = toCriticalAppraisalRows(createE2EDocument(), 'en');
    expect(new Set(rows.map(row => row.step))).toEqual(new Set(['1', '2', '3', '4', '5', '6', '7']));
    expect(rows.find(row => row.step === '5')).toMatchObject({ evidenceSource: 'Table 2' });
  });

  it('builds and serializes the required three-sheet workbook', async () => {
    const workbook = buildLiteratureWorkbook([createE2EDocument()], 'en');
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Literature Matrix', 'Critical Appraisal', 'Metadata']);
    expect(workbook.getWorksheet('Literature Matrix')?.rowCount).toBe(2);
    expect(workbook.getWorksheet('Literature Matrix')?.getRow(1).getCell(1).alignment.wrapText).toBe(true);
    expect((await workbook.xlsx.writeBuffer()).byteLength).toBeGreaterThan(1_000);
  });
});
