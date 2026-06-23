import {
  AnalysisResult,
  Document,
  EvidenceBasedAssessment,
  EvidenceStrength,
  Language,
  LegacyAnalysisResult,
} from '../types';
import { isAcademicV2, isLegacyAcademic } from './analysisNormalizer';

export type MatrixGroup = 'IDENTIFICATION' | 'SCOPE' | 'METHODS' | 'APPRAISAL' | 'SYNTHESIS';

export interface LiteratureMatrixColumn {
  id: string;
  group: MatrixGroup;
  vi: string;
  en: string;
}

export type LiteratureMatrixRow = Record<string, string> & { docId: string; docTitle: string };

export interface CriticalAppraisalRow {
  studyId: string;
  title: string;
  phase: string;
  step: string;
  criterion: string;
  assessment: string;
  evidenceClaim: string;
  evidenceSource: string;
}

export const CORE_MATRIX_COLUMNS: LiteratureMatrixColumn[] = [
  { id: 'title', group: 'IDENTIFICATION', vi: 'Tên bài báo', en: 'Title' },
  { id: 'source_file', group: 'IDENTIFICATION', vi: 'Tệp nguồn', en: 'Source File' },
  { id: 'authors', group: 'IDENTIFICATION', vi: 'Tác giả', en: 'Authors' },
  { id: 'publication_year', group: 'IDENTIFICATION', vi: 'Năm xuất bản', en: 'Publication Year' },
  { id: 'citation_apa', group: 'IDENTIFICATION', vi: 'Trích dẫn APA', en: 'APA Citation' },
  { id: 'doi', group: 'IDENTIFICATION', vi: 'DOI', en: 'DOI' },
  { id: 'study_type', group: 'SCOPE', vi: 'Loại nghiên cứu', en: 'Study Type' },
  { id: 'research_design', group: 'SCOPE', vi: 'Thiết kế nghiên cứu', en: 'Research Design' },
  { id: 'country', group: 'SCOPE', vi: 'Quốc gia', en: 'Country' },
  { id: 'study_location', group: 'SCOPE', vi: 'Địa điểm nghiên cứu', en: 'Study Location' },
  { id: 'study_setting', group: 'SCOPE', vi: 'Bối cảnh nghiên cứu', en: 'Study Setting' },
  { id: 'population', group: 'SCOPE', vi: 'Đối tượng nghiên cứu', en: 'Population' },
  { id: 'research_question', group: 'SCOPE', vi: 'Câu hỏi nghiên cứu', en: 'Research Question' },
  { id: 'hypothesis', group: 'SCOPE', vi: 'Giả thuyết', en: 'Hypothesis' },
  { id: 'question_status', group: 'SCOPE', vi: 'Trạng thái câu hỏi', en: 'Question Status' },
  { id: 'known_knowledge', group: 'SCOPE', vi: 'Tri thức đã biết', en: 'Known Knowledge' },
  { id: 'knowledge_gap', group: 'SCOPE', vi: 'Khoảng trống tri thức', en: 'Knowledge Gap' },
  { id: 'importance', group: 'SCOPE', vi: 'Tầm quan trọng', en: 'Importance' },
  { id: 'theoretical_framework', group: 'SCOPE', vi: 'Khung lý thuyết', en: 'Theoretical Framework' },
  { id: 'conceptual_framework', group: 'SCOPE', vi: 'Khung khái niệm', en: 'Conceptual Framework' },
  { id: 'sample_size', group: 'METHODS', vi: 'Cỡ mẫu', en: 'Sample Size' },
  { id: 'sample_characteristics', group: 'METHODS', vi: 'Đặc điểm mẫu', en: 'Sample Characteristics' },
  { id: 'sampling_method', group: 'METHODS', vi: 'Phương pháp chọn mẫu', en: 'Sampling Method' },
  { id: 'intervention', group: 'METHODS', vi: 'Can thiệp', en: 'Intervention' },
  { id: 'exposure', group: 'METHODS', vi: 'Phơi nhiễm', en: 'Exposure' },
  { id: 'comparator', group: 'METHODS', vi: 'Nhóm so sánh', en: 'Comparator' },
  { id: 'independent_variables', group: 'METHODS', vi: 'Biến độc lập', en: 'Independent Variables' },
  { id: 'dependent_variables', group: 'METHODS', vi: 'Biến phụ thuộc', en: 'Dependent Variables' },
  { id: 'mediators', group: 'METHODS', vi: 'Biến trung gian', en: 'Mediators' },
  { id: 'moderators', group: 'METHODS', vi: 'Biến điều tiết', en: 'Moderators' },
  { id: 'data_collection', group: 'METHODS', vi: 'Thu thập dữ liệu', en: 'Data Collection' },
  { id: 'data_analysis_method', group: 'METHODS', vi: 'Phương pháp phân tích', en: 'Data Analysis Method' },
  { id: 'statistical_techniques', group: 'METHODS', vi: 'Kỹ thuật thống kê', en: 'Statistical Techniques' },
  { id: 'design_fit', group: 'APPRAISAL', vi: 'Mức phù hợp của thiết kế', en: 'Design Fit' },
  { id: 'sample_size_appraisal', group: 'APPRAISAL', vi: 'Đánh giá cỡ mẫu', en: 'Sample Size Appraisal' },
  { id: 'statistical_power_appraisal', group: 'APPRAISAL', vi: 'Đánh giá độ mạnh thống kê', en: 'Statistical Power Appraisal' },
  { id: 'control_group_appraisal', group: 'APPRAISAL', vi: 'Đánh giá nhóm đối chứng', en: 'Control Group Appraisal' },
  { id: 'selection_bias', group: 'APPRAISAL', vi: 'Thiên lệch chọn mẫu', en: 'Selection Bias' },
  { id: 'measurement_bias', group: 'APPRAISAL', vi: 'Thiên lệch đo lường', en: 'Measurement Bias' },
  { id: 'other_bias', group: 'APPRAISAL', vi: 'Thiên lệch khác', en: 'Other Bias' },
  { id: 'raw_data_availability', group: 'APPRAISAL', vi: 'Dữ liệu thô', en: 'Raw Data Availability' },
  { id: 'analysis_code_availability', group: 'APPRAISAL', vi: 'Mã phân tích', en: 'Analysis Code Availability' },
  { id: 'reproducibility_appraisal', group: 'APPRAISAL', vi: 'Khả năng tái lập', en: 'Reproducibility Appraisal' },
  { id: 'key_findings', group: 'APPRAISAL', vi: 'Kết quả chính', en: 'Key Findings' },
  { id: 'effect_size', group: 'APPRAISAL', vi: 'Kích thước hiệu ứng', en: 'Effect Size' },
  { id: 'confidence_interval', group: 'APPRAISAL', vi: 'Khoảng tin cậy', en: 'Confidence Interval' },
  { id: 'p_value', group: 'APPRAISAL', vi: 'Giá trị p', en: 'P-value' },
  { id: 'other_uncertainty', group: 'APPRAISAL', vi: 'Độ bất định khác', en: 'Other Uncertainty' },
  { id: 'practical_significance', group: 'APPRAISAL', vi: 'Ý nghĩa thực tiễn', en: 'Practical Significance' },
  { id: 'independent_conclusion', group: 'APPRAISAL', vi: 'Kết luận độc lập', en: 'Independent Conclusion' },
  { id: 'author_conclusion', group: 'APPRAISAL', vi: 'Kết luận của tác giả', en: 'Author Conclusion' },
  { id: 'agreement', group: 'APPRAISAL', vi: 'Điểm đồng thuận', en: 'Agreement' },
  { id: 'disagreement', group: 'APPRAISAL', vi: 'Điểm khác biệt', en: 'Disagreement' },
  { id: 'overclaiming', group: 'APPRAISAL', vi: 'Cường điệu hóa', en: 'Overclaiming' },
  { id: 'generalization_beyond_sample', group: 'APPRAISAL', vi: 'Khái quát vượt mẫu', en: 'Generalization Beyond Sample' },
  { id: 'causal_overreach', group: 'APPRAISAL', vi: 'Suy diễn nhân quả', en: 'Causal Overreach' },
  { id: 'strengths', group: 'APPRAISAL', vi: 'Điểm mạnh', en: 'Strengths' },
  { id: 'limitations', group: 'APPRAISAL', vi: 'Hạn chế', en: 'Limitations' },
  { id: 'confounders', group: 'APPRAISAL', vi: 'Yếu tố gây nhiễu', en: 'Confounders' },
  { id: 'alternative_explanations', group: 'APPRAISAL', vi: 'Giải thích thay thế', en: 'Alternative Explanations' },
  { id: 'funding_source', group: 'APPRAISAL', vi: 'Nguồn tài trợ', en: 'Funding Source' },
  { id: 'conflicts_of_interest', group: 'APPRAISAL', vi: 'Xung đột lợi ích', en: 'Conflicts of Interest' },
  { id: 'final_verdict', group: 'APPRAISAL', vi: 'Phán quyết cuối', en: 'Final Verdict' },
  { id: 'evidence_strength', group: 'APPRAISAL', vi: 'Mức độ mạnh bằng chứng', en: 'Evidence Strength' },
  { id: 'evidence_strength_rationale', group: 'APPRAISAL', vi: 'Lý do xếp hạng bằng chứng', en: 'Evidence Strength Rationale' },
  { id: 'contribution_to_field', group: 'SYNTHESIS', vi: 'Đóng góp cho lĩnh vực', en: 'Contribution to Field' },
  { id: 'theoretical_implications', group: 'SYNTHESIS', vi: 'Hàm ý lý thuyết', en: 'Theoretical Implications' },
  { id: 'practical_implications', group: 'SYNTHESIS', vi: 'Hàm ý thực tiễn', en: 'Practical Implications' },
  { id: 'future_research', group: 'SYNTHESIS', vi: 'Nghiên cứu tương lai', en: 'Future Research' },
  { id: 'keywords', group: 'SYNTHESIS', vi: 'Từ khóa', en: 'Keywords' },
  { id: 'themes', group: 'SYNTHESIS', vi: 'Chủ đề', en: 'Themes' },
];

