// components/Header.tsx
import React from 'react';
import { APP_NAME, APP_SLOGAN, PRIMARY_PURPLE, TEXT_WHITE } from '../constants';

const Header: React.FC = () => {
  return (
    <header className={`${PRIMARY_PURPLE} p-4 shadow-md w-full`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          {/* Placeholder for a logo, similar to the screenshot */}
          <div className="bg-yellow-400 p-2 rounded-full mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9l1.414-1.414A9 9 0 0118 9.9V12h-.002l1.412 1.412a3 3 0 11-4.243 4.243L12 15.536l-1.414 1.414a3 3 0 11-4.243-4.243L6 12h-.002V9.9A9 9 0 0118.293 4.293zM13 7h-2" />
            </svg>
          </div>
          <div>
            <h1 className={`text-xl md:text-2xl font-bold ${TEXT_WHITE}`}>{APP_NAME}</h1>
            <p className={`text-sm md:text-base italic ${TEXT_WHITE}`}>{APP_SLOGAN}</p>
          </div>
        </div>
        {/* Navigation links (simplified for this app, can be expanded) */}
        <nav className="hidden md:flex space-x-6">
          <a href="#" className={`font-semibold ${TEXT_WHITE} hover:text-gray-300 transition-colors`}>Home</a>
          <a href="#" className={`font-semibold ${TEXT_WHITE} hover:text-gray-300 transition-colors`}>About</a>
          <a href="#" className={`font-semibold ${TEXT_WHITE} hover:text-gray-300 transition-colors`}>Contact</a>
        </nav>
      </div>
    </header>
  );
};

export default Header;