// constants.ts
import { SentenceType } from './types'; // Import SentenceType

export const CONVERSATIONAL_SENTENCES: string[] = [
  "What did you do today at school?",
  "Tell me about your favorite animal.",
  "What is your favorite food and why?",
  "If you could have any superpower, what would it be?",
  "Describe your best friend to me.",
  "What do you like to do on weekends?",
  "Where do you want to go for your next vacation?",
  "What's the funniest thing that happened to you recently?",
  "If you built a treehouse, what would it look like?",
  "Tell me about a game you like to play.",
  "What's something new you learned this week?",
  "Who is your favorite character in a book or movie?",
  "What makes you feel happy?",
  "How do you help out at home?",
  "If you could talk to animals, what would you ask them?",
  "What's your favorite season and why?",
  "Describe your perfect day.",
  "What do you want to be when you grow up?",
  "Tell me about a time you were brave.",
  "What is something you are really good at?",
];

export const TONGUE_TWISTER_SENTENCES: string[] = [
  "She sells seashells by the seashore.",
  "Peter Piper picked a peck of pickled peppers.",
  "The cat sat on the mat with a hat.",
  "Red lorry, yellow lorry.",
  "A big black bug bit a big black dog on his big black nose.",
  "Fuzzy Wuzzy was a bear, Fuzzy Wuzzy had no hair.",
  "Unique New York, unique New York.",
  "Six sleek swans swam swiftly southwards.",
  "I scream, you scream, we all scream for ice cream.",
  "Toy boat, toy boat, toy boat.",
  "The thirty-three thieves thought that they thrilled the throne throughout Thursday.",
  "Fresh fried fish, fish fresh fried, fried fish fresh, fish fried fresh.",
  "Betty Botter bought some butter, but she said the butter’s bitter.",
  "How can a clam cram in a clean cream can?",
  "Strict strong speech students usually skip silly subjects.",
  "Wayne went to Wales to watch walruses.",
  "Can you can a can as a canner can can a can?",
  "Which witch wished which wicked wish?",
  "He threw three free throws.",
  "Imagine an imaginary menagerie manager managing an imaginary menagerie.",
];

export const AI_PERSONA_PROMPT = `
You are Ms. Emily, a professional speech pathologist based in Illinois. Your role is to assess and provide constructive feedback to elementary and middle school students who are practicing specific speech sounds. Your communication style is supportive, clear, and objective, focusing on specific observations and actionable strategies for improvement, rather than overly enthusiastic or informal praise.
`;

export const APP_NAME = "Speech Practice Pal";
export const APP_SLOGAN = "#SpeakWithConfidence";
export const PRIMARY_PURPLE = 'bg-[#582D88]';
export const ACCENT_BLUE = 'text-[#446CA3]'; // Example for text. Could be used for buttons as well.
export const TEXT_WHITE = 'text-white';
export const TEXT_DARK = 'text-gray-800';
export const BUTTON_PRIMARY_CLASS = 'px-6 py-3 rounded-full font-semibold text-white transition-all duration-300';
export const BUTTON_PRIMARY_PURPLE = `bg-[#582D88] hover:bg-[#4a2470] ${BUTTON_PRIMARY_CLASS}`;
export const BUTTON_SECONDARY_BLUE = `bg-[#446CA3] hover:bg-[#345381] ${BUTTON_PRIMARY_CLASS}`;
export const BORDER_PRIMARY_PURPLE = 'border-[#582D88]';
export const FOCUS_RING_PURPLE = 'focus:ring-2 focus:ring-[#582D88] focus:ring-opacity-50';

export const BASE_SPEECH_RATE = 1.0; // Normal speech rate
export const SLOWER_SPEECH_RATE = 0.8; // Slower for reading sentences
export const FAST_SPEECH_RATE = 1.2; // For quick feedback

export const VOICE_NAME = 'Kore'; // Preferred AI voice for friendly tone