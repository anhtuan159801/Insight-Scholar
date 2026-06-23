
export enum ProcessingStatus {
  PARSING = 'PARSING',
  PENDING = 'PENDING',
  FILTERING = 'FILTERING', // Checking relevance
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  SKIPPED = 'SKIPPED', // Irrelevant to objective
}

export type Language = 'vi' | 'en';

export type AnalysisType = 'ACADEMIC' | 'POLICY'; // New Type Definition

export interface ResearchFolder {
  id: string;
  name: string; // The objective/topic
  description?: string;
  color?: string;
}

export interface EvidenceItem {
  claim: string;
  source: string;
}

export interface EvidenceBasedAssessment {
  assessment: string;
  evidence: EvidenceItem[];
}

export type EvidenceStrength =
  | 'STRONG'
  | 'MODERATE'
  | 'LIMITED'
  | 'VERY_LIMITED'
  | 'NOT_ENOUGH_INFORMATION';

export interface StudyOverview extends EvidenceBasedAssessment {
  study_type: string;
  research_design: string;
  country: string;
  study_location: string;
  study_setting: string;
  population: string;
  headline_findings: string[];
}

export interface ResearchQuestionAssessment extends EvidenceBasedAssessment {
  research_question: string;
  hypothesis: string;
  question_status: 'EXPLICIT' | 'INFERRED' | 'NOT_REPORTED';
}

export interface KnowledgeGapAssessment extends EvidenceBasedAssessment {
  known_knowledge: string;
  unknown_knowledge: string;
  importance: string;
  theoretical_framework: string;
  conceptual_framework: string;
}

export interface MethodEvaluation extends EvidenceBasedAssessment {
  sample_size: string;
  sample_characteristics: string;
  sampling_method: string;
  intervention: string;
  exposure: string;
  comparator: string;
  independent_variables: string[];
  dependent_variables: string[];
  mediators: string[];
  moderators: string[];
  data_collection: string;
  data_analysis_method: string;
  statistical_techniques: string;
  design_fit: string;
  sample_size_appraisal: string;
  statistical_power_appraisal: string;
  control_group_appraisal: string;
  selection_bias: string;
  measurement_bias: string;
  other_bias: string;
  raw_data_availability: string;
  analysis_code_availability: string;
  reproducibility_appraisal: string;
}

export interface IndependentConclusion extends EvidenceBasedAssessment {
  key_findings: string[];
  effect_size: string;
  confidence_interval: string;
  p_value: string;
  other_uncertainty: string;
  practical_significance: string;
  independent_conclusion: string;
}

export interface ConclusionComparison extends EvidenceBasedAssessment {
  author_conclusion: string;
  agreement: string;
  disagreement: string;
  overclaiming: string;
  generalization_beyond_sample: string;
  causal_overreach: string;
}

export interface AlternativeAssessment extends EvidenceBasedAssessment {
  strengths: string[];
  limitations: string[];
  confounders: string[];
  alternative_explanations: string[];
  funding_source: string;
  conflicts_of_interest: string;
  final_verdict: string;
  evidence_strength: EvidenceStrength;
  evidence_strength_rationale: string;
}

export interface AnalysisSynthesis {
  contribution_to_field: string;
  theoretical_implications: string;
  practical_implications: string;
  future_research: string;
  keywords: string[];
  themes: string[];
}

export interface AnalysisResult {
  type: 'ACADEMIC';
  schema_version: 2;
  title: string;
  authors: string[];
  publication_year: string;
  citation_apa: string;
  doi?: string;
  analysis_language: string;
  extraction_limitations: string;
  step1_overview: StudyOverview;
  step2_research_question: ResearchQuestionAssessment;
  step3_knowledge_gap: KnowledgeGapAssessment;
  step4_method_evaluation: MethodEvaluation;
  step5_independent_conclusion: IndependentConclusion;
  step6_author_comparison: ConclusionComparison;
  step7_alternatives_and_confounders: AlternativeAssessment;
  synthesis: AnalysisSynthesis;
  keywords: { vi: string[]; en: string[] };
}

export interface LegacyAnalysisResult {
  type?: 'ACADEMIC';
  schema_version?: 1;
  title: string;
  authors: string[];
  citation_apa: string;
  doi?: string;
  thesis_background: string;
  theoretical_framework: string;
  conceptual_framework: string;
  definitions_variables: Array<{ term: string; definition: string; quote?: string }>;
  methodology: string;
  results_interpretation: string;
  scope_limitations: string;
  structure_presentation: string;
  contributions_future_research: string;
  overall_conclusion: string;
  keywords: { vi: string[]; en: string[] };
}

// New Policy/News Result
export interface PolicyAnalysisResult {
  type: 'POLICY'; // Discriminator
  title: string;
  source_date: string; // Publication source and date
  document_category: string; // e.g., "Legal Text", "News Article", "Official Decree"
  main_subject: string; // What is the core issue?
  key_stakeholders: string[]; // Who is involved/affected?
  legal_basis: string; // Laws, decrees, articles mentioned
  key_points: string[]; // Bullet points of main content
  implications_impact: string; // Social/Economic/Political impact
  controversies_criticism: string; // Debates or opposing views
  conclusion_summary: string;
  keywords: { vi: string[]; en: string[] };
}

export interface Document {
  id: string;
  fileName: string;
  fileType: string;
  content: string; 
  status: ProcessingStatus;
  analysisType?: AnalysisType; // Store which mode was used
  analysis?: AnalysisResult | LegacyAnalysisResult | PolicyAnalysisResult;
  errorMessage?: string;
  relevanceReason?: string; 
  uploadDate: number;
  folderIds?: string[]; 
}

export interface BibliometricData {
  topicDistribution: Array<{ name: string; count: number }>;
  methodologyDistribution: Array<{ name: string; count: number }>;
  summaryTable: Array<{ title: string; year: string; keyFinding: string }>;
  knowledgeGaps: string[];
  overallAnalysis: string;
}

export interface SynthesisMatrixColumn {
  id: string;
  header: string;
  promptKey: string; 
}

export interface SynthesisRow {
  docId: string;
  docTitle: string;
  [key: string]: string;
}
