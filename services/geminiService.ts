
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, PolicyAnalysisResult, BibliometricData, Document, SynthesisMatrixColumn, SynthesisRow, Language, ResearchFolder } from '../types';

// --- Provider Configuration ---
const GEMINI_API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEYS: string[] = Object.entries(process.env)
  .filter(([key, value]) => Boolean(value) && (key === 'OPENROUTER_API_KEY' || key.startsWith('OPENROUTER_API_KEY_')))
  .sort(([a], [b]) => {
    if (a === 'OPENROUTER_API_KEY') return -1;
    if (b === 'OPENROUTER_API_KEY') return 1;
    const numA = parseInt(a.split('_').pop() || '0', 10);
    const numB = parseInt(b.split('_').pop() || '0', 10);
    return numA - numB;
  })
  .map(([, value]) => value as string);
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODELS: string[] = Object.entries(process.env)
  .filter(([key, value]) => Boolean(value) && (key === 'OPENROUTER_MODEL' || key.startsWith('OPENROUTER_MODEL_')))
  .sort(([a], [b]) => {
    // Ensure base key goes first, then numbered suffix ascending
    if (a === 'OPENROUTER_MODEL') return -1;
    if (b === 'OPENROUTER_MODEL') return 1;
    const numA = parseInt(a.split('_').pop() || '0', 10);
    const numB = parseInt(b.split('_').pop() || '0', 10);
    return numA - numB;
  })
  .map(([, value]) => value as string);

let OLLAMA_MODEL = process.env.OLLAMA_MODEL;
let OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api/chat';

const hasGemini = Boolean(GEMINI_API_KEY);
const hasOpenRouter = Boolean(OPENROUTER_API_KEYS.length > 0 && OPENROUTER_MODELS.length > 0);
const hasOllamaStatic = Boolean(OLLAMA_MODEL);
type Provider = 'gemini' | 'openrouter' | 'ollama';
const defaultProviderOrder: Provider[] = [
  ...(hasGemini ? ['gemini' as const] : []),
  ...(hasOpenRouter ? ['openrouter' as const] : []),
];
let preferredEngine: 'auto' | 'ollama' = 'auto';
export const setPreferredEngine = (engine: 'auto' | 'ollama') => { preferredEngine = engine; };
export const setOllamaConfig = (model?: string, baseUrl?: string) => {
  if (model) OLLAMA_MODEL = model;
  if (baseUrl) {
    const trimmed = baseUrl.trim().replace(/\/$/, '');
    OLLAMA_BASE_URL = trimmed.endsWith('/api/chat') ? trimmed : `${trimmed}/api/chat`;
  }
};

// Helper to get API Key safely (Gemini)
const getApiKey = (): string => {
  if (!GEMINI_API_KEY) {
    console.warn("Gemini API Key is missing. Please set process.env.GEMINI_API_KEY");
    return "";
  }
  return GEMINI_API_KEY;
};

// Instantiate Gemini only when needed
const ai = hasGemini ? new GoogleGenAI({ apiKey: getApiKey() }) : null;

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Convert Gemini Schema -> JSON Schema (best-effort) for OpenRouter
const mapType = (t?: Type) => {
  switch (t) {
    case Type.STRING: return "string";
    case Type.NUMBER: return "number";
    case Type.BOOLEAN: return "boolean";
    case Type.ARRAY: return "array";
    case Type.OBJECT: return "object";
    default: return "string";
  }
};

const toJsonSchema = (schema?: Schema): any => {
  if (!schema) return undefined;
  const base: any = { type: mapType(schema.type) };
  if ((schema as any).enum) base.enum = (schema as any).enum;
  if ((schema as any).description) base.description = (schema as any).description;
  if ((schema as any).properties) {
    base.properties = {};
    Object.entries((schema as any).properties).forEach(([key, value]) => {
      base.properties[key] = toJsonSchema(value as Schema);
    });
  }
  if ((schema as any).items) base.items = toJsonSchema((schema as any).items as Schema);
  if ((schema as any).required) base.required = (schema as any).required;
  return base;
};

// Extract text content from OpenRouter response
const extractTextFromOpenRouter = (data: any): string => {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((c: any) => {
      if (!c) return '';
      if (typeof c === 'string') return c;
      if (c.text) return c.text;
      if (c.type === 'text' && c.value) return c.value;
      if (c.type === 'output_text' && c.output_text) return c.output_text;
      return '';
    }).join('');
  }
  if (content?.text) return content.text;
  return '';
};

