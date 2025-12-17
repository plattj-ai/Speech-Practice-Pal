// types.ts

export enum SessionState {
  IDLE = 'IDLE',
  CHOOSING_DURATION = 'CHOOSING_DURATION',
  PRACTICE = 'PRACTICE',
  REPORT = 'REPORT',
  LOADING = 'LOADING',
  MICROPHONE_DENIED = 'MICROPHONE_DENIED',
}

export enum SentenceType {
  CONVERSATIONAL = 'conversational',
  TONGUE_TWISTER = 'tongueTwister',
}

export interface DetailedError {
  word: string;
  errorType?: string; // e.g., "Substitution", "Distortion", "Omission", "Addition", "Fronting", "Stopping", "Cluster Reduction", "Final Consonant Deletion"
  phonemeIssue: string; // e.g., "/r/ substituted with /w/", "lateral lisp for /s/", "omission of final /t/"
  suggestion: string;
}

export interface AnalysisResult {
  detailedErrors: DetailedError[];
  overallDifficultPhonemes: string[]; // Specific phonemes or patterns identified, e.g., ["/r/", "/s/-lisp", "th-fronting"]
  overallFeedback: string; // Ms. Emily's qualitative summary for this specific attempt
  spokenTranscript: string; // What the AI heard
}

export interface ErrorDetail {
  timestamp: number;
  expectedSentence: string;
  spokenSentence: string;
  errors: DetailedError[]; // List of detailed errors for this attempt
  attempts: number;
}

export interface ReportData {
  totalSentencesRead: number;
  totalErrors: number; // Sum of detailedErrors.length across all ErrorDetail entries
  errorHistory: ErrorDetail[];
  difficultSoundsAnalysis: string; // This will come from combining overallDifficultPhonemes
  qualitativeAnalysis: string;
  sessionDurationMinutes: number;
  sentenceType: SentenceType; // Added sentence type to report data
}

export interface AudioBlob {
  data: string; // Base64 encoded PCM data
  mimeType: string; // 'audio/pcm;rate=16000'
}

export enum AiVoice {
  ZEPHYR = 'Zephyr',
  KORE = 'Kore',
  PUCK = 'Puck',
  CHARON = 'Charon',
  FENRIR = 'Fenrir',
}

// --- Google Cloud Speech-to-Text Pronunciation Assessment Types ---
// (These are technically no longer used by the logic but kept for reference or removal later)

export interface PhonemeInfo {
  phoneme: string; 
  start_offset: string; 
  end_offset: string;   
  accuracy_score: number; 
}

export interface WordInfo {
  word: string; 
  start_time: string; 
  end_time: string;   
  pronunciation_assessment: {
    accuracy_score: number; 
    fluency_score: number;  
    completeness_score: number; 
    rhythm_score: number; 
  };
  phonemes?: PhonemeInfo[];
  error_type?: string[]; 
}

export interface RecognitionResult {
  alternatives: {
    transcript: string; 
    confidence: number; 
    words: WordInfo[];   
  }[];
  language_code: string;
}

export interface PronunciationAssessmentResult {
  results: RecognitionResult[];
}