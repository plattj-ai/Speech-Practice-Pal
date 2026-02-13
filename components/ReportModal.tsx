// components/ReportModal.tsx
import React, { useState, useEffect } from 'react';
import { ReportData } from '../types';
import Button from './Button';
import { generatePdfReport } from '../services/pdfService';
import { generateBadgeImage } from '../services/badgeService';

interface ReportModalProps {
  reportData: ReportData;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ reportData, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [badgePreviewUrl, setBadgePreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const createPreview = async () => {
      try {
        const url = await generateBadgeImage(reportData);
        setBadgePreviewUrl(url);
      } catch (err) {
        console.error("Failed to generate badge preview", err);
      }
    };
    createPreview();
  }, [reportData]);

  if (!reportData) return null;

  const handleSaveReport = async () => {
    setIsGenerating(true);
    try {
      generatePdfReport(reportData);
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto"
      role="dialog" // Indicate this is a dialog window
      aria-modal="true" // Indicate that content outside the dialog is inert
      aria-label="Speech practice session report" // Provide an accessible label for the dialog
    >
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl animate-scaleIn overflow-hidden my-auto">
        {/* Header */}
        <div className={`sticky top-0 bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-6 flex justify-between items-center shadow-lg z-10`}>
          <div>
            <h2 className="text-3xl font-black tracking-tight">Practice Complete!</h2>
            <p className="text-purple-100 text-sm opacity-90 font-medium">Session Summary & Achievements</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close report" // More specific aria-label for clarity
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 md:p-10 flex flex-col items-center">
          {/* Only the Badge Display */}
          <div className="flex flex-col items-center text-center space-y-6 w-full">
            <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">You Earned a Badge!</h3>
            
            {badgePreviewUrl ? (
              <div className="relative group animate-fadeIn w-full max-w-2xl">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                <img 
                  src={badgePreviewUrl} 
                  alt="Speech Star Badge representing your session achievements" // Descriptive alt text for accessibility
                  className="relative rounded-2xl shadow-2xl w-full border-4 border-white transform hover:scale-[1.01] transition-transform mx-auto"
                />
              </div>
            ) : (
              <div className="w-full h-96 bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 italic">
                Polishing your star...
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-center items-center gap-6">
          <Button onClick={handleSaveReport} isLoading={isGenerating} className="bg-emerald-600 hover:bg-emerald-700 shadow-xl px-12 py-4 text-xl">
            Save my report
          </Button>
          
          <Button onClick={onClose} variant="secondary" className="px-12 py-4 text-xl !bg-white !text-purple-800 border-2 border-purple-200 hover:!bg-purple-50">
            Start New Session
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;