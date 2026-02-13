// components/FeedbackDisplay.tsx
import React from 'react';
import { TEXT_DARK } from '../constants';

interface FeedbackDisplayProps {
  sentence: string;
  errorWords: string[];
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ sentence, errorWords }) => {
  if (!sentence) return null; // Safety guard to prevent crash if sentence is undefined
  
  const words = sentence.split(/\s+/);

  return (
    <p 
      className={`text-center text-3xl md:text-4xl font-semibold leading-relaxed ${TEXT_DARK} p-4`}
      aria-live="polite" // Announce dynamic feedback to screen readers
    >
      {words.map((word, index) => {
        // Remove punctuation for comparison, but keep original for display
        const cleanedWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
        const isError = errorWords.some(err => err.toLowerCase() === cleanedWord);
        const originalPunctuation = word.match(/[.,!?;:]$/)?.[0] || '';
        const wordWithoutPunctuation = word.replace(/[.,!?;:]$/, '');

        return (
          <React.Fragment key={index}>
            <span
              className={`transition-colors duration-300 ${isError ? 'text-red-600 underline decoration-red-600 decoration-wavy' : ''}`}
            >
              {wordWithoutPunctuation}
            </span>
            {originalPunctuation}
            {index < words.length - 1 && ' '}
          </React.Fragment>
        );
      })}
    </p>
  );
};

export default FeedbackDisplay;