// OpenRouter caller (round-robin keys + models)
const callOpenRouter = async (model: string, prompt: string, schema?: Schema, keyIndex: number) => {
  if (!hasOpenRouter) {
    throw new Error("OpenRouter is not configured.");
  }

  const jsonSchema = schema ? toJsonSchema(schema) : undefined;
  const responseFormat = jsonSchema
    ? { type: "json_schema", json_schema: { name: "insight_schema", schema: jsonSchema } }
    : { type: "json_object" };

  const referer = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : "https://insight-scholar.local";

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEYS[keyIndex % OPENROUTER_API_KEYS.length]}`,
      "HTTP-Referer": referer,
      "X-Title": "Insight Scholar"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are Insight Scholar AI. Follow the requested JSON structure exactly when provided." },
        { role: "user", content: prompt }
      ],
      response_format: responseFormat,
      temperature: 0.2,
      max_tokens: 4096
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error(`OpenRouter error ${res.status}: ${errorText}`);
    (error as any).status = res.status;
    throw error;
  }

  const data = await res.json();
  return { text: extractTextFromOpenRouter(data) };
};

// Ollama caller
const callOllama = async (prompt: string, expectJson: boolean, schema?: Schema) => {
  if (!OLLAMA_MODEL || !OLLAMA_BASE_URL) throw new Error("Ollama is not configured.");

  const jsonSchema = schema ? toJsonSchema(schema) : undefined;
  const userPrompt = expectJson && jsonSchema
    ? `${prompt}\n\nReturn ONLY valid JSON matching this JSON Schema:\n${JSON.stringify(jsonSchema)}`
    : prompt;

  const systemContent = expectJson
    ? "You are Insight Scholar AI. Return ONLY valid JSON. No markdown, no commentary, no prose outside JSON."
    : "You are Insight Scholar AI.";

  const payload: any = {
    model: OLLAMA_MODEL,
    stream: false,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userPrompt }
    ],
    options: {
      temperature: expectJson ? 0 : 0.2
    }
  };

  // Ollama JSON mode helps prevent prose/thinking output.
  if (expectJson) {
    payload.format = jsonSchema || "json";
  }

  const res = await fetch(OLLAMA_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error(`Ollama error ${res.status}: ${errorText}`);
    (error as any).status = res.status;
    throw error;
  }

  const data = await res.json();
  const text = data?.message?.content || "";
  return { text };
};

// Normalize any input (File/Blob/object) -> string text for LLMs
const contentsToText = async (contents: any): Promise<string> => {
  if (typeof contents === 'string') return contents;

  // Browser File / Blob
  if (typeof File !== 'undefined' && contents instanceof File) {
    return await contents.text();
  }
  if (typeof Blob !== 'undefined' && contents instanceof Blob) {
    return await contents.text();
  }

  // Fallback: JSON stringify
  try {
    return JSON.stringify(contents);
  } catch {
    return String(contents ?? '');
  }
};

const extractJsonCandidate = (rawText: string): string => {
  if (!rawText) return rawText;

  // Remove common reasoning/thinking wrappers.
  let text = rawText
    .replace(/<think[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning[\s\S]*?<\/reasoning>/gi, '')
    .trim();

  // Prefer fenced JSON block when present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    text = fenced[1].trim();
  }

  // If already plain JSON, return directly.
  if (text.startsWith('{') || text.startsWith('[')) return text;

  // Otherwise scan for first balanced JSON object/array.
  const start = text.search(/[\[{]/);
  if (start === -1) return text;

  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') depth--;

    if (depth === 0) {
      end = i + 1;
      break;
    }
  }

  if (end !== -1) return text.slice(start, end).trim();
  return text;
};

const parseJsonSafe = <T = any>(rawText: string, context: string): T => {
  const candidate = extractJsonCandidate(rawText);
  try {
    return JSON.parse(candidate) as T;
  } catch (error) {
    throw new Error(`${context}: invalid JSON response. Raw head: ${rawText.slice(0, 120)}`);
  }
};

// Wrapper to handle API calls with retry logic for 429 errors
async function generateWithRetry(
  modelName: string, 
  params: any, 
  maxRetries: number = 6
): Promise<any> {
  const hasOllamaDynamic = Boolean(OLLAMA_MODEL);
  const providerOrder =
    preferredEngine === 'ollama'
      ? (hasOllamaDynamic ? (['ollama'] as Provider[]) : defaultProviderOrder)
      : defaultProviderOrder;

  if (providerOrder.length === 0) {
    throw new Error("No AI provider configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY + OPENROUTER_MODEL.");
  }

  let lastError: any;
  const prompt = await contentsToText(params.contents);

  // Closed-loop helper: keep cycling providers on every failure (Gemini → OpenRouter → Gemini → ...)
  let providerIndex = 0;
  const currentProvider = () => providerOrder[providerIndex];
  const switchProvider = () => {
    if (providerOrder.length > 1) {
      providerIndex = (providerIndex + 1) % providerOrder.length;
    }
  };
  // Round-robin OpenRouter models to dodge per-model rate limits
  let openRouterModelIndex = 0;
  const nextOpenRouterModel = () => {
    if (!OPENROUTER_MODELS.length) return '';
    const model = OPENROUTER_MODELS[openRouterModelIndex];
    openRouterModelIndex = (openRouterModelIndex + 1) % OPENROUTER_MODELS.length;
    return model;
  };
  // Round-robin OpenRouter API keys to spread quota
  let openRouterKeyIndex = 0;
  const nextOpenRouterKeyIndex = () => {
    if (!OPENROUTER_API_KEYS.length) return 0;
    const idx = openRouterKeyIndex;
    openRouterKeyIndex = (openRouterKeyIndex + 1) % OPENROUTER_API_KEYS.length;
    return idx;
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const provider = currentProvider();

    try {
      if (provider === 'openrouter') {
        const model = nextOpenRouterModel();
        if (!model) throw new Error("No OpenRouter models configured.");
        const keyIdx = nextOpenRouterKeyIndex();
        return await callOpenRouter(model, prompt, params.config?.responseSchema, keyIdx);
      }
      if (provider === 'ollama') {
        const expectJson = params?.config?.responseMimeType === "application/json" || Boolean(params?.config?.responseSchema);
        return await callOllama(prompt, expectJson, params?.config?.responseSchema);
      }
      return await ai!.models.generateContent({
        model: modelName,
        ...params
      });
    } catch (error: any) {
      lastError = error;
      
      const status = error.status || error.code || error?.response?.status;
      const message: string = error.message || "";
      const isQuota = status === 429 || (message && message.includes('429')) || (message && message.toLowerCase().includes('quota'));
      const isServer = status === 503 || status === 500;

      // Rotate provider on every error to form a closed failover loop
      switchProvider();

      if (attempt < maxRetries - 1) {
        const waitTime = (isQuota || isServer) ? 2000 * Math.pow(2, Math.min(attempt, 3)) : 500;
        console.warn(
          `API error via ${provider}. Switching provider to ${providerOrder[providerIndex]} and retrying in ${waitTime}ms (Attempt ${attempt + 1}/${maxRetries})...`,
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
        const response = await generateWithRetry('gemini-3-flash-preview', {
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        
        if (!response.text) return { isRelevant: true, reason: "AI Check Failed, defaulting to relevant." };
        return parseJsonSafe(response.text, "Relevance check");
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
  required: ["title", "authors", "citation_apa", "thesis_background", "theoretical_framework", "conceptual_framework", "definitions_variables", "methodology", "results_interpretation", "scope_limitations", "contributions_future_research", "overall_conclusion", "keywords"]
};

const isMissingText = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  if (!s) return true;
  const lower = s.toLowerCase();
  return lower === "undefined" || lower === "null" || lower === "n/a" || lower === "khong ro" || lower === "không rõ";
};

const fillAcademicMissingSections = async (docContent: string, draft: any): Promise<Partial<AnalysisResult>> => {
  const missingKeys = (["thesis_background", "scope_limitations", "contributions_future_research"] as const)
    .filter((k) => isMissingText(draft?.[k]));
  if (missingKeys.length === 0) return {};

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      thesis_background: { type: Type.STRING },
      scope_limitations: { type: Type.STRING },
      contributions_future_research: { type: Type.STRING }
    },
    required: missingKeys as unknown as string[]
  };

  const prompt = `
