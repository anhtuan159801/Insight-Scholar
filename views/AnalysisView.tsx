import React from 'react';
import { ArrowLeft, AlertTriangle, Calendar, Download, FileText, Scale, ShieldCheck, Users } from 'lucide-react';
import { AnalysisResult, Document, EvidenceItem, Language, LegacyAnalysisResult, PolicyAnalysisResult } from '../types';
import { isAcademicV2, isLegacyAcademic, isPolicyAnalysis } from '../services/analysisNormalizer';
import { evidenceStrengthLabel } from '../services/analysisProjection';
import { exportLiteratureWorkbook } from '../services/excelExport';

interface AnalysisViewProps {
  doc: Document;
  onBack: () => void;
  language?: Language;
}

const labels = {
  vi: {
    back: 'Quay lại danh sách', export: 'Xuất Literature Matrix', noData: 'Chưa có dữ liệu phân tích.',
    evidence: 'Bằng chứng', assessment: 'Nhận định tổng hợp', missingEvidence: 'Không có vị trí bằng chứng khả dụng.',
    legacy: 'Đây là kết quả theo schema cũ. Hãy phân tích lại để có quy trình phản biện 7 bước và literature matrix đầy đủ.',
    keywords: 'Từ khóa', phase1: 'Giai đoạn 1 - Đánh giá tổng thể', phase2: 'Giai đoạn 2 - Chất vấn', phase3: 'Giai đoạn 3 - Phán quyết',
  },
  en: {
    back: 'Back to list', export: 'Export Literature Matrix', noData: 'No analysis data available.',
    evidence: 'Evidence', assessment: 'Overall assessment', missingEvidence: 'No evidence location is available.',
    legacy: 'This result uses the legacy schema. Re-analyze it to obtain the complete seven-step appraisal and literature matrix.',
    keywords: 'Keywords', phase1: 'Phase 1 - Overall assessment', phase2: 'Phase 2 - Questioning', phase3: 'Phase 3 - Verdict',
  },
};

const field = (vi: string, en: string, value: string | string[]) => ({ vi, en, value });

