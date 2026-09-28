import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';
import { GEMINI_MODEL_CHAIN, GEMINI_SEARCH_MIN_CHARS } from '../config/constants';

dotenv.config();

const getApiKeys = (): string[] => {
  const raw = process.env.GEMINI_API_KEY || '';
  return raw.split(',').map(k => k.trim()).filter(k => k && k !== 'your_gemini_or_openai_key' && !k.startsWith('your_'));
};

const PRIMARY_MODEL = GEMINI_MODEL_CHAIN[0];

const isRealApiConfigured = (): boolean => {
  return getApiKeys().length > 0;
};

export interface SynthesizedArticle {
  headline: string;
  summary: string;
  content: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  categories: string[];
}

export interface SynthesisResult extends SynthesizedArticle {
  modelUsed?: string;
}

const RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    headline: {
      type: 'string' as const,
      description: 'AI-generated catchy headline under 10 words.',
    },
    summary: {
      type: 'string' as const,
      description: 'AI-generated 3-sentence objective summary of the article, enriched with verified facts.',
    },
    content: {
      type: 'string' as const,
      description:
        'AI-generated news article of 2 to 3 paragraphs with substantive detail (context, key facts, implications), journalistic style, separated by double newlines (\\n\\n).',
    },
    sentiment: {
      type: 'string' as const,
      enum: ['Positive', 'Negative', 'Neutral'],
    },
    categories: {
      type: 'array' as const,
      items: {
        type: 'string' as const,
        enum: ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance'],
      },
      description: 'Array of categories applicable to the article content.',
    },
  },
  required: ['headline', 'summary', 'content', 'sentiment', 'categories'],
};

const SYSTEM_PROMPT_BASE = `You are a professional journalist and AI news assistant for "Daily News Insights (DNI)", an autonomous self-updating news platform.
Your task is to analyze the provided scraped article text and output a JSON object.`;

const SEARCH_INSTRUCTIONS = `Use the Google Search tool to:
1. Verify the facts in the article to ensure only confirmed details are included.
2. Search Google to retrieve additional relevant details, context, and background information.
3. If the input text is short or is a fallback description, query Google Search for the full story.`;

const OUTPUT_INSTRUCTIONS = `Output a JSON object containing:
1. "headline": A catchy headline summarizing the news in under 10 words.
2. "summary": Exactly 3 concise, objective sentences with verified details (for homepage cards).
3. "content": A clear news article of 2 to 3 paragraphs with meaningful depth — key facts, context, and why it matters. Use double newlines (\\n\\n) between paragraphs. No markdown.
4. "sentiment": "Positive", "Negative", or "Neutral".
5. "categories": Select only from: "Tech", "Business", "Science", "Health", "Entertainment", "Finance".`;

const PROMPT_JSON_SUFFIX =
  '\n\nReturn ONLY valid JSON matching the schema above. No markdown fences, no commentary.';

type ModelStrategy = {
  useSearch: boolean;
  useStructuredOutput: boolean;
  label: string;
};

function strategiesForModel(modelName: string, useSearch: boolean): ModelStrategy[] {
  if (modelName === PRIMARY_MODEL && useSearch) {
    return [{ useSearch: true, useStructuredOutput: true, label: 'structured+json+search' }];
  }
  return [{ useSearch: false, useStructuredOutput: true, label: 'structured-json' }];
}

function buildSystemPrompt(strategy: ModelStrategy): string {
  const parts = [SYSTEM_PROMPT_BASE];
  if (strategy.useSearch) parts.push(SEARCH_INSTRUCTIONS);
  parts.push(OUTPUT_INSTRUCTIONS);
  if (!strategy.useStructuredOutput) parts.push(PROMPT_JSON_SUFFIX);
  return parts.join('\n');
}

function isRateLimitError(err: unknown): boolean {
  const message = (err as { message?: string })?.message?.toLowerCase() ?? '';
  const status = (err as { status?: number })?.status;
  return (
    status === 429 ||
    message.includes('429') ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  );
}

function buildModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  strategy: ModelStrategy
): GenerativeModel {
  const config: Parameters<GoogleGenerativeAI['getGenerativeModel']>[0] = {
    model: modelName,
  };

  if (strategy.useSearch) {
    config.tools = [{ googleSearch: {} } as any];
  }

  if (strategy.useStructuredOutput) {
    config.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA as any,
    };
  }

  return genAI.getGenerativeModel(config);
}