export const MATRIX_GROUP_LABELS: Record<MatrixGroup, { vi: string; en: string }> = {
  IDENTIFICATION: { vi: 'Định danh', en: 'Identification' },
  SCOPE: { vi: 'Phạm vi và cơ sở', en: 'Scope and Rationale' },
  METHODS: { vi: 'Phương pháp', en: 'Methods' },
  APPRAISAL: { vi: 'Kết quả và phản biện', en: 'Results and Appraisal' },
  SYNTHESIS: { vi: 'Tổng hợp', en: 'Synthesis' },
};

const join = (items: string[]): string => items.length ? items.join('; ') : '';

export const evidenceStrengthLabel = (value: EvidenceStrength, language: Language): string => {
  const labels: Record<EvidenceStrength, { vi: string; en: string }> = {
    STRONG: { vi: 'Mạnh', en: 'Strong' },
    MODERATE: { vi: 'Trung bình', en: 'Moderate' },
    LIMITED: { vi: 'Hạn chế', en: 'Limited' },
    VERY_LIMITED: { vi: 'Rất hạn chế', en: 'Very limited' },
    NOT_ENOUGH_INFORMATION: { vi: 'Không đủ thông tin', en: 'Not enough information' },
  };
  return labels[value][language];
};

export const toLiteratureMatrixRow = (doc: Document, language: Language): LiteratureMatrixRow | null => {
  if (!isAcademicV2(doc.analysis)) return null;
  const a = doc.analysis;
  const s1 = a.step1_overview;
  const s2 = a.step2_research_question;
  const s3 = a.step3_knowledge_gap;
  const s4 = a.step4_method_evaluation;
  const s5 = a.step5_independent_conclusion;
  const s6 = a.step6_author_comparison;
  const s7 = a.step7_alternatives_and_confounders;
  return {
    docId: doc.id,
    docTitle: a.title,
    source_file: doc.fileName,
    title: a.title,
    authors: join(a.authors),
    publication_year: a.publication_year,
    citation_apa: a.citation_apa,
    doi: a.doi || '',
    study_type: s1.study_type,
    research_design: s1.research_design,
    country: s1.country,
    study_location: s1.study_location,
    study_setting: s1.study_setting,
    population: s1.population,
    research_question: s2.research_question,
    hypothesis: s2.hypothesis,
    question_status: s2.question_status,
    known_knowledge: s3.known_knowledge,
    knowledge_gap: s3.unknown_knowledge,
    importance: s3.importance,
    theoretical_framework: s3.theoretical_framework,
    conceptual_framework: s3.conceptual_framework,
    sample_size: s4.sample_size,
    sample_characteristics: s4.sample_characteristics,
    sampling_method: s4.sampling_method,
    intervention: s4.intervention,
    exposure: s4.exposure,
    comparator: s4.comparator,
    independent_variables: join(s4.independent_variables),
    dependent_variables: join(s4.dependent_variables),
    mediators: join(s4.mediators),
    moderators: join(s4.moderators),
    data_collection: s4.data_collection,
    data_analysis_method: s4.data_analysis_method,
    statistical_techniques: s4.statistical_techniques,
    design_fit: s4.design_fit,
    sample_size_appraisal: s4.sample_size_appraisal,
    statistical_power_appraisal: s4.statistical_power_appraisal,
    control_group_appraisal: s4.control_group_appraisal,
    selection_bias: s4.selection_bias,
    measurement_bias: s4.measurement_bias,
    other_bias: s4.other_bias,
    raw_data_availability: s4.raw_data_availability,
    analysis_code_availability: s4.analysis_code_availability,
    reproducibility_appraisal: s4.reproducibility_appraisal,
    key_findings: join(s5.key_findings),
    effect_size: s5.effect_size,
    confidence_interval: s5.confidence_interval,
    p_value: s5.p_value,
    other_uncertainty: s5.other_uncertainty,
    practical_significance: s5.practical_significance,
    independent_conclusion: s5.independent_conclusion,
    author_conclusion: s6.author_conclusion,
    agreement: s6.agreement,
    disagreement: s6.disagreement,
    overclaiming: s6.overclaiming,
    generalization_beyond_sample: s6.generalization_beyond_sample,
    causal_overreach: s6.causal_overreach,
    strengths: join(s7.strengths),
    limitations: join(s7.limitations),
    confounders: join(s7.confounders),
    alternative_explanations: join(s7.alternative_explanations),
    funding_source: s7.funding_source,
    conflicts_of_interest: s7.conflicts_of_interest,
    final_verdict: s7.final_verdict,
    evidence_strength: evidenceStrengthLabel(s7.evidence_strength, language),
    evidence_strength_rationale: s7.evidence_strength_rationale,
    contribution_to_field: a.synthesis.contribution_to_field,
    theoretical_implications: a.synthesis.theoretical_implications,
    practical_implications: a.synthesis.practical_implications,
    future_research: a.synthesis.future_research,
    keywords: join(a.synthesis.keywords),
    themes: join(a.synthesis.themes),
  };
};

