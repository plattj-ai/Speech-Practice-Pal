// components/TimerDisplay.tsx
import React from 'react';
import { ACCENT_BLUE, TEXT_DARK } from '../constants';

interface TimerDisplayProps {
  timeLeft: number; // Time in seconds
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ timeLeft }) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center space-x-2">
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${ACCENT_BLUE}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className={`text-xl md:text-2xl font-bold ${TEXT_DARK}`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

export default TimerDisplay;