You are completing missing sections in an academic analysis JSON.
Return ONLY valid JSON.

Rules:
1) Fill ONLY these missing fields: ${missingKeys.join(', ')}.
2) Do not leave any requested field empty.
3) If the paper does not explicitly state it, infer cautiously from methods/results/objective in the text.
4) Keep each field concise but specific (2-4 sentences).
5) Use the same primary language as the document.

Current analysis draft:
${JSON.stringify(draft)}

Document content:
${docContent.substring(0, 120000)}
  `;

  const response = await generateWithRetry('gemini-3-flash-preview', {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  if (!response?.text) return {};
  return parseJsonSafe<Partial<AnalysisResult>>(response.text, "Academic missing sections");
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
    IMPORTANT: You must provide non-empty content for thesis_background, scope_limitations, and contributions_future_research.
    If not explicitly present, infer responsibly from context (method, results, objective) instead of leaving blank.
    
    Document Content:
    ${docContent.substring(0, 300000)}
  `;

  try {
    const response = await generateWithRetry('gemini-3-flash-preview', {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: academicSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    const result = parseJsonSafe<any>(text, "Academic analysis");
    const filled = await fillAcademicMissingSections(docContent, result);
    Object.assign(result, filled);
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
    const response = await generateWithRetry('gemini-3-flash-preview', {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: policySchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    const result = parseJsonSafe<any>(text, "Policy analysis");
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
    const response = await generateWithRetry('gemini-3-flash-preview', {
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema },
    });
    if (!response.text) throw new Error("No data");
    return parseJsonSafe<BibliometricData>(response.text, "Bibliometric analysis");
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
        const response = await generateWithRetry('gemini-3-flash-preview', {
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        if(!response.text) throw new Error("No matrix data");
        return parseJsonSafe<SynthesisRow[]>(response.text, "Synthesis matrix");
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
        const response = await generateWithRetry('gemini-3-flash-preview', { contents: prompt, config: { responseMimeType: "application/json", responseSchema: schema } });
        if (!response.text) return [];
        return parseJsonSafe<{ folderIds: string[] }>(response.text, "Document classification").folderIds || [];
    } catch (error) { return []; }
}

