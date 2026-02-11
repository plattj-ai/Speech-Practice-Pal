// services/geminiService.ts
import { GoogleGenAI, Modality, Chat, GenerateContentResponse, Type } from "@google/genai";
import { AI_PERSONA_PROMPT, SENTENCE_GENERATION_PROMPT, VOICE_NAME, BASE_SPEECH_RATE } from '../constants';
import { AnalysisResult, DetailedError, PhonemeType, DifficultyLevel, SentenceType } from '../types';
import { decodeAudioData, decodeBase64 } from './audioService';

interface GeminiServiceInstance {
  readSentence: (text: string, outputContext: AudioContext, speed?: number) => Promise<AudioBuffer | undefined>;
  analyzePronunciation: (expectedSentence: string, audioBase64: string, targetPhonemes?: string[], difficultyLevel?: DifficultyLevel) => Promise<AnalysisResult>;
  generateQualitativeAnalysis: (reportSummary: string, difficultyLevel?: DifficultyLevel) => Promise<string>;
  generateSentences: (count: number, difficulty: DifficultyLevel, phonemes: string[], type: SentenceType) => Promise<string[]>;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createGeminiService = (): GeminiServiceInstance => {

  const generateSentences = async (count: number, difficulty: DifficultyLevel, phonemes: string[], type: SentenceType): Promise<string[]> => {
    const targetDesc = phonemes.length === 0 ? "general speech" : `the following target sounds: ${phonemes.join(', ')}`;
    const prompt = `Generate exactly ${count} unique sentences.
    Difficulty Level: ${difficulty}
    Target Sounds: ${targetDesc}
    Style: ${type === SentenceType.CONVERSATIONAL ? "Conversational/Natural" : "Tongue Twister"}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SENTENCE_GENERATION_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: `List of ${count} sentences.`
              }
            },
            required: ["sentences"]
          }
        }
      });

      const json = JSON.parse(response.text || '{"sentences": []}');
      return json.sentences || [];
    } catch (error) {
      console.error("Sentence Generation Error:", error);
      // Fallback in case of API failure
      return ["The quick brown fox jumps over the lazy dog."];
    }
  };

  const readSentence = async (text: string, outputContext: AudioContext, speed: number = BASE_SPEECH_RATE): Promise<AudioBuffer | undefined> => {
    if (!text || text.trim() === '') return undefined;
    
    const paceInstruction = speed > 1.2 ? "quickly and clearly" : speed > 1.0 ? "at a brisk pace" : "at a steady, clear pace";
    const prompt = `Speak this ${paceInstruction}: ${text}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }], 
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: VOICE_NAME },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBuffer = await decodeAudioData(
          decodeBase64(base64Audio),
          outputContext,
          24000, 
          1,
        );
        return audioBuffer;
      }
      return undefined;
    } catch (error) {
      console.error("Error reading sentence:", error);
      throw error;
    }
  };

  const analyzePronunciation = async (expectedSentence: string, audioBase64: string, targetPhonemes?: string[], difficultyLevel: DifficultyLevel = 'A'): Promise<AnalysisResult> => {
    try {
      const phonemeContext = targetPhonemes && targetPhonemes.length > 0
        ? `Focus strictly on the articulation of the following phonemes: ${targetPhonemes.join(', ')}.` 
        : "Evaluate overall pronunciation and intelligibility.";

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "audio/wav", 
                  data: audioBase64
                }
              },
              {
                text: `BALANCED PHONETIC ASSESSMENT (Level ${difficultyLevel}). Target: "${expectedSentence}". ${phonemeContext} 
                Instructions: 
                - Be a mechanical coach for the student. No fluff. 
                - Loosen sensitivity by 10%: Allow for minor natural variations in speech that do not hinder overall intelligibility.
                - Limit feedback to exactly 1-2 sentences.
                - Use vocabulary appropriate for Level ${difficultyLevel}.`
              }
            ]
          }
        ],
        config: {
          systemInstruction: AI_PERSONA_PROMPT + `
            Strict Requirement: overallFeedback MUST be 1-2 sentences maximum. No more.
            Threshold: Ignore subtle phonetic nuances. Only flag clear articulation errors or substitutions.
          `,
          thinkingConfig: {
            thinkingBudget: 2048
          },
          temperature: 0.2, 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              spokenTranscript: { type: Type.STRING },
              detailedErrors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    errorType: { type: Type.STRING },
                    phonemeIssue: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ["word", "errorType", "phonemeIssue", "suggestion"],
                },
              },
              overallDifficultPhonemes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              overallFeedback: { type: Type.STRING, description: "Exactly 1-2 sentences of mechanical coaching feedback for the student." },
            },
            required: ["spokenTranscript", "detailedErrors", "overallDifficultPhonemes", "overallFeedback"],
          },
        },
      });

      const jsonStr = response.text?.trim();
      if (jsonStr) {
        return JSON.parse(jsonStr) as AnalysisResult;
      }
      throw new Error("Empty response from AI");
    } catch (error) {
      console.error("Advanced Phonetic Analysis Error:", error);
      return {
        spokenTranscript: "[Analysis failed]",
        detailedErrors: [],
        overallDifficultPhonemes: [],
        overallFeedback: "Clearer recording required for analysis.",
      };
    }
  };

  const generateQualitativeAnalysis = async (reportSummary: string, difficultyLevel: DifficultyLevel = 'A'): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Summarize for student's speech report: ${reportSummary}. IMPORTANT: If sentences were skipped, explicitly note this in the analysis.` }] }],
        config: {
          systemInstruction: AI_PERSONA_PROMPT + `\n\nProvide 1-2 technical sentences for a student's speech record. Mention any skipped items clearly.`,
          temperature: 0.5,
        },
      });
      return response.text?.trim() || "Practice session completed.";
    } catch (error) {
      return "Targeted phonetic practice session concluded.";
    }
  };

  return {
    generateSentences,
    readSentence,
    analyzePronunciation,
    generateQualitativeAnalysis,
  };
};

export const geminiService = createGeminiService();