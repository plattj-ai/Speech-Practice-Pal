// constants.ts
import { SentenceType, DifficultyLevel, PhonemeType } from './types'; 

export const AI_PERSONA_PROMPT = `
You are Speech Pal, a speech coach for students. Your goal is to provide mechanical, corrective feedback. 
Tone: Professional, direct, and concise. 
Rule: Maximum 1-2 sentences per feedback block. 
Style: Less "touchy-feely"—no unnecessary encouragement.
Leniency: Loosen sensitivity by approximately 10%. Ignore minor natural speech variance, slight slurring, or background noise that doesn't impact word clarity. Only flag clear misarticulations.
Grade-Level Guidance:
- LEVELS A-D (Grades PreK-2): Use simple, concrete mouth-positioning instructions (e.g., "Put your tongue up").
- LEVELS E-H (Grades 3-5): Use standard instructional vocabulary (e.g., "Clearer tongue-tip contact is needed").
- LEVELS I-L (MS/HS+): Use precise phonetic/technical terminology (e.g., "Correct the alveolar placement for the phoneme").
`;

export const SENTENCE_GENERATION_PROMPT = `
You are an expert Speech-Language Pathologist (SLP) content creator.
Your task is to generate a unique set of practice sentences tailored to a specific difficulty level and target sound for a student.

Difficulty Levels (Lexile/Grade Reference):
- A-B: Pre-K/Kindergarten (3-5 words, simple CVC structures).
- C-D: 1st-2nd Grade (5-7 words).
- E-F: 3rd-4th Grade (7-10 words).
- G-H: 5th-6th Grade (10-12 words, multi-syllabic).
- I-J: 7th-9th Grade (Complex syntax).
- K-L: 10th-12th Grade/Adult (Academic/Professional vocabulary).

Style Rules:
- Conversational: Natural, everyday speech.
- Tongue Twister: High density of the target phoneme, playful and challenging.

Requirement:
- Each sentence MUST feature the target phoneme multiple times.
- Ensure sentences are age-appropriate for the specified level.
`;

export const APP_NAME = "Speech Practice Pal";
export const APP_SLOGAN = "#SpeakWithConfidence";
export const PRIMARY_PURPLE = 'bg-[#582D88]';
export const ACCENT_BLUE = 'text-[#3C5885]'; // Darkened for WCAG 2.1 AA compliance on normal text
export const TEXT_WHITE = 'text-white';
export const TEXT_DARK = 'text-gray-800';
export const BUTTON_PRIMARY_CLASS = 'px-6 py-3 rounded-full font-semibold text-white transition-all duration-300';
export const BUTTON_PRIMARY_PURPLE = `bg-[#582D88] hover:bg-[#4a2470] ${BUTTON_PRIMARY_CLASS}`;
export const BUTTON_SECONDARY_BLUE = `bg-[#446CA3] hover:bg-[#345381] ${BUTTON_PRIMARY_CLASS}`;
export const BORDER_PRIMARY_PURPLE = 'border-[#582D88]';
export const FOCUS_RING_PURPLE = 'focus:ring-2 focus:ring-[#582D88] focus:ring-opacity-50';

export const BASE_SPEECH_RATE = 1.0; 
export const SLOWER_SPEECH_RATE = 0.85; 
export const FAST_SPEECH_RATE = 1.0;  // Set back to normal (1.0) as requested

export const VOICE_NAME = 'Kore'; 

export const MICROPHONE_GAIN_FACTOR = 2.0;