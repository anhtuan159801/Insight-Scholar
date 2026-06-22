import { Document, ProcessingStatus } from '../types';
import { normalizeAcademicAnalysis } from './analysisNormalizer';

export const createE2EDocument = (): Document => ({
  id: 'e2e-paper',
  fileName: 'e2e-scientific-paper.pdf',
  fileType: 'application/pdf',
  content: 'Deterministic browser-test fixture for the seven-step academic workflow.',
  status: ProcessingStatus.SUCCESS,
  analysisType: 'ACADEMIC',
  uploadDate: Date.now(),
  analysis: normalizeAcademicAnalysis({
    title: 'A Reproducible Test of the Seven-Step Review Workflow',
    authors: ['An Nguyen', 'Mai Tran'],
    publication_year: '2026',
    citation_apa: 'Nguyen, A., & Tran, M. (2026). A reproducible test of the seven-step review workflow.',
    doi: '10.0000/e2e.fixture',
    analysis_language: 'English',
    extraction_limitations: 'Figures are not available in the extracted text.',
    step1_overview: { assessment: 'A controlled quantitative study.', study_type: 'Empirical', research_design: 'Controlled study', country: 'Vietnam', population: 'University students', headline_findings: ['The intervention improved the measured outcome.'], evidence: [{ claim: 'The abstract identifies a controlled study.', source: 'Abstract' }] },
    step2_research_question: { assessment: 'The question is explicit.', research_question: 'Does the intervention improve the outcome?', hypothesis: 'The intervention improves the outcome.', question_status: 'EXPLICIT', evidence: [{ claim: 'The objective is stated explicitly.', source: 'Introduction' }] },
    step3_knowledge_gap: { assessment: 'Prior evidence did not address this setting.', known_knowledge: 'The intervention has been studied elsewhere.', unknown_knowledge: 'Its effect in this setting was unknown.', importance: 'The setting is operationally important.', evidence: [{ claim: 'The gap is stated at the end of the introduction.', source: 'Introduction' }] },
    step4_method_evaluation: { assessment: 'The design is broadly appropriate.', sample_size: '120', sample_characteristics: 'University students', sampling_method: 'Convenience sampling', data_collection: 'Validated questionnaire', data_analysis_method: 'Group comparison', statistical_techniques: 'Linear regression', design_fit: 'Appropriate with limitations', sample_size_appraisal: 'Adequate for the stated model', statistical_power_appraisal: 'Power analysis reported', control_group_appraisal: 'Concurrent control included', selection_bias: 'Convenience sampling may bias selection', measurement_bias: 'Self-report measurement', reproducibility_appraisal: 'Protocol available', evidence: [{ claim: 'Methods report the sample and analysis.', source: 'Methods' }] },
    step5_independent_conclusion: { assessment: 'The result supports an association.', key_findings: ['Outcome improved relative to control.'], effect_size: '0.42', confidence_interval: '95% CI 0.18 to 0.66', p_value: 'p = 0.001', practical_significance: 'Moderate improvement', independent_conclusion: 'The intervention is associated with improved outcomes in this sample.', evidence: [{ claim: 'The primary estimate favors the intervention.', source: 'Table 2' }] },
    step6_author_comparison: { assessment: 'Mostly aligned, with causal overreach.', author_conclusion: 'The intervention causes improvement.', agreement: 'Direction and magnitude agree.', disagreement: 'Causality is not fully established.', overclaiming: 'Causal wording is too strong.', causal_overreach: 'Residual confounding remains possible.', evidence: [{ claim: 'The discussion uses causal language.', source: 'Discussion' }] },
    step7_alternatives_and_confounders: { assessment: 'Evidence is moderate for this sample.', strengths: ['Concurrent control'], limitations: ['Convenience sample'], confounders: ['Baseline motivation'], alternative_explanations: ['Attention effects'], funding_source: 'University research fund', conflicts_of_interest: 'None declared', final_verdict: 'Useful evidence with limited generalizability.', evidence_strength: 'MODERATE', evidence_strength_rationale: 'Appropriate design but selection and measurement limitations remain.', evidence: [{ claim: 'Limitations include non-random sampling.', source: 'Limitations' }] },
    synthesis: { contribution_to_field: 'Adds context-specific evidence.', theoretical_implications: 'Supports the proposed mechanism.', practical_implications: 'Supports a cautious pilot deployment.', future_research: 'Use randomized multi-site samples.', keywords: ['critical appraisal', 'literature matrix'], themes: ['reproducibility', 'evidence strength'] },
    keywords: { vi: ['phản biện khoa học'], en: ['critical appraisal'] },
  }, 'en'),
});
