import {
  AlternativeAssessment,
  AnalysisResult,
  AnalysisSynthesis,
  ConclusionComparison,
  EvidenceBasedAssessment,
  EvidenceItem,
  EvidenceStrength,
  IndependentConclusion,
  KnowledgeGapAssessment,
  Language,
  LegacyAnalysisResult,
  MethodEvaluation,
  PolicyAnalysisResult,
  ResearchQuestionAssessment,
  StudyOverview,
} from '../types';

const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const stringValue = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map(item => item.trim())
    : [];

const evidenceArray = (value: unknown, missing: string): EvidenceItem[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): EvidenceItem[] => {
    if (typeof item === 'string' && item.trim()) {
      return [{ claim: item.trim(), source: missing }];
    }
    const record = objectValue(item);
    const claim = optionalString(record.claim);
    if (!claim) return [];
    return [{ claim, source: stringValue(record.source, missing) }];
  });
};

const baseAssessment = (value: unknown, missing: string): EvidenceBasedAssessment => {
  const record = objectValue(value);
  return {
    assessment: stringValue(record.assessment, missing),
    evidence: evidenceArray(record.evidence, missing),
  };
};

const strengthValue = (value: unknown): EvidenceStrength => {
  const allowed: EvidenceStrength[] = ['STRONG', 'MODERATE', 'LIMITED', 'VERY_LIMITED', 'NOT_ENOUGH_INFORMATION'];
  return typeof value === 'string' && allowed.includes(value as EvidenceStrength)
    ? value as EvidenceStrength
    : 'NOT_ENOUGH_INFORMATION';
};

const normalizeOverview = (value: unknown, missing: string): StudyOverview => {
  const record = objectValue(value);
  return {
    ...baseAssessment(value, missing),
    study_type: stringValue(record.study_type, missing),
    research_design: stringValue(record.research_design, missing),
    country: stringValue(record.country, missing),
    study_location: stringValue(record.study_location, missing),
    study_setting: stringValue(record.study_setting, missing),
    population: stringValue(record.population, missing),
    headline_findings: stringArray(record.headline_findings),
  };
};

const normalizeQuestion = (value: unknown, missing: string): ResearchQuestionAssessment => {
  const record = objectValue(value);
  const status = record.question_status;
  return {
    ...baseAssessment(value, missing),
    research_question: stringValue(record.research_question, missing),
    hypothesis: stringValue(record.hypothesis, missing),
    question_status: status === 'EXPLICIT' || status === 'INFERRED' ? status : 'NOT_REPORTED',
  };
};

const normalizeGap = (value: unknown, missing: string): KnowledgeGapAssessment => {
  const record = objectValue(value);
  return {
    ...baseAssessment(value, missing),
    known_knowledge: stringValue(record.known_knowledge, missing),
    unknown_knowledge: stringValue(record.unknown_knowledge, missing),
    importance: stringValue(record.importance, missing),
    theoretical_framework: stringValue(record.theoretical_framework, missing),
    conceptual_framework: stringValue(record.conceptual_framework, missing),
  };
};

const normalizeMethod = (value: unknown, missing: string): MethodEvaluation => {
  const record = objectValue(value);
  return {
    ...baseAssessment(value, missing),
    sample_size: stringValue(record.sample_size, missing),
    sample_characteristics: stringValue(record.sample_characteristics, missing),
    sampling_method: stringValue(record.sampling_method, missing),
    intervention: stringValue(record.intervention, missing),
    exposure: stringValue(record.exposure, missing),
    comparator: stringValue(record.comparator, missing),
    independent_variables: stringArray(record.independent_variables),
    dependent_variables: stringArray(record.dependent_variables),
    mediators: stringArray(record.mediators),
    moderators: stringArray(record.moderators),
    data_collection: stringValue(record.data_collection, missing),
    data_analysis_method: stringValue(record.data_analysis_method, missing),
    statistical_techniques: stringValue(record.statistical_techniques, missing),
    design_fit: stringValue(record.design_fit, missing),
    sample_size_appraisal: stringValue(record.sample_size_appraisal, missing),
    statistical_power_appraisal: stringValue(record.statistical_power_appraisal, missing),
    control_group_appraisal: stringValue(record.control_group_appraisal, missing),
    selection_bias: stringValue(record.selection_bias, missing),
    measurement_bias: stringValue(record.measurement_bias, missing),
    other_bias: stringValue(record.other_bias, missing),
    raw_data_availability: stringValue(record.raw_data_availability, missing),
    analysis_code_availability: stringValue(record.analysis_code_availability, missing),
    reproducibility_appraisal: stringValue(record.reproducibility_appraisal, missing),
  };
};

