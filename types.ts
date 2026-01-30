
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

// Existing Academic Result
export interface AnalysisResult {
  type: 'ACADEMIC'; // Discriminator
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
  analysis?: AnalysisResult | PolicyAnalysisResult; // Can be either
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
