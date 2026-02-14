
$path = 'services/geminiService.ts'
$lines = [System.Collections.ArrayList](Get-Content $path)
$start = $lines.IndexOf('async function generateWithRetry(')
$end = $lines.IndexOf('// Check Relevance (Smart Filter)')
$lines.RemoveRange($start, $end - $start)
$new = @(
"async function generateWithRetry(",
"  modelName: string, ",
"  params: any, ",
"  maxRetries: number = 6",
" ): Promise<any> {",
"  if (providerOrder.length === 0) {",
"    throw new Error(\"No AI provider configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY + OPENROUTER_MODEL.\"),"
"  }",
"",
"  let lastError: any;",
"  const prompt = typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents);",
"",
"  // Closed-loop: always alternate providers after every failure (Gemini -> OpenRouter -> Gemini ...)",
"  let providerIndex = 0;",
"",