const appraisalSteps = (analysis: AnalysisResult, language: Language): Array<{
  phase: string;
  step: string;
  criterion: string;
  data: EvidenceBasedAssessment;
}> => {
  const vi = language === 'vi';
  return [
    { phase: vi ? 'Đánh giá tổng thể' : 'Overall assessment', step: '1', criterion: vi ? 'Tổng quan nghiên cứu' : 'Study overview', data: analysis.step1_overview },
    { phase: vi ? 'Đánh giá tổng thể' : 'Overall assessment', step: '2', criterion: vi ? 'Câu hỏi nghiên cứu' : 'Research question', data: analysis.step2_research_question },
    { phase: vi ? 'Đánh giá tổng thể' : 'Overall assessment', step: '3', criterion: vi ? 'Khoảng trống tri thức' : 'Knowledge gap', data: analysis.step3_knowledge_gap },
    { phase: vi ? 'Chất vấn' : 'Questioning', step: '4', criterion: vi ? 'Đánh giá phương pháp' : 'Method evaluation', data: analysis.step4_method_evaluation },
    { phase: vi ? 'Chất vấn' : 'Questioning', step: '5', criterion: vi ? 'Kết luận độc lập' : 'Independent conclusion', data: analysis.step5_independent_conclusion },
    { phase: vi ? 'Phán quyết' : 'Verdict', step: '6', criterion: vi ? 'So sánh kết luận' : 'Conclusion comparison', data: analysis.step6_author_comparison },
    { phase: vi ? 'Phán quyết' : 'Verdict', step: '7', criterion: vi ? 'Giải thích thay thế và nhiễu' : 'Alternatives and confounders', data: analysis.step7_alternatives_and_confounders },
  ];
};

