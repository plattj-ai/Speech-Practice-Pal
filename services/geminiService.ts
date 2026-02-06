// services/geminiService.ts
import { GoogleGenAI, Modality, Chat, GenerateContentResponse, Type } from "@google/genai";
import { AI_PERSONA_PROMPT, VOICE_NAME, BASE_SPEECH_RATE } from '../constants';
import { AnalysisResult, DetailedError, PhonemeType } from '../types';
import { decodeAudioData, decodeBase64 } from './audioService';

interface GeminiServiceInstance {
  readSentence: (text: string, outputContext: AudioContext, speed?: number) => Promise<AudioBuffer | undefined>;
  analyzePronunciation: (expectedSentence: string, audioBase64: string, targetPhoneme?: PhonemeType) => Promise<AnalysisResult>;
  generateQualitativeAnalysis: (reportSummary: string) => Promise<string>;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createGeminiService = (): GeminiServiceInstance => {

  const readSentence = async (text: string, outputContext: AudioContext, speed: number = BASE_SPEECH_RATE): Promise<AudioBuffer | undefined> => {
    if (!text || text.trim() === '') return undefined;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }], 
        config: {
          responseModalalities: [Modality.AUDIO],
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

  const analyzePronunciation = async (expectedSentence: string, audioBase64: string, targetPhoneme?: PhonemeType): Promise<AnalysisResult> => {
    try {
      const phonemeContext = targetPhoneme && targetPhoneme !== PhonemeType.MIX 
        ? `The student is specifically working on the /${targetPhoneme.toLowerCase()}/ sound today. Pay extra attention to its articulation.` 
        : "";

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
                text: `STRICT PHONETIC ASSESSMENT: The student was asked to say: "${expectedSentence}". 
                ${phonemeContext}
                Analyze the audio for phonetic accuracy. 
                Identify substitutions, omissions, distortions, or additions.
                Output the literal sounds heard in 'spokenTranscript'.`
              }
            ]
          }
        ],
        config: {
          systemInstruction: AI_PERSONA_PROMPT + `
            ACT AS A CLINICAL PHONETICIAN.
            
            YOUR PROTOCOL:
            1. Auditory Analysis: Listen for phonological processes (Gliding, Fronting, Stopping, Lisping).
            2. Thinking Phase: Use your thinking budget to reason through acoustic features to distinguish similar sounds.
            3. Zero Autocorrect: Transcribe EXACTLY what was said.
            
            RESPONSE REQUIREMENTS:
            - spokenTranscript: Literal transcription.
            - detailedErrors: word-by-word analysis.
            - overallDifficultPhonemes: patterns found.
            - overallFeedback: Supportive response from Ms. Emily.
          `,
          thinkingConfig: {
            thinkingBudget: 2048
          },
          temperature: 0.1, 
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
              overallFeedback: { type: Type.STRING },
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
        spokenTranscript: "[Phonetic analysis timed out or failed]",
        detailedErrors: [],
        overallDifficultPhonemes: [],
        overallFeedback: "I'm listening so closely I almost missed it! Let's try that one more time, nice and clear for me.",
      };
    }
  };

  const generateQualitativeAnalysis = async (reportSummary: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: reportSummary }] }],
        config: {
          systemInstruction: AI_PERSONA_PROMPT + `\n\nGenerate a professional speech-language summary.`,
          temperature: 0.7,
        },
      });
      return response.text?.trim() || "Session documentation complete.";
    } catch (error) {
      return "The student completed targeted phonetic practice.";
    }
  };

  return {
    readSentence,
    analyzePronunciation,
    generateQualitativeAnalysis,
  };
};

export const geminiService = createGeminiService();
