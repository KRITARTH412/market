import OpenAI from 'openai';
import { CohereClient } from 'cohere-ai';

// Lazy-load the SambaNova client for chat completions
let sambanovaClient = null;

const getSambanovaClient = () => {
  if (!sambanovaClient) {
    if (!process.env.SAMBANOVA_API_KEY) {
      throw new Error('SAMBANOVA_API_KEY is not set in environment variables');
    }
    sambanovaClient = new OpenAI({
      apiKey: process.env.SAMBANOVA_API_KEY,
      baseURL: process.env.SAMBANOVA_BASE_URL || 'https://api.sambanova.ai/v1'
    });
  }
  return sambanovaClient;
};

// Lazy-load the Cohere client for embeddings
let cohereClient = null;

const getCohereClient = () => {
  if (!cohereClient) {
    if (!process.env.COHERE_API_KEY) {
      throw new Error('COHERE_API_KEY is not set in environment variables');
    }
    cohereClient = new CohereClient({
      token: process.env.COHERE_API_KEY
    });
  }
  return cohereClient;
};

// Generate embeddings (using Cohere)
export const generateEmbedding = async (text) => {
  try {
    const client = getCohereClient();
    const response = await client.embed({
      model: process.env.COHERE_EMBEDDING_MODEL || 'embed-english-v3.0',
      texts: [text],
      inputType: 'search_document'
    });

    return response.embeddings[0];
  } catch (error) {
    console.error('Cohere embedding error:', error);
    throw new Error('Failed to generate embedding');
  }
};

// Generate chat completion (using SambaNova)
export const generateChatCompletion = async (messages, stream = false) => {
  try {
    const client = getSambanovaClient();
    const response = await client.chat.completions.create({
      model: process.env.SAMBANOVA_CHAT_MODEL || 'DeepSeek-V3.1',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream
    });

    return response;
  } catch (error) {
    console.error('SambaNova chat completion error:', error);
    throw new Error('Failed to generate response');
  }
};

// Generate streaming chat completion
export const generateStreamingChatCompletion = async (messages) => {
  try {
    const client = getSambanovaClient();
    const stream = await client.chat.completions.create({
      model: process.env.SAMBANOVA_CHAT_MODEL || 'DeepSeek-V3.1',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true
    });

    return stream;
  } catch (error) {
    console.error('SambaNova streaming error:', error);
    throw new Error('Failed to generate streaming response');
  }
};

// Transcribe audio using Whisper (Note: SambaNova may not support this)
export const transcribeAudio = async (audioBuffer, filename) => {
  try {
    const client = getSambanovaClient();
    // Create a File-like object from buffer
    const file = new File([audioBuffer], filename, { type: 'audio/mpeg' });
    
    const response = await client.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en'
    });

    return response.text;
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
};

// Analyze legal document
export const analyzeLegalDocument = async (documentText) => {
  try {
    const client = getOpenAIClient();
    const prompt = `You are a legal document analyzer. Analyze the following document and identify potential risks.

Document:
${documentText}

Provide a JSON response with the following structure:
{
  "riskScore": "LOW|MEDIUM|HIGH|CRITICAL",
  "risks": [
    {
      "category": "payment_terms|liability|termination|compliance|ambiguity",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "description": "Brief description of the risk",
      "clause": "The specific clause text"
    }
  ],
  "summary": "Overall summary of the document analysis"
}`;

    const response = await client.chat.completions.create({
      model: process.env.SAMBANOVA_CHAT_MODEL || 'Meta-Llama-3.1-8B-Instruct',
      messages: [
        { role: 'system', content: 'You are a legal document analyzer. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Legal analysis error:', error);
    throw new Error('Failed to analyze legal document');
  }
};

// Extract property requirements from natural language
export const extractPropertyRequirements = async (query) => {
  try {
    const client = getOpenAIClient();
    const prompt = `Extract property search requirements from the following query:

Query: "${query}"

Provide a JSON response with:
{
  "bhkType": "1BHK|2BHK|3BHK|4BHK|null",
  "location": "extracted location or null",
  "minBudget": number or null,
  "maxBudget": number or null,
  "amenities": ["list of amenities mentioned"],
  "propertyType": "apartment|villa|plot|commercial|null"
}`;

    const response = await client.chat.completions.create({
      model: process.env.SAMBANOVA_CHAT_MODEL || 'Meta-Llama-3.1-8B-Instruct',
      messages: [
        { role: 'system', content: 'You are a property search assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Requirement extraction error:', error);
    throw new Error('Failed to extract requirements');
  }
};

// Count tokens (approximate)
export const countTokens = (text) => {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
};
