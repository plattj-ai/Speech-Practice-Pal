
// components/Header.tsx
import React from 'react';
import { APP_NAME, APP_SLOGAN, PRIMARY_PURPLE, TEXT_WHITE } from '../constants';
import { SessionState } from '../types';
import Button from './Button'; // Import the Button component

interface HeaderProps {
  sessionState: SessionState;
  onExitSession: () => void;
}

const Header: React.FC<HeaderProps> = ({ sessionState, onExitSession }) => {
  return (
    <header className={`${PRIMARY_PURPLE} p-4 shadow-md w-full`}>
      <div className="container mx-auto flex items-center justify-between"> 
        <div className="flex items-center">
          {/* Speech icon representing the core functionality of the app */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mr-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <path d="M9 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
            <path d="M12 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
            <path d="M15 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
          </svg>
          <div>
            <h1 className={`text-xl md:text-2xl font-bold ${TEXT_WHITE}`}>{APP_NAME}</h1>
            <p className={`text-xs ${TEXT_WHITE} opacity-90 italic`}>{APP_SLOGAN}</p>
          </div>
        </div>

        {/* Exit button to allow users to navigate back to the setup screen */}
        {(sessionState === SessionState.PRACTICE || sessionState === SessionState.LOADING || sessionState === SessionState.REPORT) && (
          <Button 
            variant="secondary" 
            onClick={onExitSession}
            className="bg-white !text-[#582D88] hover:bg-gray-100 py-2 px-4 text-sm font-bold border-none"
          >
            Exit
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