const normalizeIndependentConclusion = (value: unknown, missing: string): IndependentConclusion => {
  const record = objectValue(value);
  return {
    ...baseAssessment(value, missing),
    key_findings: stringArray(record.key_findings),
    effect_size: stringValue(record.effect_size, missing),
    confidence_interval: stringValue(record.confidence_interval, missing),
    p_value: stringValue(record.p_value, missing),
    other_uncertainty: stringValue(record.other_uncertainty, missing),
    practical_significance: stringValue(record.practical_significance, missing),
    independent_conclusion: stringValue(record.independent_conclusion, missing),
  };
};

const normalizeComparison = (value: unknown, missing: string): ConclusionComparison => {
  const record = objectValue(value);
  return {
    ...baseAssessment(value, missing),
    author_conclusion: stringValue(record.author_conclusion, missing),
    agreement: stringValue(record.agreement, missing),
    disagreement: stringValue(record.disagreement, missing),
    overclaiming: stringValue(record.overclaiming, missing),
    generalization_beyond_sample: stringValue(record.generalization_beyond_sample, missing),
    causal_overreach: stringValue(record.causal_overreach, missing),
  };
};

const normalizeAlternatives = (value: unknown, missing: string): AlternativeAssessment => {
  const record = objectValue(value);
  return {
    ...baseAssessment(value, missing),
    strengths: stringArray(record.strengths),
    limitations: stringArray(record.limitations),
    confounders: stringArray(record.confounders),
    alternative_explanations: stringArray(record.alternative_explanations),
    funding_source: stringValue(record.funding_source, missing),
    conflicts_of_interest: stringValue(record.conflicts_of_interest, missing),
    final_verdict: stringValue(record.final_verdict, missing),
    evidence_strength: strengthValue(record.evidence_strength),
    evidence_strength_rationale: stringValue(record.evidence_strength_rationale, missing),
  };
};

const normalizeSynthesis = (value: unknown, missing: string): AnalysisSynthesis => {
  const record = objectValue(value);
  return {
    contribution_to_field: stringValue(record.contribution_to_field, missing),
    theoretical_implications: stringValue(record.theoretical_implications, missing),
    practical_implications: stringValue(record.practical_implications, missing),
    future_research: stringValue(record.future_research, missing),
    keywords: stringArray(record.keywords),
    themes: stringArray(record.themes),
  };
};

export const normalizeAcademicAnalysis = (value: unknown, language: Language): AnalysisResult => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The academic analysis response is not a JSON object.');
  }

  const record = value as Record<string, unknown>;
  const reportedLanguage = optionalString(record.analysis_language) || '';
  const useVietnameseMissing = /(^vi$|vietnam|tiếng việt)/i.test(reportedLanguage) || (!reportedLanguage && language === 'vi');
  const missing = useVietnameseMissing ? 'Không được báo cáo trong tài liệu.' : 'Not reported in the document.';
  const keywordRecord = objectValue(record.keywords);

  return {
    type: 'ACADEMIC',
    schema_version: 2,
    title: stringValue(record.title, missing),
    authors: stringArray(record.authors),
    publication_year: stringValue(record.publication_year, missing),
    citation_apa: stringValue(record.citation_apa, missing),
    doi: optionalString(record.doi),
    analysis_language: stringValue(record.analysis_language, language === 'vi' ? 'Tiếng Việt' : 'English'),
    extraction_limitations: stringValue(record.extraction_limitations, missing),
    step1_overview: normalizeOverview(record.step1_overview, missing),
    step2_research_question: normalizeQuestion(record.step2_research_question, missing),
    step3_knowledge_gap: normalizeGap(record.step3_knowledge_gap, missing),
    step4_method_evaluation: normalizeMethod(record.step4_method_evaluation, missing),
    step5_independent_conclusion: normalizeIndependentConclusion(record.step5_independent_conclusion, missing),
    step6_author_comparison: normalizeComparison(record.step6_author_comparison, missing),
    step7_alternatives_and_confounders: normalizeAlternatives(record.step7_alternatives_and_confounders, missing),
    synthesis: normalizeSynthesis(record.synthesis, missing),
    keywords: {
      vi: stringArray(keywordRecord.vi),
      en: stringArray(keywordRecord.en),
    },
  };
};

export const isAcademicV2 = (value: unknown): value is AnalysisResult => {
  const record = objectValue(value);
  return record.type === 'ACADEMIC' && record.schema_version === 2 && Boolean(record.step1_overview);
};

export const isPolicyAnalysis = (value: unknown): value is PolicyAnalysisResult =>
  objectValue(value).type === 'POLICY';

export const isLegacyAcademic = (value: unknown): value is LegacyAnalysisResult => {
  const record = objectValue(value);
  return !isPolicyAnalysis(value) && !isAcademicV2(value) && typeof record.title === 'string';
};