function parseJsonResponse(text: string): SynthesizedArticle {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());

    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Failed to parse JSON from Gemini response');
  }
}

function normalizeSynthesis(synthesized: SynthesizedArticle, title: string): SynthesizedArticle {
  return {
    headline: (synthesized.headline || title).substring(0, 100),
    summary: synthesized.summary || 'Summary could not be generated.',
    content: synthesized.content || synthesized.summary || '',
    sentiment: ['Positive', 'Negative', 'Neutral'].includes(synthesized.sentiment)
      ? synthesized.sentiment
      : 'Neutral',
    categories:
      Array.isArray(synthesized.categories) && synthesized.categories.length > 0
        ? synthesized.categories.filter((cat) =>
            ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance'].includes(cat)
          )
        : ['Tech'],
  };
}

/**
 * Synthesize article content using Gemini with model fallback on rate limits.
 * Google Search is used on the primary model only when scraped text is short.
 */
export async function synthesizeArticle(title: string, rawText: string): Promise<SynthesisResult> {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('[AIService] API key not configured.');
  }

  const userPrompt = `Title: ${title}\n\nContent:\n${rawText}`;
  const useSearch = rawText.trim().length < GEMINI_SEARCH_MIN_CHARS;

  console.log(
    `[AIService] Synthesizing article: "${title}" (search: ${useSearch ? 'yes' : 'no'}, ${rawText.length} chars)`
  );

  let lastError: unknown;

  for (let k = 0; k < apiKeys.length; k++) {
    const apiKey = apiKeys[k];
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log(`[AIService] Using API key index ${k} (${apiKey.slice(0, 8)}...${apiKey.slice(-4)})`);

    try {
      for (let i = 0; i < GEMINI_MODEL_CHAIN.length; i++) {
        const modelName = GEMINI_MODEL_CHAIN[i];
        const isLastModel = i === GEMINI_MODEL_CHAIN.length - 1;
        const strategies = strategiesForModel(modelName, useSearch);

        for (let j = 0; j < strategies.length; j++) {
          const strategy = strategies[j];
          const isLastStrategy = j === strategies.length - 1;

          try {
            console.log(`[AIService] Trying ${modelName} (${strategy.label})`);
            const model = buildModel(genAI, modelName, strategy);
            const systemPrompt = buildSystemPrompt(strategy);
            const result = await model.generateContent([{ text: systemPrompt }, { text: userPrompt }]);
            const responseText = result.response.text();
            const synthesized = parseJsonResponse(responseText);
            console.log(`[AIService] Success with ${modelName} (${strategy.label})`);
            return { ...normalizeSynthesis(synthesized, title), modelUsed: modelName };
          } catch (err) {
            lastError = err;

            // Check if error represents rate limit or access issues to trigger API key rollover
            const errMsg = (err as Error)?.message?.toLowerCase() || '';
            const errStatus = (err as any)?.status;
            const shouldSwitchKey = isRateLimitError(err) || 
                                    errStatus === 403 || 
                                    errStatus === 429 ||
                                    errMsg.includes('denied') || 
                                    errMsg.includes('forbidden') || 
                                    errMsg.includes('quota') ||
                                    errMsg.includes('resource_exhausted') ||
                                    errMsg.includes('limit');

            if (shouldSwitchKey && k < apiKeys.length - 1) {
              console.warn(`[AIService] API key issue detected on model ${modelName} (${errStatus || 'Error'}). Failing over to next API key.`);
              throw err; // throw to trigger outer catch and move to next key
            }

            if (isRateLimitError(err)) {
              console.warn(`[AIService] Rate limit on ${modelName}. Trying next model.`);
              break;
            }

            if (!isLastStrategy) {
              console.warn(
                `[AIService] ${modelName} (${strategy.label}) failed, trying alternate strategy:`,
                (err as Error)?.message?.slice(0, 100)
              );
              continue;
            }

            if (!isLastModel) {
              console.warn(`[AIService] ${modelName} exhausted. Trying next model.`);
              break;
            }

            console.error(`[AIService] Gemini synthesis failed on ${modelName} for "${title}":`, err);
            throw err;
          }
        }
      }
    } catch (keyErr) {
      if (k < apiKeys.length - 1) {
        console.warn(`[AIService] API key index ${k} failed. Swapping to next key...`);
        continue;
      }
      throw keyErr;
    }
  }

  throw lastError ?? new Error('All Gemini keys and models exhausted.');
}
