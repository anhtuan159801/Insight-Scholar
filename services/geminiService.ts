
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, PolicyAnalysisResult, BibliometricData, Document, SynthesisMatrixColumn, SynthesisRow, Language, ResearchFolder } from '../types';

type LLMRequest = {
  model: string;
  prompt: string;
  schema?: Schema;
  mimeType?: string;
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

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct";
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
  private model: string;
  private baseUrl = "https://openrouter.ai/api/v1/chat/completions";

  constructor(keys: string[], model: string) {
    this.keys = keys;
    this.model = model;
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
            model: this.model,
            messages,
            response_format: { type: "json_object" },
            max_tokens: 2048,
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
      const openrouter = new OpenRouterProvider(OPENROUTER_KEYS, OPENROUTER_MODEL);
      if (openrouter.isAvailable()) providers.push(openrouter);
    }
  });

  // Fallback order if env order misconfigured
  if (providers.length === 0) {
    const gemini = new GeminiProvider(GEMINI_KEYS);
    if (gemini.isAvailable()) providers.push(gemini);
    const openrouter = new OpenRouterProvider(OPENROUTER_KEYS, OPENROUTER_MODEL);
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

    const schema: Schema = {
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

const academicSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['ACADEMIC'] },
    title: { type: Type.STRING },
    authors: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of authors. IMPORTANT: Convert UPPERCASE names to Title Case (e.g. 'Somdeth KEOVONGSACK' -> 'Somdeth Keovongsack')."
    },
    citation_apa: { type: Type.STRING },
    doi: { type: Type.STRING },
    thesis_background: { type: Type.STRING },
    theoretical_framework: { type: Type.STRING },
    conceptual_framework: { type: Type.STRING },
    definitions_variables: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
          quote: { type: Type.STRING }
        },
        required: ["term", "definition"]
      }
    },
    methodology: { type: Type.STRING },
    results_interpretation: { type: Type.STRING },
    scope_limitations: { type: Type.STRING },
    structure_presentation: { type: Type.STRING },
    contributions_future_research: { type: Type.STRING },
    overall_conclusion: { type: Type.STRING },
    keywords: {
        type: Type.OBJECT,
        properties: {
            vi: { type: Type.ARRAY, items: { type: Type.STRING }},
            en: { type: Type.ARRAY, items: { type: Type.STRING }}
        },
        required: ["vi", "en"]
    }
  },
  required: ["title", "authors", "citation_apa", "theoretical_framework", "conceptual_framework", "definitions_variables", "methodology", "results_interpretation", "overall_conclusion", "keywords"]
};

export const analyzeDocument = async (docContent: string, language: Language): Promise<AnalysisResult> => {
  if (!docContent) throw new Error("No content to analyze");

  // Removed hardcoded langInstruction based on UI. Now using dynamic detection.
  const prompt = `
    You are an expert academic researcher (Insight Scholar). Analyze the following scientific text thoroughly.
    
    **CRITICAL OUTPUT RULES**:
    1. **LANGUAGE**: DETECT the primary language of the provided document content. You MUST write the analysis results (thesis, methodology, conclusion, etc.) in that **EXACT SAME LANGUAGE**. Do NOT translate unless the document uses mixed languages (then use the dominant one).
    2. **NAME FORMATTING**: Fix capitalization for all author names. Use Title Case (e.g., "Somdeth Keovongsack"), NEVER use full UPPERCASE for surnames (e.g., NOT "Somdeth KEOVONGSACK").
    
    Ensure specific data extraction (p-values, stats) and strict distinction between Theoretical & Conceptual frameworks.
    
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
    const result = JSON.parse(text);
    result.type = 'ACADEMIC'; // Ensure type is set
    return result as AnalysisResult;
  } catch (error) {
    console.error("Academic Analysis failed", error);
    throw error;
  }
};

// --- POLICY / NEWS ANALYSIS ---

const policySchema: Schema = {
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
        methodology: analysis.methodology || analysis.document_category || "N/A", // Fallback for policy
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
  const schema: Schema = {
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
        content_summary: JSON.stringify(d.analysis)
    }));
    // For Matrix (Aggregate view), stick to UI Language
    const langInstruction = language === 'vi' ? "VIETNAMESE (Tiếng Việt)" : "ENGLISH";
    const prompt = `
        Create a Synthesis Matrix. Output Language: ${langInstruction}.
        Columns: ${columns.map(c => c.header).join(', ')}.
        Inputs: ${JSON.stringify(inputs)}
    `;
    const schema: Schema = {
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
    };
    try {
        const text = await generateContentWithFallback({
          model: 'gemini-2.5-flash',
          prompt,
          schema,
          mimeType: "application/json",
        });
        if(!text) throw new Error("No matrix data");
        return JSON.parse(text) as SynthesisRow[];
    } catch (error) { throw error; }
}

export const classifyDocument = async (doc: any, folders: ResearchFolder[], language: Language): Promise<string[]> => {
    if (folders.length === 0) return [];
    const prompt = `
      Document: "${doc.title}". Summary: ${doc.thesis_background || doc.main_subject}. Keywords: ${doc.keywords.en.join(', ')}.
      Folders: ${JSON.stringify(folders.map(f => ({ id: f.id, name: f.name, description: f.description })))}
      Task: Match document to folders. Return JSON { folderIds: [] }.
    `;
    const schema: Schema = { type: Type.OBJECT, properties: { folderIds: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["folderIds"] };
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
