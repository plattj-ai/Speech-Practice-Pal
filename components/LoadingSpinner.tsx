// components/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Loading...", className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-4 border-purple-200 border-t-purple-600"></div>
      <p className="mt-4 text-lg font-semibold text-gray-700">{message}</p>
    </div>
  );
};

export default LoadingSpinner;