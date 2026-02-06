// constants.ts
import { SentenceType } from './types'; 

export const L_SOUND_SENTENCES: string[] = [
  "Little Lily loves lucky yellow lollipops.",
  "Look at the lovely blue lake in the light.",
  "The lazy lion lay on the long leaf.",
  "Please fill the glass with cool lemonade.",
  "Leo played with his yellow ball all day long.",
  "Large ladybugs like to leap on little leaves.",
  "The lovely light fell on the lonely hills.",
  "Let's look for lucky shells along the lake."
];

export const R_SOUND_SENTENCES: string[] = [
  "Red rabbits run round the green garden.",
  "Robert read a really great story about rockets.",
  "The river runs right past the bright red rock.",
  "Barry brought brown bread for the bright bird.",
  "Are you ready to race on the red track?",
  "Rainy roads require really careful driving.",
  "The roaring tiger ran through the dark forest.",
  "Richie wrote a report about rare reptiles."
];

export const S_SOUND_SENTENCES: string[] = [
  "Six silly seals swam in the salty sea.",
  "Sam saw seven silver stars in the sky.",
  "The sun is shining on the soft sand.",
  "Please pass the sweet strawberry soup.",
  "Sarah says she saw some small snakes.",
  "Listen to the whistling wind in the grass.",
  "The fast bus stops at the street corner.",
  "Step on the grass and see the spring flowers."
];

export const CONVERSATIONAL_SENTENCES: string[] = [
  "What interesting stories did you read at school today?",
  "Tell me about your favorite playful animal.",
  "What is your favorite fresh fruit, and why do you like it so much?",
  "If you could have any special superpower, what would it be?",
  "Describe your strong and brave best friend to me.",
  "What do you like to do on bright and sunny weekends?",
  "Where do you prefer to travel for your next great adventure?",
  "What's the thrilling and funniest thing that happened to you recently?",
  "If you built a tall treehouse, what would it look like?",
  "Tell me about a game you particularly love to play.",
  "What's something new and truly interesting you learned this week?",
  "Who is your favorite strong and brave character in a book or movie?",
  "What makes you feel truly happy and peaceful?",
  "How do you proudly help out at home with chores?",
  "If you could talk to all sorts of animals, what would it ask them?",
  "What's your favorite sunny season, and why do you love it?",
  "Describe your truly spectacular and perfect day.",
  "What do you want to be when you grow up and help people?",
  "Tell me about a challenging time when you were truly brave.",
  "What is something you are truly great at and practice regularly?",
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
You are Speech Pal, a professional speech pathologist based in Illinois. Your role is to assess and provide constructive feedback to elementary and middle school students who are practicing specific speech sounds. Your communication style is supportive, clear, and objective, focusing on specific observations and actionable strategies for improvement, rather than overly enthusiastic or informal praise.
`;

export const APP_NAME = "Speech Practice Pal";
export const APP_SLOGAN = "#SpeakWithConfidence";
export const PRIMARY_PURPLE = 'bg-[#582D88]';
export const ACCENT_BLUE = 'text-[#446CA3]'; 
export const TEXT_WHITE = 'text-white';
export const TEXT_DARK = 'text-gray-800';
export const BUTTON_PRIMARY_CLASS = 'px-6 py-3 rounded-full font-semibold text-white transition-all duration-300';
export const BUTTON_PRIMARY_PURPLE = `bg-[#582D88] hover:bg-[#4a2470] ${BUTTON_PRIMARY_CLASS}`;
export const BUTTON_SECONDARY_BLUE = `bg-[#446CA3] hover:bg-[#345381] ${BUTTON_PRIMARY_CLASS}`;
export const BORDER_PRIMARY_PURPLE = 'border-[#582D88]';
export const FOCUS_RING_PURPLE = 'focus:ring-2 focus:ring-[#582D88] focus:ring-opacity-50';

export const BASE_SPEECH_RATE = 1.0; 
export const SLOWER_SPEECH_RATE = 0.8; 
export const FAST_SPEECH_RATE = 1.2; 

export const VOICE_NAME = 'Kore'; 

export const MICROPHONE_GAIN_FACTOR = 2.0;