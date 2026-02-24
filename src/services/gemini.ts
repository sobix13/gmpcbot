import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeCode(code: string, language: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this ${language} code and describe exactly what its visual output or result would look like if executed. 
    Be very descriptive about colors, layout, and elements. 
    Code:
    ${code}`,
    config: {
      systemInstruction: "You are a code execution simulator. Your goal is to provide a vivid, detailed visual description of a code's output.",
    },
  });

  return response.text;
}

export async function generateOutputImage(description: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          text: `A high-quality, realistic or clean digital representation of the following software/code output: ${description}. 
          The image should look like a computer screen, a terminal, or a UI interface depending on the context. 
          Professional design, clear details.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
