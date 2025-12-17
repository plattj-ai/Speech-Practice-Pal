// services/geminiService.ts
import { GoogleGenAI, Modality, Chat, GenerateContentResponse, Type } from "@google/genai";
import { AI_PERSONA_PROMPT, VOICE_NAME, BASE_SPEECH_RATE } from '../constants';
import { AnalysisResult, DetailedError } from '../types';
import { decodeAudioData, decodeBase64 } from './audioService';

interface GeminiServiceInstance {
  readSentence: (text: string, outputContext: AudioContext, speed?: number) => Promise<AudioBuffer | undefined>;
  analyzePronunciation: (expectedSentence: string, audioBase64: string) => Promise<AnalysisResult>;
  generateQualitativeAnalysis: (reportSummary: string) => Promise<string>;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createGeminiService = (): GeminiServiceInstance => {

  const readSentence = async (text: string, outputContext: AudioContext, speed: number = BASE_SPEECH_RATE): Promise<AudioBuffer | undefined> => {
    if (!text || text.trim() === '') {
      console.warn("Attempted to read an empty or whitespace-only sentence aloud.");
      return undefined; // Return undefined for invalid text input
    }
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }], 
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
          24000, // Sample rate for TTS output
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

  /**
   * DIRECT AUDIO ANALYSIS
   * This function sends the recorded audio directly to Gemini (Multimodal).
   * It skips Google Cloud Speech-to-Text API entirely, making it free to use with the standard Gemini API key.
   */
  const analyzePronunciation = async (expectedSentence: string, audioBase64: string): Promise<AnalysisResult> => {
    const chat: Chat = ai.chats.create({
      model: 'gemini-2.5-flash', // Flash 2.5 is excellent for audio understanding and latency
      config: {
        systemInstruction: AI_PERSONA_PROMPT + `
          Your task is to analyze a student's audio recording against an expected sentence.
          Focus on identifying and detailing pronunciation errors, particularly for phonemes like /r/, /l/, /s/, /th/, and common blends.
          Provide clear, actionable feedback without overly enthusiastic or informal language.

          INPUT DATA:
          1. The expected sentence (text).
          2. The audio recording of the student.

          YOUR GOAL:
          1. Transcribe *exactly* what you hear in the 'spokenTranscript' field. If the student mispronounces a word (e.g., says "wabbit" instead of "rabbit"), write "wabbit" or the phonetic approximation in the transcript so they can see what they said.
          2. Compare the audio to the expected sentence to identify pronunciation errors.
          3. Focus specifically on phonemes like /r/, /l/, /s/, /th/, and blends.
          4. Provide gentle, actionable feedback.

          OUTPUT FORMAT:
          Return a JSON object with the following fields:
          - detailedErrors: An array of objects describing specific errors.
          - overallDifficultPhonemes: An array of strings listing tricky sounds (e.g., "/r/", "/s/").
          - overallFeedback: A very brief, constructive message to the student, maintaining a professional and supportive tone.
          - spokenTranscript: The string transcription of what the student actually said.

          ERROR DETECTION RULES:
          - If the audio is silent or unintelligible, set 'spokenTranscript' to "[Unintelligible]" and ask them to try again in 'overallFeedback'.
          - If the student says the sentence perfectly, 'detailedErrors' should be empty, and 'overallFeedback' should be praise.
          - Look for:
            * Substitutions (e.g., /w/ for /r/)
            * Lisps (e.g., /th/ for /s/)
            * Omissions (leaving out sounds)
        `,
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            spokenTranscript: {
              type: Type.STRING,
              description: "The transcription of what the user actually said, preserving mispronunciations phonetically if possible.",
            },
            detailedErrors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING, description: "The word in the expected sentence that was mispronounced." },
                  errorType: { type: Type.STRING, description: "The type of error (Substitution, Omission, Distortion)." },
                  phonemeIssue: { type: Type.STRING, description: "Specific detail, e.g., '/r/ sounded like /w/'." },
                  suggestion: { type: Type.STRING, description: "A short tip to fix it." },
                },
                required: ["word", "phonemeIssue", "suggestion"],
              },
            },
            overallDifficultPhonemes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            overallFeedback: {
              type: Type.STRING,
              description: "Constructive feedback from Ms. Emily, maintaining a professional and supportive tone.",
            },
          },
          required: ["spokenTranscript", "detailedErrors", "overallDifficultPhonemes", "overallFeedback"],
        },
      },
    });

    try {
      // Send the Audio + Text prompt to Gemini
      // Fixed: property name is 'message', not 'content'
      const response: GenerateContentResponse = await chat.sendMessage({
        message: {
          parts: [
            {
              inlineData: {
                mimeType: "audio/wav", 
                data: audioBase64
              }
            },
            {
              text: `The student is trying to say: "${expectedSentence}". Analyze their pronunciation.`
            }
          ]
        }
      });

      const jsonStr = response.text?.trim();
      if (jsonStr) {
        return JSON.parse(jsonStr) as AnalysisResult;
      }
      throw new Error("Empty response from AI");
    } catch (error) {
      console.error("Error analyzing audio with Gemini:", error);
      return {
        spokenTranscript: "",
        detailedErrors: [],
        overallDifficultPhonemes: [],
        overallFeedback: "I had a little trouble hearing that. Could you try again?",
      };
    }
  };

  const generateQualitativeAnalysis = async (reportSummary: string): Promise<string> => {
    const chat: Chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: AI_PERSONA_PROMPT + `\n\nYour task is to provide a brief, professional, and supportive qualitative analysis of a student's speech practice session based on the provided summary, focusing on areas for growth and observed improvements. Avoid overly enthusiastic or informal language.`,
        temperature: 0.7,
      },
    });

    const prompt = `Here is a summary of a student's speech practice session:\n\n${reportSummary}\n\nPlease provide a brief qualitative analysis.`;

    try {
      const response: GenerateContentResponse = await chat.sendMessage({ message: prompt });
      return response.text?.trim() || "No qualitative analysis could be generated.";
    } catch (error) {
      console.error("Error generating qualitative analysis:", error);
      return "I couldn't generate a qualitative analysis right now, but you did a great job practicing!";
    }
  };

  return {
    readSentence,
    analyzePronunciation,
    generateQualitativeAnalysis,
  };
};

export const geminiService = createGeminiService();