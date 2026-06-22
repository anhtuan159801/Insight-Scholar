
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PolicyAnalysisResult, BibliometricData, Document, SynthesisMatrixColumn, SynthesisRow, Language, ResearchFolder } from '../types';
import { normalizeAcademicAnalysis } from './analysisNormalizer';

type JsonSchema = any;

type LLMRequest = {
  model: string;
  prompt: string;
  schema?: JsonSchema;
  mimeType?: string;
  openRouterModel?: string;
};

type LLMProvider = {
  name: string;
  isAvailable: () => boolean;
  generate: (request: LLMRequest) => Promise<string>;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const parseEnvList = (value?: string) =>
  (value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const collectNumberedKeys = (prefix: string): string[] => {
  return Object.entries(process.env || {})
    .filter(([k, v]) => k.startsWith(prefix) && v)
    .sort((a, b) => {
      const numA = parseInt(a[0].slice(prefix.length), 10);
      const numB = parseInt(b[0].slice(prefix.length), 10);
      if (Number.isNaN(numA) && Number.isNaN(numB)) return 0;
      if (Number.isNaN(numA)) return 1;
      if (Number.isNaN(numB)) return -1;
      return numA - numB;
    })
    .map(([, v]) => v as string)
    .filter(Boolean);
};

const GEMINI_KEYS = [
  ...parseEnvList(
    process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.API_KEY
  ),
  ...collectNumberedKeys("GEMINI_API_KEY_"),
].filter(Boolean);

const OPENROUTER_KEYS = [
  ...(process.env.OPENROUTER_API_KEY ? [process.env.OPENROUTER_API_KEY] : []),
  ...collectNumberedKeys("OPENROUTER_API_KEY_"),
].filter(Boolean);

const DEFAULT_OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct";
let runtimeOpenRouterModel = DEFAULT_OPENROUTER_MODEL;

export const setOpenRouterModel = (model: string) => {
  runtimeOpenRouterModel = model?.trim() || DEFAULT_OPENROUTER_MODEL;
};

let preferredEngine: 'auto' | 'ollama' = 'auto';
let OLLAMA_MODEL = process.env.OLLAMA_MODEL || '';
let OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api/chat';
export const setPreferredEngine = (engine: 'auto' | 'ollama') => { preferredEngine = engine; };
export const setOllamaConfig = (model?: string, baseUrl?: string) => {
  if (model) OLLAMA_MODEL = model;
  if (baseUrl) {
    const trimmed = baseUrl.trim().replace(/\/$/, '');
    OLLAMA_BASE_URL = trimmed.endsWith('/api/chat') ? trimmed : `${trimmed}/api/chat`;
  }
};

const PROVIDER_ORDER =
  parseEnvList(process.env.LLM_PROVIDER_ORDER) || ["gemini", "openrouter"];

const isQuotaLikeError = (error: any) =>
  error?.status === 429 ||
  error?.code === 429 ||
  (typeof error?.message === "string" &&
    (error.message.includes("429") ||
      error.message.toLowerCase().includes("quota"))) ||
  error?.status === 503 ||
  error?.code === 503;

class GeminiProvider implements LLMProvider {
  name = "gemini";
  private keys: string[];
  private keyIndex = 0;
  private maxRetriesPerKey = 3;

  constructor(keys: string[]) {
    this.keys = keys;
  }

  isAvailable = () => this.keys.length > 0;

  private rotateKey() {
    this.keyIndex = (this.keyIndex + 1) % this.keys.length;
  }

  private getCurrentClient() {
    return new GoogleGenAI({ apiKey: this.keys[this.keyIndex] });
  }

  private async callWithRetry(request: LLMRequest) {
    let lastError: any;
    for (let attempt = 0; attempt < this.maxRetriesPerKey; attempt++) {
      try {
        const client = this.getCurrentClient();
        const response = await client.models.generateContent({
          model: request.model,
          contents: request.prompt,
          config: request.schema
            ? {
                responseMimeType: request.mimeType || "application/json",
                responseSchema: request.schema,
              }
            : undefined,
        });
        return response.text || "";
      } catch (error: any) {
        lastError = error;
        const retryable = isQuotaLikeError(error);
        if (retryable && attempt < this.maxRetriesPerKey - 1) {
          const waitTime = 2000 * Math.pow(2, attempt);
          console.warn(
            `[Gemini] quota/server issue, retrying in ${waitTime}ms (attempt ${
              attempt + 1
            }/${this.maxRetriesPerKey})...`,
            error
          );
          await delay(waitTime);
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  generate = async (request: LLMRequest): Promise<string> => {
    if (!this.isAvailable()) {
      throw new Error("No Gemini API key configured.");
    }

    let tries = 0;
    let lastError: any;

    while (tries < this.keys.length) {
      try {
        const result = await this.callWithRetry(request);
        if (!result) throw new Error("Empty response from Gemini");
        return result;
      } catch (error: any) {
        lastError = error;
        const shouldFailover = isQuotaLikeError(error);
        console.warn(
          `[Gemini] key #${this.keyIndex + 1}/${this.keys.length} error: ${
            error?.message || error
          }`
        );

        if (shouldFailover) {
          this.rotateKey();
          tries++;
          console.info(
            `[Gemini] switching to fallback key (${tries}/${this.keys.length})`
          );
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error("All Gemini API keys exhausted.");
  };
}

class OpenRouterProvider implements LLMProvider {
  name = "openrouter";
  private keys: string[];
  private keyIndex = 0;
  private baseUrl = "https://openrouter.ai/api/v1/chat/completions";

  constructor(keys: string[]) {
    this.keys = keys;
  }

  isAvailable = () => this.keys.length > 0;

  private rotateKey() {
    this.keyIndex = (this.keyIndex + 1) % this.keys.length;
  }

  private currentKey() {
    return this.keys[this.keyIndex];
  }

  generate = async (request: LLMRequest): Promise<string> => {
    if (!this.isAvailable()) {
      throw new Error("OpenRouter API key missing");
    }

    let attempts = 0;
    let lastError: any;

    while (attempts < this.keys.length) {
      try {
        const modelToUse = request.openRouterModel || runtimeOpenRouterModel;

        const messages = [
          {
            role: "system",
            content:
              "You are a strict JSON generator. Respond with VALID JSON only. Do not include markdown or commentary.",
          },
          {
            role: "user",
            content: `${request.prompt}
${
  request.schema
    ? `Return JSON that matches this schema (best effort): ${JSON.stringify(
        request.schema
      )}`
    : "Return a compact JSON answer."
}`,
          },
        ];

        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.currentKey()}`,
          },
          body: JSON.stringify({
            model: modelToUse,
            messages,
            response_format: { type: "json_object" },
            max_tokens: 6000,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(
            `OpenRouter error ${response.status}: ${response.statusText}. Body: ${body}`
          );
        }

        const data = await response.json();
        const content =
          data?.choices?.[0]?.message?.content?.trim() ||
          data?.choices?.[0]?.message?.content ||
          "";

        if (!content) {
          throw new Error("Empty response from OpenRouter");
        }
        return content;
      } catch (error: any) {
        lastError = error;
        const failover = isQuotaLikeError(error);
        console.warn(
          `[OpenRouter] key index ${this.keyIndex} failed: ${error?.message || error}`
        );
        if (failover && this.keys.length > 1) {
          this.rotateKey();
          attempts++;
          console.info(
            `[OpenRouter] switching to fallback key (${attempts}/${this.keys.length})`
          );
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error("All OpenRouter keys exhausted.");
  };
}

const buildProviderChain = (): LLMProvider[] => {
  const providers: LLMProvider[] = [];
  const order = PROVIDER_ORDER.length ? PROVIDER_ORDER : ["gemini", "openrouter"];

  order.forEach((entry) => {
    if (entry === "gemini") {
      const gemini = new GeminiProvider(GEMINI_KEYS);
      if (gemini.isAvailable()) providers.push(gemini);
    }
    if (entry === "openrouter") {
      const openrouter = new OpenRouterProvider(OPENROUTER_KEYS);
      if (openrouter.isAvailable()) providers.push(openrouter);
    }
  });

  // Fallback order if env order misconfigured
  if (providers.length === 0) {
    const gemini = new GeminiProvider(GEMINI_KEYS);
    if (gemini.isAvailable()) providers.push(gemini);
    const openrouter = new OpenRouterProvider(OPENROUTER_KEYS);
    if (openrouter.isAvailable()) providers.push(openrouter);
  }

  return providers;
};

const generateContentWithFallback = async (request: LLMRequest): Promise<string> => {
  const providers = buildProviderChain();
  if (providers.length === 0) {
    throw new Error(
      "No LLM providers configured. Please set GEMINI_API_KEYS or OPENROUTER_API_KEY."
    );
  }

  let lastError: any;
  const traces: string[] = [];
  for (const provider of providers) {
    try {
      const text = await provider.generate(request);
      if (!text) throw new Error(`${provider.name} returned empty response`);
      return text;
    } catch (error) {
      lastError = error;
      const msg =
        typeof error?.message === "string"
          ? error.message
          : JSON.stringify(error);
      traces.push(`${provider.name}: ${msg}`);
      console.warn(`[LLM Router] ${provider.name} failed:`, error);
    }
  }
  const traceMsg = traces.length ? ` Chain: ${traces.join(" | ")}` : "";
  throw lastError || new Error("All providers failed." + traceMsg);
};

const parseJsonSafe = <T = any>(text: string, label: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    const cleaned = (text || '').replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    if (cleaned) {
      try { return JSON.parse(cleaned) as T; }
      catch { /* fall through */ }
    }
    console.error(`[${label}] JSON parse failed: ${(text || '').slice(0, 200)}`);
    throw new Error(`Failed to parse ${label} response`);
  }
};

const buildStructuredPrompt = (opts: { role: string; context: string; task: string; constraints: string[] }): string => {
  return `${opts.role}

Context / Document:
${opts.context.substring(0, 300000)}

Task:
${opts.task}

Constraints:
${opts.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Respond with valid JSON only, no markdown wrapping.`;
};

// Check Relevance (Smart Filter)
export const checkRelevance = async (docContent: string, objective: string, language: Language): Promise<{ isRelevant: boolean; reason: string }> => {
    const snippet = docContent.substring(0, 5000);
    // Keep UI language for the "Reason" because it is displayed in the Document List UI
    const langInstruction = language === 'vi' ? "Vietnamese" : "English";

    const prompt = `
        I have a research/investigation objective: "${objective}".
        
        Please check if the following document content is relevant to this objective.
        If the document is completely unrelated, return false.
        If it is related or potentially useful, return true.
        
        Provide a short reason (1 sentence) in ${langInstruction}.

        Document Snippet:
        ${snippet}
    `;

    const schema: JsonSchema = {
        type: Type.OBJECT,
        properties: {
            isRelevant: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
        },
        required: ["isRelevant", "reason"]
    };

    try {
        const text = await generateContentWithFallback({
          model: 'gemini-2.5-flash',
          prompt,
          schema,
          mimeType: "application/json",
        });
        
        if (!text) return { isRelevant: true, reason: "AI Check Failed, defaulting to relevant." };
        return JSON.parse(text);
    } catch (error) {
        console.error("Relevance check failed", error);
        return { isRelevant: true, reason: "Error during check, defaulting to relevant." };
    }
};

// --- ACADEMIC ANALYSIS ---

const evidenceSchema: JsonSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      claim: { type: Type.STRING },
      source: { type: Type.STRING, description: 'Section, page, table, or figure identifier. Never invent one.' },
    },
    required: ['claim', 'source'],
  },
};

const assessmentProperties = {
  assessment: { type: Type.STRING },
  evidence: evidenceSchema,
};

const academicSchema: JsonSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['ACADEMIC'] },
    schema_version: { type: Type.NUMBER },
    title: { type: Type.STRING },
    authors: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of authors. IMPORTANT: Convert UPPERCASE names to Title Case (e.g. 'Somdeth KEOVONGSACK' -> 'Somdeth Keovongsack')."
    },
    publication_year: { type: Type.STRING },
    citation_apa: { type: Type.STRING },
    doi: { type: Type.STRING },
    analysis_language: { type: Type.STRING },
    extraction_limitations: { type: Type.STRING },
    step1_overview: {
      type: Type.OBJECT,
      properties: {
        ...assessmentProperties,
        study_type: { type: Type.STRING },
        research_design: { type: Type.STRING },
        country: { type: Type.STRING },
        study_location: { type: Type.STRING },
        study_setting: { type: Type.STRING },
        population: { type: Type.STRING },
        headline_findings: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['assessment', 'evidence', 'study_type', 'research_design', 'country', 'study_location', 'study_setting', 'population', 'headline_findings'],
    },
    step2_research_question: {
      type: Type.OBJECT,
      properties: {
        ...assessmentProperties,
        research_question: { type: Type.STRING },
        hypothesis: { type: Type.STRING },
        question_status: { type: Type.STRING, enum: ['EXPLICIT', 'INFERRED', 'NOT_REPORTED'] },
      },
      required: ['assessment', 'evidence', 'research_question', 'hypothesis', 'question_status'],
    },
    step3_knowledge_gap: {
      type: Type.OBJECT,
      properties: {
        ...assessmentProperties,
        known_knowledge: { type: Type.STRING },
        unknown_knowledge: { type: Type.STRING },
        importance: { type: Type.STRING },
        theoretical_framework: { type: Type.STRING },
        conceptual_framework: { type: Type.STRING },
      },
      required: ['assessment', 'evidence', 'known_knowledge', 'unknown_knowledge', 'importance', 'theoretical_framework', 'conceptual_framework'],
    },
    step4_method_evaluation: {
      type: Type.OBJECT,
      properties: {
        ...assessmentProperties,
        sample_size: { type: Type.STRING },
        sample_characteristics: { type: Type.STRING },
        sampling_method: { type: Type.STRING },
        intervention: { type: Type.STRING },
        exposure: { type: Type.STRING },
        comparator: { type: Type.STRING },
        independent_variables: { type: Type.ARRAY, items: { type: Type.STRING } },
        dependent_variables: { type: Type.ARRAY, items: { type: Type.STRING } },
        mediators: { type: Type.ARRAY, items: { type: Type.STRING } },
        moderators: { type: Type.ARRAY, items: { type: Type.STRING } },
        data_collection: { type: Type.STRING },
        data_analysis_method: { type: Type.STRING },
        statistical_techniques: { type: Type.STRING },
        design_fit: { type: Type.STRING },
        sample_size_appraisal: { type: Type.STRING },
        statistical_power_appraisal: { type: Type.STRING },
        control_group_appraisal: { type: Type.STRING },
        selection_bias: { type: Type.STRING },
        measurement_bias: { type: Type.STRING },
        other_bias: { type: Type.STRING },
        raw_data_availability: { type: Type.STRING },
        analysis_code_availability: { type: Type.STRING },
        reproducibility_appraisal: { type: Type.STRING },
      },
      required: ['assessment', 'evidence', 'sample_size', 'sample_characteristics', 'sampling_method', 'intervention', 'exposure', 'comparator', 'independent_variables', 'dependent_variables', 'mediators', 'moderators', 'data_collection', 'data_analysis_method', 'statistical_techniques', 'design_fit', 'sample_size_appraisal', 'statistical_power_appraisal', 'control_group_appraisal', 'selection_bias', 'measurement_bias', 'other_bias', 'raw_data_availability', 'analysis_code_availability', 'reproducibility_appraisal'],
    },
    step5_independent_conclusion: {
      type: Type.OBJECT,
      properties: {
        ...assessmentProperties,
        key_findings: { type: Type.ARRAY, items: { type: Type.STRING } },
        effect_size: { type: Type.STRING },
        confidence_interval: { type: Type.STRING },
        p_value: { type: Type.STRING },
        other_uncertainty: { type: Type.STRING },
        practical_significance: { type: Type.STRING },
        independent_conclusion: { type: Type.STRING },
      },
      required: ['assessment', 'evidence', 'key_findings', 'effect_size', 'confidence_interval', 'p_value', 'other_uncertainty', 'practical_significance', 'independent_conclusion'],
    },
    step6_author_comparison: {
      type: Type.OBJECT,
      properties: {
        ...assessmentProperties,
        author_conclusion: { type: Type.STRING },
        agreement: { type: Type.STRING },
        disagreement: { type: Type.STRING },
        overclaiming: { type: Type.STRING },
        generalization_beyond_sample: { type: Type.STRING },
        causal_overreach: { type: Type.STRING },
      },
      required: ['assessment', 'evidence', 'author_conclusion', 'agreement', 'disagreement', 'overclaiming', 'generalization_beyond_sample', 'causal_overreach'],
    },
    step7_alternatives_and_confounders: {
      type: Type.OBJECT,
      properties: {
        ...assessmentProperties,
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        limitations: { type: Type.ARRAY, items: { type: Type.STRING } },
        confounders: { type: Type.ARRAY, items: { type: Type.STRING } },
        alternative_explanations: { type: Type.ARRAY, items: { type: Type.STRING } },
        funding_source: { type: Type.STRING },
        conflicts_of_interest: { type: Type.STRING },
        final_verdict: { type: Type.STRING },
        evidence_strength: { type: Type.STRING, enum: ['STRONG', 'MODERATE', 'LIMITED', 'VERY_LIMITED', 'NOT_ENOUGH_INFORMATION'] },
        evidence_strength_rationale: { type: Type.STRING },
      },
      required: ['assessment', 'evidence', 'strengths', 'limitations', 'confounders', 'alternative_explanations', 'funding_source', 'conflicts_of_interest', 'final_verdict', 'evidence_strength', 'evidence_strength_rationale'],
    },
    synthesis: {
      type: Type.OBJECT,
      properties: {
        contribution_to_field: { type: Type.STRING },
        theoretical_implications: { type: Type.STRING },
        practical_implications: { type: Type.STRING },
        future_research: { type: Type.STRING },
        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        themes: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['contribution_to_field', 'theoretical_implications', 'practical_implications', 'future_research', 'keywords', 'themes'],
    },
    keywords: {
        type: Type.OBJECT,
        properties: {
            vi: { type: Type.ARRAY, items: { type: Type.STRING }},
            en: { type: Type.ARRAY, items: { type: Type.STRING }}
        },
        required: ["vi", "en"]
    }
  },
  required: ['title', 'authors', 'publication_year', 'citation_apa', 'analysis_language', 'extraction_limitations', 'step1_overview', 'step2_research_question', 'step3_knowledge_gap', 'step4_method_evaluation', 'step5_independent_conclusion', 'step6_author_comparison', 'step7_alternatives_and_confounders', 'synthesis', 'keywords'],
};

export const analyzeDocument = async (docContent: string, language: Language): Promise<AnalysisResult> => {
  if (!docContent) throw new Error("No content to analyze");

  // Removed hardcoded langInstruction based on UI. Now using dynamic detection.
  const prompt = `
    You are an expert critical reviewer. Analyze the scientific paper using the exact seven-step workflow below.
    
    **CRITICAL OUTPUT RULES**:
    1. **LANGUAGE**: DETECT the primary language of the provided document content. You MUST write the analysis results (thesis, methodology, conclusion, etc.) in that **EXACT SAME LANGUAGE**. Do NOT translate unless the document uses mixed languages (then use the dominant one).
    2. **NAME FORMATTING**: Fix capitalization for author names using Title Case.
    3. **EVIDENCE DISCIPLINE**: Base every claim only on this document. Each evidence item has a claim and a real source location (section, page, table, or figure). Never invent source locations, missing values, figures, sample sizes, p-values, data/code availability, limitations, funding, or conflicts of interest. Explicitly say "Not reported in the document" in the document language when information is absent.
    4. **CRITICAL INDEPENDENCE**: Separate what the authors report from your own assessment. Do not treat author assertions as evidence.

    Follow this order:
    PHASE 1 - OVERALL ASSESSMENT
    Step 1: From the abstract, figures and tables, identify study type, scope, population/context, main methods, and headline findings. If extracted text does not contain usable figures/tables, state that limitation.
    Step 2: Identify the single core research question or hypothesis, preferably from the end of the Introduction. Distinguish an explicit question from one you inferred.
    Step 3: Explain what was already known, what remained unknown, and why that knowledge gap matters.

    PHASE 2 - QUESTIONING
    Step 4: Evaluate whether the design answers the question. Assess model/design fit, sample size and statistical power, controls/comparators, selection/measurement bias, statistical methods, raw-data/code availability, and reproducibility. Mark non-applicable criteria explicitly.
    Step 5: Before considering the authors' Discussion/Conclusion, independently infer what the Results, figures, and tables support. Include effect sizes, uncertainty, confidence intervals and p-values only when reported. Distinguish statistical from practical significance and correlation from causation.

    PHASE 3 - VERDICT
    Step 6: State the authors' conclusion, compare it with Step 5, and identify supported claims, discrepancies, causal overreach, generalization beyond the sample, or other overclaiming.
    Step 7: Assess strengths, acknowledged and unacknowledged limitations, plausible confounders, alternative explanations, funding, conflicts of interest, and give a calibrated final verdict. Use exactly one evidence-strength code: STRONG, MODERATE, LIMITED, VERY_LIMITED, or NOT_ENOUGH_INFORMATION. This is a single-study appraisal, not GRADE.

    AFTER STEP 7: Populate synthesis only after the verdict. Keep keywords and themes separate, and theoretical and practical implications separate.

    Keep assessments specific and concise (normally <= 120 words per narrative field). Return schema_version 2 and all fields in the matching JSON structure.
    
    Document Content:
    ${docContent.substring(0, 300000)}
  `;

  try {
    const text = await generateContentWithFallback({
      model: 'gemini-2.5-flash',
      prompt,
      schema: academicSchema,
      mimeType: "application/json",
    });

    if (!text) throw new Error("Empty response from providers");
    return normalizeAcademicAnalysis(JSON.parse(text), language);
  } catch (error) {
    console.error("Academic Analysis failed", error);
    throw error;
  }
};

// --- POLICY / NEWS ANALYSIS ---

const policySchema: JsonSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['POLICY'] },
    title: { type: Type.STRING },
    source_date: { type: Type.STRING, description: "Organization, Newspaper name, Date of issue, or Date of event." },
    document_category: { type: Type.STRING, description: "e.g., Law, Decree, News Report, Op-Ed, Circular" },
    main_subject: { type: Type.STRING, description: "The core topic or issue discussed." },
    key_stakeholders: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "Organizations, People, or Groups involved. IMPORTANT: Convert UPPERCASE names to Title Case (e.g. 'Nguyen Van A' not 'NGUYEN VAN A')." 
    },
    legal_basis: { type: Type.STRING, description: "Specific Laws, Articles, Clauses mentioned." },
    key_points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Summary of main content in bullet points." },
    implications_impact: { type: Type.STRING, description: "Impact on society, economy, politics, or specific groups." },
    controversies_criticism: { type: Type.STRING, description: "Any mentioned debates, opposing views, or limitations." },
    conclusion_summary: { type: Type.STRING },
    keywords: {
        type: Type.OBJECT,
        properties: {
            vi: { type: Type.ARRAY, items: { type: Type.STRING }},
            en: { type: Type.ARRAY, items: { type: Type.STRING }}
        },
        required: ["vi", "en"]
    }
  },
  required: ["title", "source_date", "document_category", "main_subject", "key_stakeholders", "legal_basis", "key_points", "implications_impact", "conclusion_summary"]
};

export const analyzePolicyDocument = async (docContent: string, language: Language): Promise<PolicyAnalysisResult> => {
  if (!docContent) throw new Error("No content to analyze");

  // Removed hardcoded langInstruction based on UI. Now using dynamic detection.
  const prompt = `
    You are an expert Policy Analyst and News Aggregator. Analyze the following document.

    **CRITICAL OUTPUT RULES**:
    1. **LANGUAGE**: DETECT the primary language of the provided document content. You MUST write the analysis results in that **EXACT SAME LANGUAGE**.
    2. **NAME FORMATTING**: Fix capitalization for all names (Stakeholders, People). Use Title Case (e.g., "Sypha Chanthavong"), NEVER use full UPPERCASE for surnames (e.g., NOT "Sypha CHANTHAVONG").

    Focus on:
    1. Identifying the type of document (Law vs News).
    2. Who are the stakeholders?
    3. What are the specific legal grounds (Articles, Clauses)?
    4. What are the social/economic implications?

    Document Content:
    ${docContent.substring(0, 300000)}
  `;

  try {
    const text = await generateContentWithFallback({
      model: 'gemini-2.5-flash',
      prompt,
      schema: policySchema,
      mimeType: "application/json",
    });

    if (!text) throw new Error("Empty response from providers");
    const result = JSON.parse(text);
    result.type = 'POLICY'; // Ensure type is set
    return result as PolicyAnalysisResult;
  } catch (error) {
    console.error("Policy Analysis failed", error);
    throw error;
  }
};

// --- BIBLIOMETRIC (Kept generic, works for both if title/keywords exist) ---
export const runBibliometricAnalysis = async (docs: Document[], objective: string, language: Language): Promise<BibliometricData> => {
  const summaries = docs.filter(d => d.status === 'SUCCESS' && d.analysis).map(d => {
    // Adapter for mixed types
    const analysis = d.analysis as any; 
    return {
        title: analysis.title,
        methodology: analysis.step4_method_evaluation?.assessment || analysis.methodology || analysis.document_category || "N/A",
        keyFinding: analysis.step5_independent_conclusion?.independent_conclusion || analysis.results_interpretation || analysis.conclusion_summary || "N/A",
        year: analysis.citation_apa?.match(/\((19|20)\d{2}\)/)?.[0] || analysis.source_date || "Unknown",
        keywords: analysis.keywords?.en?.join(", ") || ""
    };
  });

  // For bibliometric analysis (Aggregate view), we stick to the UI Language preference 
  // because it summarizes multiple documents which might have different languages.
  const langInstruction = language === 'vi' ? "VIETNAMESE (Tiếng Việt)" : "ENGLISH";

  const prompt = `
    Perform a bibliometric/meta-analysis on these ${summaries.length} documents based on the objective: "${objective}".
    **OUTPUT LANGUAGE**: ${langInstruction}.
    
    Note: Some documents might be Policy/News, not just Academic papers. Adapt the analysis accordingly.

    Documents Summary:
    ${JSON.stringify(summaries)}

    Return JSON matching the schema.
  `;

  // Reuse existing schema
  const schema: JsonSchema = {
    type: Type.OBJECT,
    properties: {
      topicDistribution: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, count: { type: Type.NUMBER } }, required: ["name", "count"] } },
      methodologyDistribution: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, count: { type: Type.NUMBER } }, required: ["name", "count"] } },
      summaryTable: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, year: { type: Type.STRING }, keyFinding: { type: Type.STRING } }, required: ["title", "year", "keyFinding"] } },
      knowledgeGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
      overallAnalysis: { type: Type.STRING }
    },
    required: ["topicDistribution", "methodologyDistribution", "summaryTable", "knowledgeGaps", "overallAnalysis"]
  };

  try {
    const text = await generateContentWithFallback({
      model: 'gemini-2.5-flash',
      prompt,
      schema,
      mimeType: "application/json",
    });
    if (!text) throw new Error("No data");
    return JSON.parse(text) as BibliometricData;
  } catch (error) {
    console.error("Bibliometric analysis failed", error);
    throw error;
  }
};

// Synthesis Matrix (Generic)
export const generateMatrixData = async (docs: Document[], columns: SynthesisMatrixColumn[], language: Language): Promise<SynthesisRow[]> => {
    const analyzedDocs = docs.filter(d => d.status === 'SUCCESS' && d.analysis);
    const inputs = analyzedDocs.map(d => ({
        id: d.id,
        title: d.analysis?.title,
        content_summary: JSON.stringify(d.analysis),
        source_content: d.content.substring(0, 120000),
    }));
    // For Matrix (Aggregate view), stick to UI Language
    const langInstruction = language === 'vi' ? "VIETNAMESE (Tiếng Việt)" : "ENGLISH";
    const prompt = `
        Fill ONLY the requested custom literature-matrix columns from the source content. Output Language: ${langInstruction}.
        Columns: ${columns.map(c => c.header).join(', ')}.
        Never invent missing information; explicitly state that it is not reported.
        Inputs: ${JSON.stringify(inputs)}
    `;
    const schema: JsonSchema = {
      type: Type.OBJECT,
      properties: {
        rows: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
                docId: { type: Type.STRING },
                docTitle: { type: Type.STRING },
                ...columns.reduce((acc, col) => ({ ...acc, [col.id]: { type: Type.STRING } }), {})
            },
            required: ["docId", "docTitle", ...columns.map(c => c.id)]
          }
        }
      },
      required: ['rows'],
    };
    try {
        const text = await generateContentWithFallback({
          model: 'gemini-2.5-flash',
          prompt,
          schema,
          mimeType: "application/json",
        });
        if(!text) throw new Error("No matrix data");
        const parsed = JSON.parse(text);
        return Array.isArray(parsed.rows) ? parsed.rows as SynthesisRow[] : [];
    } catch (error) { throw error; }
}

export const classifyDocument = async (doc: any, folders: ResearchFolder[], language: Language): Promise<string[]> => {
    if (folders.length === 0) return [];
    const prompt = `
      Document: "${doc.title}". Summary: ${doc.step1_overview?.assessment || doc.thesis_background || doc.main_subject}. Keywords: ${doc.keywords?.en?.join(', ') || ''}.
      Folders: ${JSON.stringify(folders.map(f => ({ id: f.id, name: f.name, description: f.description })))}
      Task: Match document to folders. Return JSON { folderIds: [] }.
    `;
    const schema: JsonSchema = { type: Type.OBJECT, properties: { folderIds: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["folderIds"] };
    try {
        const text = await generateContentWithFallback({
          model: 'gemini-2.5-flash',
          prompt,
          schema,
          mimeType: "application/json",
        });
        if (!text) return [];
        return JSON.parse(text).folderIds || [];
    } catch (error) { return []; }
}
