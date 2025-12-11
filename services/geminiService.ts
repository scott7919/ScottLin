import { GoogleGenAI } from "@google/genai";
import { ExtractedData, ReferenceExample } from "../types";

// Note: We no longer initialize a global `ai` instance here.
// It is initialized inside analyzeImage to support dynamic API keys.

/**
 * Resizes and compresses an image file, returning a Base64 string.
 * Limits dimension to max 1024px to save tokens while maintaining OCR quality.
 */
export const fileToGenericBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize logic: Max 1024px on the longest side
        const MAX_SIZE = 1024;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        // Remove prefix
        const base64Data = dataUrl.split(',')[1];
        resolve(base64Data);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Validates the provided API Key by making a minimal API call.
 */
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    if (!apiKey) return false;
    const ai = new GoogleGenAI({ apiKey });
    // Use a lightweight model and minimal prompt to check validity
    await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: 'Ping' }] },
      config: { maxOutputTokens: 1 }
    });
    return true;
  } catch (error) {
    console.error("API Key validation failed:", error);
    return false;
  }
};

/**
 * Helper to retry function on 429/503 errors (Smart Retry)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error.toString().toLowerCase();
    
    // Check for Invalid API Key explicitly (400 or 401 usually)
    if (msg.includes('api key not valid') || msg.includes('key invalid') || msg.includes('400 bad request')) {
        throw new Error("API Key 無效或未設定 (Invalid API Key)");
    }

    // Check for common rate limit or overload keywords
    const isRateLimit = msg.includes('429') || msg.includes('quota') || msg.includes('exhausted');
    const isServerOverload = msg.includes('503') || msg.includes('overloaded');
    
    if ((isRateLimit || isServerOverload) && retries > 0) {
      console.warn(`API Limit hit. Retrying in ${baseDelay}ms... (${retries} retries left)`);
      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, baseDelay));
      // Retry with double delay (Exponential Backoff)
      return withRetry(fn, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

/**
 * Analyzes a single image to extract specific fields using Gemini.
 * Supports "Few-Shot Learning" by accepting reference examples.
 * Supports Multiple Entity Detection (returns an array).
 * Requires an API Key to be passed in.
 */
export const analyzeImage = async (
  apiKey: string,
  file: File, 
  fields: string[], 
  additionalContext: string,
  examples: ReferenceExample[] = []
): Promise<ExtractedData[]> => {
  try {
    // 0. Validation
    const effectiveKey = apiKey || process.env.API_KEY;
    if (!effectiveKey) {
        throw new Error("未設定 API Key (Missing API Key)");
    }

    // 1. Initialize Client dynamically
    const ai = new GoogleGenAI({ apiKey: effectiveKey });

    // Optimize: Compress image before sending
    const base64Data = await fileToGenericBase64(file);
    
    // Model Selection
    const model = 'gemini-2.5-flash';
    
    const fieldList = fields.join(', ');
    
    const systemInstruction = `
      You are an expert OCR and Document Analysis AI. 
      Your task is to extract specific fields from images.
      
      IMPORTANT: The image might contain MULTIPLE distinct items, entities, or rows of data (e.g., multiple receipts in one photo, multiple line items in a document, multiple name cards).
      
      1. Detect ALL distinct entities/items in the image that match the requested fields.
      2. Return a JSON ARRAY [...], where each object inside corresponds to one distinct entity.
      3. If only one entity is found, return an array with one object.
      4. Keys must be exactly: ${JSON.stringify(fields)}.
      5. If a field is not found for a specific entity, use null.
      6. Do not include markdown formatting, just the raw JSON array.
      
      ${additionalContext ? `Additional Rules: ${additionalContext}` : ''}
    `;

    const parts: any[] = [];

    // 2. Add Few-Shot Examples (Teaching Phase)
    // OPTIMIZATION: Only use the last 1 example to save tokens and prevent quota exhaustion
    const limitedExamples = examples.slice(-1);

    if (limitedExamples.length > 0) {
      limitedExamples.forEach((ex, index) => {
        parts.push({ 
          inlineData: { mimeType: "image/jpeg", data: ex.base64 } 
        });
        parts.push({ 
          text: `Example Output (JSON Array): ${JSON.stringify(ex.data)}` 
        });
      });
    }

    // 3. Add Target Image (Inference Phase)
    parts.push({
      inlineData: {
        mimeType: "image/jpeg", // We converted to jpeg in fileToGenericBase64
        data: base64Data
      }
    });
    parts.push({
      text: `Analyze the last image above. Identify all distinct items. Extract these fields: ${fieldList}. Return a JSON Array.`
    });

    // Wrapped in retry logic to handle 429 errors gracefully
    const response = await withRetry(async () => {
        return await ai.models.generateContent({
            model: model,
            contents: {
                parts: parts
            },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                temperature: 0.1, 
            }
        });
    });

    const responseText = response.text;
    
    if (!responseText) {
      throw new Error("No response from AI");
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }

    let parsedData = JSON.parse(cleanJson);

    // Ensure the result is always an array
    if (!Array.isArray(parsedData)) {
      parsedData = [parsedData];
    }

    return parsedData;

  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};