export const toCriticalAppraisalRows = (doc: Document, language: Language): CriticalAppraisalRow[] => {
  if (!isAcademicV2(doc.analysis)) return [];
  return appraisalSteps(doc.analysis, language).flatMap(({ phase, step, criterion, data }) => {
    const evidence = data.evidence.length ? data.evidence : [{ claim: '', source: '' }];
    return evidence.map(item => ({
      studyId: doc.id,
      title: doc.analysis!.title,
      phase,
      step,
      criterion,
      assessment: data.assessment,
      evidenceClaim: item.claim,
      evidenceSource: item.source,
    }));
  });
};

export const formatAcademicReport = (doc: Document, language: Language): string => {
  if (isAcademicV2(doc.analysis)) {
    const a = doc.analysis;
    const lines = [
      `TITLE: ${a.title}`,
      `AUTHORS: ${join(a.authors)}`,
      `CITATION: ${a.citation_apa}`,
      a.doi ? `DOI: ${a.doi}` : '',
      '',
      ...appraisalSteps(a, language).flatMap(({ phase, step, criterion, data }) => [
        `[${step}] ${phase.toUpperCase()} - ${criterion.toUpperCase()}`,
        data.assessment,
        ...data.evidence.map(e => `- ${e.claim} (${e.source})`),
        '',
      ]),
      `EVIDENCE STRENGTH: ${evidenceStrengthLabel(a.step7_alternatives_and_confounders.evidence_strength, language)}`,
      `RATIONALE: ${a.step7_alternatives_and_confounders.evidence_strength_rationale}`,
      `FINAL VERDICT: ${a.step7_alternatives_and_confounders.final_verdict}`,
    ];
    return lines.filter((line, index) => line || lines[index - 1] !== '').join('\n');
  }

  if (isLegacyAcademic(doc.analysis)) {
    const a: LegacyAnalysisResult = doc.analysis;
    return `TITLE: ${a.title}\nAUTHORS: ${join(a.authors)}\nCITATION: ${a.citation_apa}\n\nLEGACY ANALYSIS\n${a.thesis_background}\n\nMETHOD\n${a.methodology}\n\nRESULTS\n${a.results_interpretation}\n\nCONCLUSION\n${a.overall_conclusion}`;
  }
  return '';
};