const EvidenceList: React.FC<{ evidence: EvidenceItem[]; language: Language }> = ({ evidence, language }) => {
  const t = labels[language];
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t.evidence}</h4>
      {evidence.length ? (
        <ul className="space-y-2">
          {evidence.map((item, index) => (
            <li key={`${item.claim}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p>{item.claim}</p>
              <p className="mt-1 text-xs font-medium text-blue-600">{item.source}</p>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm italic text-slate-400">{t.missingEvidence}</p>}
    </div>
  );
};

const StepCard: React.FC<{
  number: number;
  title: string;
  assessment: string;
  evidence: EvidenceItem[];
  fields: Array<{ vi: string; en: string; value: string | string[] }>;
  language: Language;
  verdict?: React.ReactNode;
}> = ({ number, title, assessment, evidence, fields, language, verdict }) => {
  const t = labels[language];
  return (
    <article data-testid={`analysis-step-${number}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{number}</span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Step {number}</p>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
      </div>
      <dl className="grid gap-3 md:grid-cols-2">
        {fields.map(item => (
          <div key={item.en} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{item[language]}</dt>
            <dd className="mt-1 whitespace-pre-line text-sm text-slate-700">
              {Array.isArray(item.value) ? (item.value.length ? item.value.join('; ') : '-') : item.value || '-'}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-blue-700">{t.assessment}</h4>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{assessment}</p>
      </div>
      {verdict}
      <EvidenceList evidence={evidence} language={language} />
    </article>
  );
};

const AcademicV2View: React.FC<{ result: AnalysisResult; language: Language }> = ({ result, language }) => {
  const t = labels[language];
  const s1 = result.step1_overview;
  const s2 = result.step2_research_question;
  const s3 = result.step3_knowledge_gap;
  const s4 = result.step4_method_evaluation;
  const s5 = result.step5_independent_conclusion;
  const s6 = result.step6_author_comparison;
  const s7 = result.step7_alternatives_and_confounders;
  return (
    <div className="space-y-8 p-6">
      <section data-testid="analysis-phase-1" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">{t.phase1}</h2>
        <StepCard number={1} title={language === 'vi' ? 'Có cái nhìn tổng quan về nghiên cứu' : 'Build an overview of the study'} assessment={s1.assessment} evidence={s1.evidence} language={language} fields={[
          field('Loại nghiên cứu', 'Study type', s1.study_type), field('Thiết kế nghiên cứu', 'Research design', s1.research_design),
          field('Quốc gia', 'Country', s1.country), field('Địa điểm', 'Location', s1.study_location), field('Bối cảnh', 'Setting', s1.study_setting),
          field('Đối tượng', 'Population', s1.population), field('Phát hiện nổi bật', 'Headline findings', s1.headline_findings),
        ]} />
        <StepCard number={2} title={language === 'vi' ? 'Xác định câu hỏi nghiên cứu cốt lõi' : 'Identify the core research question'} assessment={s2.assessment} evidence={s2.evidence} language={language} fields={[
          field('Câu hỏi nghiên cứu', 'Research question', s2.research_question), field('Giả thuyết', 'Hypothesis', s2.hypothesis), field('Trạng thái', 'Question status', s2.question_status),
        ]} />
        <StepCard number={3} title={language === 'vi' ? 'Xác định khoảng trống tri thức' : 'Identify the knowledge gap'} assessment={s3.assessment} evidence={s3.evidence} language={language} fields={[
          field('Điều đã biết', 'Known knowledge', s3.known_knowledge), field('Điều chưa rõ', 'Unknown knowledge', s3.unknown_knowledge),
          field('Tầm quan trọng', 'Importance', s3.importance), field('Khung lý thuyết', 'Theoretical framework', s3.theoretical_framework),
          field('Khung khái niệm', 'Conceptual framework', s3.conceptual_framework),
        ]} />
      </section>

      <section data-testid="analysis-phase-2" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">{t.phase2}</h2>
        <StepCard number={4} title={language === 'vi' ? 'Đánh giá phương pháp nghiên cứu' : 'Evaluate the research methods'} assessment={s4.assessment} evidence={s4.evidence} language={language} fields={[
          field('Cỡ mẫu', 'Sample size', s4.sample_size), field('Đặc điểm mẫu', 'Sample characteristics', s4.sample_characteristics),
          field('Cách chọn mẫu', 'Sampling method', s4.sampling_method), field('Can thiệp', 'Intervention', s4.intervention), field('Phơi nhiễm', 'Exposure', s4.exposure),
          field('Nhóm so sánh', 'Comparator', s4.comparator), field('Biến độc lập', 'Independent variables', s4.independent_variables), field('Biến phụ thuộc', 'Dependent variables', s4.dependent_variables),
          field('Biến trung gian', 'Mediators', s4.mediators), field('Biến điều tiết', 'Moderators', s4.moderators), field('Thu thập dữ liệu', 'Data collection', s4.data_collection),
          field('Phân tích dữ liệu', 'Data analysis', s4.data_analysis_method), field('Kỹ thuật thống kê', 'Statistical techniques', s4.statistical_techniques),
          field('Thiết kế phù hợp câu hỏi', 'Design fit', s4.design_fit), field('Đánh giá cỡ mẫu', 'Sample size appraisal', s4.sample_size_appraisal),
          field('Độ mạnh thống kê', 'Statistical power', s4.statistical_power_appraisal), field('Nhóm đối chứng', 'Control group', s4.control_group_appraisal),
          field('Thiên lệch chọn mẫu', 'Selection bias', s4.selection_bias), field('Thiên lệch đo lường', 'Measurement bias', s4.measurement_bias), field('Thiên lệch khác', 'Other bias', s4.other_bias),
          field('Dữ liệu thô', 'Raw data', s4.raw_data_availability), field('Mã phân tích', 'Analysis code', s4.analysis_code_availability), field('Khả năng tái lập', 'Reproducibility', s4.reproducibility_appraisal),
        ]} />
        <StepCard number={5} title={language === 'vi' ? 'Tự rút ra kết luận từ dữ liệu' : 'Draw an independent conclusion from the data'} assessment={s5.assessment} evidence={s5.evidence} language={language} fields={[
          field('Kết quả chính', 'Key findings', s5.key_findings), field('Kích thước hiệu ứng', 'Effect size', s5.effect_size),
          field('Khoảng tin cậy', 'Confidence interval', s5.confidence_interval), field('Giá trị p', 'P-value', s5.p_value),
          field('Độ bất định khác', 'Other uncertainty', s5.other_uncertainty), field('Ý nghĩa thực tiễn', 'Practical significance', s5.practical_significance),
          field('Kết luận độc lập', 'Independent conclusion', s5.independent_conclusion),
        ]} />
      </section>

      <section data-testid="analysis-phase-3" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">{t.phase3}</h2>
        <StepCard number={6} title={language === 'vi' ? 'So sánh với kết luận của tác giả' : 'Compare with the author conclusion'} assessment={s6.assessment} evidence={s6.evidence} language={language} fields={[
          field('Kết luận của tác giả', 'Author conclusion', s6.author_conclusion), field('Điểm đồng thuận', 'Agreement', s6.agreement),
          field('Điểm khác biệt', 'Disagreement', s6.disagreement), field('Cường điệu hóa', 'Overclaiming', s6.overclaiming),
          field('Khái quát vượt mẫu', 'Generalization beyond sample', s6.generalization_beyond_sample), field('Suy diễn nhân quả', 'Causal overreach', s6.causal_overreach),
        ]} />
        <StepCard number={7} title={language === 'vi' ? 'Giải thích thay thế và yếu tố gây nhiễu' : 'Consider alternatives and confounders'} assessment={s7.assessment} evidence={s7.evidence} language={language} fields={[
          field('Điểm mạnh', 'Strengths', s7.strengths), field('Hạn chế', 'Limitations', s7.limitations), field('Yếu tố gây nhiễu', 'Confounders', s7.confounders),
          field('Giải thích thay thế', 'Alternative explanations', s7.alternative_explanations), field('Nguồn tài trợ', 'Funding source', s7.funding_source),
          field('Xung đột lợi ích', 'Conflicts of interest', s7.conflicts_of_interest),
        ]} verdict={
          <div className="mt-4 rounded-xl bg-slate-900 p-5 text-slate-100">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <ShieldCheck size={20} />
              <span className="font-bold">{language === 'vi' ? 'Phán quyết cuối' : 'Final verdict'}</span>
              <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold">{evidenceStrengthLabel(s7.evidence_strength, language)}</span>
            </div>
            <p>{s7.final_verdict}</p>
            <p className="mt-2 text-sm text-slate-300">{s7.evidence_strength_rationale}</p>
          </div>
        } />
      </section>

      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
        <h2 className="mb-4 text-lg font-bold text-indigo-900">Literature Matrix Synthesis</h2>
        <dl className="grid gap-4 md:grid-cols-2">
          {[
            field('Đóng góp cho lĩnh vực', 'Contribution to field', result.synthesis.contribution_to_field),
            field('Hàm ý lý thuyết', 'Theoretical implications', result.synthesis.theoretical_implications),
            field('Hàm ý thực tiễn', 'Practical implications', result.synthesis.practical_implications),
            field('Nghiên cứu tương lai', 'Future research', result.synthesis.future_research),
            field('Từ khóa', 'Keywords', result.synthesis.keywords), field('Chủ đề', 'Themes', result.synthesis.themes),
          ].map(item => <div key={item.en}><dt className="text-xs font-bold uppercase text-indigo-700">{item[language]}</dt><dd className="mt-1 text-sm text-slate-700">{Array.isArray(item.value) ? item.value.join('; ') : item.value}</dd></div>)}
        </dl>
      </section>
    </div>
  );
};

const LegacyView: React.FC<{ result: LegacyAnalysisResult; language: Language }> = ({ result, language }) => (
  <div className="space-y-5 p-6">
    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"><AlertTriangle className="shrink-0" size={20} /><p>{labels[language].legacy}</p></div>
    {[
      ['Thesis & Background', result.thesis_background], ['Theoretical Framework', result.theoretical_framework], ['Conceptual Framework', result.conceptual_framework],
      ['Methodology', result.methodology], ['Results', result.results_interpretation], ['Limitations', result.scope_limitations], ['Conclusion', result.overall_conclusion],
    ].map(([title, content]) => <section key={title} className="border-b border-slate-100 pb-4"><h3 className="font-bold text-blue-700">{title}</h3><p className="mt-2 whitespace-pre-line text-slate-700">{content}</p></section>)}
  </div>
);

const PolicyView: React.FC<{ result: PolicyAnalysisResult; language: Language }> = ({ result, language }) => (
  <div className="grid gap-7 p-6">
    <div className="grid gap-5 border-b border-slate-100 pb-5 md:grid-cols-2">
      <div><h3 className="flex items-center gap-1 text-xs font-bold uppercase text-emerald-700"><Calendar size={14} /> {language === 'vi' ? 'Nguồn và ngày' : 'Source and date'}</h3><p className="mt-2">{result.source_date}</p></div>
      <div><h3 className="flex items-center gap-1 text-xs font-bold uppercase text-emerald-700"><FileText size={14} /> {language === 'vi' ? 'Loại văn bản' : 'Document type'}</h3><p className="mt-2">{result.document_category}</p></div>
    </div>
    <section><h3 className="font-bold text-emerald-700">{language === 'vi' ? 'Chủ đề chính' : 'Main subject'}</h3><p className="mt-2 whitespace-pre-line">{result.main_subject}</p></section>
    <section><h3 className="flex items-center gap-2 font-bold text-emerald-700"><Scale size={18} /> {language === 'vi' ? 'Cơ sở pháp lý' : 'Legal basis'}</h3><p className="mt-2 whitespace-pre-line">{result.legal_basis}</p></section>
    <section><h3 className="flex items-center gap-2 font-bold text-emerald-700"><Users size={18} /> {language === 'vi' ? 'Các bên liên quan' : 'Stakeholders'}</h3><div className="mt-2 flex flex-wrap gap-2">{(result.key_stakeholders || []).map(item => <span key={item} className="rounded-full border px-3 py-1 text-sm">{item}</span>)}</div></section>
    <section><h3 className="font-bold text-emerald-700">{language === 'vi' ? 'Nội dung chính' : 'Key points'}</h3><ul className="mt-2 list-disc space-y-1 pl-5">{(result.key_points || []).map(item => <li key={item}>{item}</li>)}</ul></section>
    <div className="grid gap-5 md:grid-cols-2"><section><h3 className="font-bold text-emerald-700">{language === 'vi' ? 'Tác động' : 'Impact'}</h3><p className="mt-2 whitespace-pre-line">{result.implications_impact}</p></section><section><h3 className="font-bold text-emerald-700">{language === 'vi' ? 'Tranh luận' : 'Controversies'}</h3><p className="mt-2 whitespace-pre-line">{result.controversies_criticism}</p></section></div>
    <section className="rounded-lg bg-emerald-900 p-5 text-white"><h3 className="font-bold">{language === 'vi' ? 'Kết luận' : 'Conclusion'}</h3><p className="mt-2">{result.conclusion_summary}</p></section>
  </div>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({ doc, onBack, language: requestedLanguage }) => {
  const language: Language = requestedLanguage || 'vi';
  const result = doc.analysis;
  const t = labels[language];
  if (!result) return <div className="p-8 text-center">{t.noData}</div>;
  const academic = isAcademicV2(result) || isLegacyAcademic(result);
  const exportExcel = () => exportLiteratureWorkbook([doc], language, `${doc.fileName}_literature_matrix.xlsx`);
  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800"><ArrowLeft size={20} /> {t.back}</button>
        {isAcademicV2(result) && <button data-testid="export-literature-matrix" onClick={exportExcel} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"><Download size={16} /> {t.export}</button>}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className={`border-b p-6 ${academic ? 'bg-blue-50/60' : 'bg-emerald-50/60'}`}>
          <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase ${academic ? 'border-blue-200 bg-blue-100 text-blue-700' : 'border-emerald-200 bg-emerald-100 text-emerald-700'}`}>{academic ? 'Academic Analysis' : 'Policy Analysis'}</span>
          <h1 className="mt-3 text-2xl font-bold text-slate-800">{result.title}</h1>
          {academic && <><p className="mt-2 italic text-slate-600">{result.authors.join(', ')}</p><p className="mt-3 inline-block rounded border border-blue-100 bg-white p-3 font-mono text-sm text-blue-800">{result.citation_apa}</p></>}
        </header>
        {isAcademicV2(result) ? <AcademicV2View result={result} language={language} /> : isLegacyAcademic(result) ? <LegacyView result={result} language={language} /> : isPolicyAnalysis(result) ? <PolicyView result={result} language={language} /> : null}
        <footer className="p-6 pt-0"><h3 className="mb-2 text-xs font-bold uppercase text-slate-500">{t.keywords}</h3><div className="flex flex-wrap gap-2">{[...(result.keywords?.vi || []), ...(result.keywords?.en || [])].map((keyword, index) => <span key={`${keyword}-${index}`} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{keyword}</span>)}</div></footer>
      </div>
    </div>
  );
};

export default AnalysisView;
