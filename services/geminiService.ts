import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini AI client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeAudioEnvironment = async (
  avgDb: number, 
  peakDb: number, 
  freqProfile: string
): Promise<{ text: string; hazardLevel: 'LOW' | 'MEDIUM' | 'HIGH' } | null> => {
  
  const ai = getAiClient();
  if (!ai) return null;

  const prompt = `
    Analyze the following audio environment data:
    - Average Decibels: ${avgDb.toFixed(1)} dB
    - Peak Decibels: ${peakDb.toFixed(1)} dB
    - Frequency Profile Description: ${freqProfile}

    Provide a concise assessment (max 30 words) of the environment (e.g., "Library quiet," "Busy street," "Rock concert"). 
    Also classify the hearing hazard level as LOW, MEDIUM, or HIGH.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "A short description of the environment."
            },
            hazardLevel: {
              type: Type.STRING,
              enum: ["LOW", "MEDIUM", "HIGH"],
              description: "The hearing hazard level."
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return null;
    return JSON.parse(resultText);

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return null;
  }
};