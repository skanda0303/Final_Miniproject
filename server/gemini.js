import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

const embeddingsModel = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    apiKey: process.env.GEMINI_API_KEY
});

const OLLAMA_BASE = 'http://127.0.0.1:11434';

export async function analyzeFileContent(fileName, content) {
    const validCategories = ["Finance", "Legal", "Education", "Projects", "Personal", "Tech", "Work", "Resumes"];

    const prompt = `
      You are an expert Document Analyst. Your task is to categorize and summarize this file.
      
      ### Inputs:
      - File Name: ${fileName}
      - Content Snippet: ${content.substring(0, 8000)}
      
      ### Guidelines:
      1. **Inference**: If the content is sparse or contains "sentences with little meaning", use the File Name and any context clues (like keywords) to infer the most likely category.
      2. **Categories**: You MUST choose exactly ONE from: ${validCategories.join(', ')}.
      3. **Summary**: Provide a concise 2-sentence summary. If the file is nearly empty, describe what it *seems* to be based on the title.
      4. **Response Format**: Return valid JSON only.
      
      {
        "summary": "String",
        "tags": ["tag1", "tag2"],
        "value_score": integer (1-10),
        "category": "String"
      }
    `;

    try {
        console.log(`[LOCAL AI] Analyzing ${fileName}...`);
        const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemma2:9b',
                prompt: prompt,
                format: 'json',
                stream: false,
                options: { temperature: 0.1 }
            })
        });

        if (response.ok) {
            const data = await response.json();
            // Robust parsing: sometimes local AI wraps JSON in backticks despite format:json
            let cleanResponse = data.response.trim();
            if (cleanResponse.includes('```')) {
                cleanResponse = cleanResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const match = cleanResponse.match(/\{[\s\S]*\}/);
                if (match) cleanResponse = match[0];
            }

            const result = JSON.parse(cleanResponse);
            if (validCategories.includes(result.category)) {
                return result;
            }
        }
    } catch (ollamaError) {
        console.error(`[LOCAL AI ERROR] Analysis failed for ${fileName}:`, ollamaError.message);
    }

    return {
        summary: "Analysis failed (Local AI Offline).",
        tags: ["error"],
        value_score: 0,
        category: "Uncategorized"
    };
}

export async function generateEmbedding(text) {
    try {
        const response = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemma2:9b',
                prompt: text.substring(0, 8000) // Truncate if too long for embedding
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.embedding;
        }
    } catch (ollamaError) {
        console.error('[LOCAL AI ERROR] Embedding failed:', ollamaError.message);
    }
    return null;
}

export async function generateAnswer(question, context, history = [], modelLabel = 'gemma2:9b') {
    // Trim context to top 10 chunks
    const chunks = context.split('\n\n---\n\n');
    const trimmedContext = chunks.slice(0, 10).join('\n\n---\n\n');

    // Format history for the prompt
    const historyString = history.length > 0
        ? history.join('\n')
        : "No previous conversation.";

    const prompt = `You are "Intellect", an insightful and articulate personal AI researcher.
Your goal is to provide comprehensive, structured, and synthesised answers grounded in the user's private documents.

### Output Formatting Rules:
1. **Intelligent Synthesis**: Balance document facts with fluent, concise explanations in your own words. Connect ideas directly and keep sentences punchy rather than copying long paragraphs verbatim.
2. **Concise Structure**: ALWAYS use **Markdown** (headers, lists, bold text) for a clean, highly readable layout. Keep answers focused, direct, and compact to allow fast generation.
3. **Sections**:
   - **### 🔎 Contextual Insights**: A brief 1-2 sentence analytical insight linking the query to the document evidence.
   - **### 💡 Synthesis**: The main answer, direct and concise, structured using compact bullet points or short paragraphs.
   - **### 🔍 Reference Sources**: List each unique file name used to answer the question exactly once (no duplicates, no duplicate lines, and do not include relevance percentages or similarity scores).

### Knowledge & Grounding Rules:
1. **Flexible Grounding**: Ground key facts, dates, and figures in the [Context], but explain them briefly and naturally.
2. **Source Citation**: Under "### 🔍 Reference Sources", format the citation exactly as: '- filename.pdf' or similar (only unique basenames, one per line). Never list the same file name multiple times. Do not include relevance percentages.
3. **No External Elaboration**: Do not inject external definitions, technical descriptions, or detailed characteristics (such as the specific visual shapes or candle structures of candlestick patterns) unless those details are explicitly present in the provided documents. Stick strictly to the document contents.

### Conversation History:
${historyString}

### Context & Documents:
${trimmedContext}

### User's Question:
"${question}"

Assistant:`;

    try {
        console.log(`[LOCAL AI] Generating answer with ${modelLabel}...`);
        const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelLabel,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.4,
                    num_predict: 900 // Reduced for faster local inference
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.response.trim();
        }
    } catch (ollamaError) {
        throw new Error(`[OLLAMA_OFFLINE] ${ollamaError.message}`);
    }

    throw new Error('[OLLAMA_ERROR] Model failed to generate response.');
}
