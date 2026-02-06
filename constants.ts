// constants.ts
import { SentenceType, DifficultyLevel, PhonemeType } from './types'; 

/**
 * SENTENCE_LIBRARY is indexed by DifficultyLevel (A-L).
 * Each level contains sentences roughly mapped to Lexile scores and grade-level complexity.
 */
export const SENTENCE_LIBRARY: Record<string, Record<string, string[]>> = {
  'A': { // Level 1 equivalent
    [PhonemeType.L]: ["Look at the blue lake.", "Leo likes the yellow ball.", "A little leaf fell down."],
    [PhonemeType.R]: ["Red rabbits run fast.", "The river is cold.", "Read a red book."],
    [PhonemeType.S]: ["Sam saw a star.", "The sun is hot.", "Six seals swim."],
    [SentenceType.CONVERSATIONAL]: ["How are you today?", "What is your name?", "I like to play."],
    [SentenceType.TONGUE_TWISTER]: ["Red lorry, yellow lorry.", "Toy boat, toy boat."]
  },
  'B': { // Level 2 equivalent
    [PhonemeType.L]: ["The ladybug sits on the leaf.", "Lily loves her blue lollipop.", "Let's play with the blocks."],
    [PhonemeType.R]: ["Ready to run a race?", "Robert has a red robot.", "Rain falls on the green grass."],
    [PhonemeType.S]: ["Six silly snakes slide.", "The school bus is big.", "Small stars shine in the sky."],
    [SentenceType.CONVERSATIONAL]: ["What is your favorite toy?", "Where do you live?", "Who is your best friend?"],
    [SentenceType.TONGUE_TWISTER]: ["She sells seashells.", "Fuzzy Wuzzy was a bear."]
  },
  'C': { // Level 3 equivalent
    [PhonemeType.L]: ["Please fill the glass with milk.", "Lucky Lucy found a shiny coin.", "Large lions live in the wild."],
    [PhonemeType.R]: ["Rivers run around the rocks.", "Barry brought a brown basket.", "Richie reads a really long story."],
    [PhonemeType.S]: ["Silly seals swam in the sea.", "Sarah saw seven silver spoons.", "The sun shines on the soft sand."],
    [SentenceType.CONVERSATIONAL]: ["Tell me about your school.", "What do you like to eat?", "Do you have any pets?"],
    [SentenceType.TONGUE_TWISTER]: ["Peter Piper picked peppers.", "Six sleek swans swam south."]
  },
  'D': { // Level 4 equivalent
    [PhonemeType.L]: ["Leaves fall slowly from the trees.", "The lovely light glows in the night.", "Leo learned to play the flute."],
    [PhonemeType.R]: ["Read about the rare red reptiles.", "A roaring tiger ran through the forest.", "Remember to rest after the race."],
    [PhonemeType.S]: ["Seven small stars spin in space.", "Stay safe on the slippery slope.", "The snake slides through the grass."],
    [SentenceType.CONVERSATIONAL]: ["What is the best movie you saw?", "How do you help at home?", "Describe a fun summer day."],
    [SentenceType.TONGUE_TWISTER]: ["Unique New York.", "I scream for ice cream."]
  },
  'E': { // Level 5 equivalent
    [PhonemeType.L]: ["Learning a language takes long hours.", "The local library has lovely books.", "Luckily, the lock was not closed."],
    [PhonemeType.R]: ["Recent reports reveal rare artifacts.", "Robots replace humans in some jobs.", "The road requires regular repairs."],
    [PhonemeType.S]: ["Several students shared some snacks.", "Success starts with small steps.", "Science shows how the stars shine."],
    [SentenceType.CONVERSATIONAL]: ["What is your favorite subject?", "If you were a king, what would you do?", "Tell me about a great adventure."],
    [SentenceType.TONGUE_TWISTER]: ["Betty Botter bought butter.", "How can a clam cram in a can?"]
  },
  'F': { // Level 6 equivalent
    [PhonemeType.L]: ["Logic helps us solve large puzzles.", "Local legends live on for centuries.", "The liquid leaked onto the laboratory floor."],
    [PhonemeType.R]: ["Rigorous research requires real dedication.", "Regulations restrict random urban growth.", "Renewable resources reduce our footprint."],
    [PhonemeType.S]: ["Societies strive for social stability.", "Sustained study yields significant results.", "Sophisticated software saves several hours."],
    [SentenceType.CONVERSATIONAL]: ["What inspires you to work hard?", "Discuss a book that changed your mind.", "How do you define personal success?"],
    [SentenceType.TONGUE_TWISTER]: ["Strict strong speech students skip silly subjects.", "Wayne went to Wales to watch walruses."]
  },
  'G': { // Level 7 equivalent
    [PhonemeType.L]: ["Legal liability likely limits local loans.", "Longitudinal studies look at long periods.", "Legislative levels look for lasting logic."],
    [PhonemeType.R]: ["Remarkable revelations regarding rare rocks.", "Rhetorical reasons require rich resources.", "Rapid reconstruction restores regular roads."],
    [PhonemeType.S]: ["Systemic shifts suggest social stress.", "Statistical significance shows strong signs.", "Strategic stamina supports superior success."],
    [SentenceType.CONVERSATIONAL]: ["Evaluate the impact of modern technology.", "Explain a complex scientific concept.", "Compare two different historical eras."],
    [SentenceType.TONGUE_TWISTER]: ["Imagine an imaginary menagerie manager managing a menagerie.", "Thirty-three thieves thrilled the throne."]
  },
  'H': { // Level 8 equivalent
    [PhonemeType.L]: ["Literacy levels look largely like local life.", "Logical labels list localized legal limits.", "Liberal labor laws look like local liberties."],
    [PhonemeType.R]: ["Radical reforms rarely reach real results.", "Reliable research regarding rare radiation.", "Refining raw resources requires real rigor."],
    [PhonemeType.S]: ["Sustaining success suggests superior strategy.", "Specific standards support solid science.", "Social structures support stable systems."],
    [SentenceType.CONVERSATIONAL]: ["How do economic trends affect daily life?", "Analyze the themes in a classic novel.", "Defend your position on a current event."],
    [SentenceType.TONGUE_TWISTER]: ["Which witch wished which wicked wish?", "He threw three free throws."]
  },
  'I': { // Level 9 equivalent
    [PhonemeType.L]: ["Lexical limitations look like literal loss.", "Logistical levels limit longitudinal logic.", "Legitimate labor look like local law."],
    [PhonemeType.R]: ["Recurrent research regarding radial rays.", "Reciprocal relations require robust respect.", "Resilient regions resist rapid recession."],
    [PhonemeType.S]: ["Systematic scrutiny suggests specific flaws.", "Substantial subsidies support small shops.", "Synchronous systems show superior speed."],
    [SentenceType.CONVERSATIONAL]: ["Synthesize multiple sources of information.", "Predict the future of space exploration.", "Critique a famous piece of architecture."],
    [SentenceType.TONGUE_TWISTER]: ["A big black bug bit a big black dog.", "The thirty-three thieves thought."]
  },
  'J': { // Level 10 equivalent
    [PhonemeType.L]: ["Lexicographers logically list lexical links.", "Legitimacy levels look like local liberty.", "Linear logic limits long-term learning."],
    [PhonemeType.R]: ["Rigorous rhetoric requires robust reason.", "Resonating rumors reached remote regions.", "Recapitulating research reveals real risk."],
    [PhonemeType.S]: ["Subjective sentiments suggest social shifts.", "Sociological studies show systemic stress.", "Sophisticated schemes support solid success."],
    [SentenceType.CONVERSATIONAL]: ["Assess the validity of a philosophical claim.", "Elaborate on the nuances of international law.", "Propose a solution to a global crisis."],
    [SentenceType.TONGUE_TWISTER]: ["Which witch wished which wicked wish?", "Six sleek swans swam swiftly."]
  },
  'K': { // Level 11 equivalent
    [PhonemeType.L]: ["Legislative loopholes limit legal leverage.", "Localized labor looks like literal logic.", "Longitudinal limits limit local learning."],
    [PhonemeType.R]: ["Reciprocal resonance requires real rapport.", "Remunerative research rewards robust rigor.", "Recurrent revelations regarding rare roots."],
    [PhonemeType.S]: ["Systemic stratification suggests social strife.", "Statistical standardizations support science.", "Structural stability supports stable systems."],
    [SentenceType.CONVERSATIONAL]: ["Deconstruct the narrative of a political speech.", "Theorize on the implications of AI ethics.", "Evaluate the legacy of a historical figure."],
    [SentenceType.TONGUE_TWISTER]: ["Strict strong speech students skip silly subjects.", "Toy boat, toy boat, toy boat."]
  },
  'L': { // Level 12 equivalent
    [PhonemeType.L]: ["The legislative branch meticulously evaluates constitutional amendments.", "Logistical limitations inevitably lead to longitudinal liability.", "Linguistic lexicography logically lists lexical levels."],
    [PhonemeType.R]: ["Regulatory requirements restrict rapid urban reconstruction projects.", "Rhetorical strategies are essential for persuasive professional writing.", "Renewable resource research remains remarkably relevant today."],
    [PhonemeType.S]: ["Systemic sociological shifts suggest substantial societal stress patterns.", "Scientific standards require specific and rigorous statistical significance.", "Sophisticated software systems support exceptionally complex calculations."],
    [SentenceType.CONVERSATIONAL]: ["Articulate the correlation between fiscal policy and social welfare.", "Critically examine the intersection of technology and human rights.", "Hypothesize about the long-term effects of global migration."],
    [SentenceType.TONGUE_TWISTER]: ["Imagine an imaginary menagerie manager managing an imaginary menagerie.", "Which witch wished which wicked wish?"]
  }
};

export const AI_PERSONA_PROMPT = `
You are Speech Pal, a professional speech pathologist. Your role is to assess and provide constructive feedback to students practicing speech sounds.
Your communication style must be adapted to the student's difficulty level:
- LEVELS A-D: Warm, encouraging, simple words, playful but professional.
- LEVELS E-H: Supportively mentor-like, clear, using slightly more academic terms.
- LEVELS I-L: Mature, professional, direct, focusing on clarity for adulthood and career success.
Focus on specific observations and actionable strategies.
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
