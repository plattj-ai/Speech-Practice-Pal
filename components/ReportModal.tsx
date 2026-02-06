// components/ReportModal.tsx
import React, { useState } from 'react';
import { ReportData } from '../types';
import Button from './Button';
import { generatePdfReport } from '../services/pdfService';
import { generateBadgeImage, downloadDataUrl } from '../services/badgeService';
import { PRIMARY_PURPLE, ACCENT_BLUE, TEXT_DARK } from '../constants';

interface ReportModalProps {
  reportData: ReportData;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ reportData, onClose }) => {
  const [isGeneratingBadge, setIsGeneratingBadge] = useState(false);
  
  if (!reportData) return null;

  const handleDownloadPdf = () => {
    generatePdfReport(reportData);
  };

  const handleDownloadBadge = async () => {
    setIsGeneratingBadge(true);
    try {
      const pngData = await generateBadgeImage(reportData);
      downloadDataUrl(pngData, `Speech_Star_Badge_${new Date().toISOString().slice(0, 10)}.png`);
    } catch (error) {
      console.error("Failed to generate badge:", error);
    } finally {
      setIsGeneratingBadge(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4 sm:p-6">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0 animate-scaleIn">
        <div className={`sticky top-0 ${PRIMARY_PURPLE} text-white p-4 rounded-t-lg flex justify-between items-center`}>
          <h2 className="text-2xl font-bold">Practice Report</h2>
          <Button variant="secondary" onClick={onClose} className="px-3 py-1 bg-white text-purple-700 hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="p-6 text-base md:text-lg leading-relaxed">
          {/* Achievement Banner */}
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl border-2 border-purple-200 text-center shadow-sm">
            <div className="flex justify-center mb-4">
               <div className="bg-yellow-400 p-4 rounded-full shadow-lg ring-4 ring-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
               </div>
            </div>
            <h3 className="text-2xl font-black text-purple-800 uppercase tracking-tighter">Session Complete!</h3>
            <p className="text-purple-600 font-medium">You worked hard today. Don't forget to download your Speech Star Badge!</p>
          </div>

          <h3 className={`text-xl md:text-2xl font-semibold ${TEXT_DARK} mb-4`}>Session Overview</h3>
          <p><strong className={ACCENT_BLUE}>Difficulty Level:</strong> {reportData.difficultyLevel}</p>
          <p><strong className={ACCENT_BLUE}>Total Sentences for Session:</strong> {reportData.totalSentencesInSession}</p>
          <p><strong className={ACCENT_BLUE}>Sentences Read:</strong> {reportData.totalSentencesRead}</p>
          <p><strong className={ACCENT_BLUE}>Total Errors Detected:</strong> {reportData.totalErrors}</p>

          <h3 className={`text-xl md:text-2xl font-semibold ${TEXT_DARK} mt-6 mb-4`}>Speech Pal's Feedback</h3>
          <p className="whitespace-pre-wrap">{reportData.qualitativeAnalysis}</p>

          <h3 className={`text-xl md:text-2xl font-semibold ${TEXT_DARK} mt-6 mb-4`}>Areas for Practice</h3>
          <p className="whitespace-pre-wrap">{reportData.difficultSoundsAnalysis}</p>

          {reportData.errorHistory.length > 0 && (
            <>
              <h3 className={`text-xl md:text-2xl font-semibold ${TEXT_DARK} mt-6 mb-4`}>Detailed Error Log</h3>
              <div className="space-y-4">
                {reportData.errorHistory.map((sessionAttempt, sessionIndex) => (
                  <div key={sessionIndex} className="border-l-4 border-gray-400 pl-4 py-2 bg-gray-50 bg-opacity-50 rounded">
                    <p><strong>Sentence Attempt {sessionIndex + 1}:</strong> (Try {sessionAttempt.attempts})</p>
                    <p>Expected: <span className="font-medium italic">"{sessionAttempt.expectedSentence}"</span></p>
                    <p>Spoken: <span className="font-medium">"{sessionAttempt.spokenSentence}"</span></p>
                    {sessionAttempt.errors.length > 0 ? (
                      <div className="ml-4 mt-2 space-y-2">
                        {sessionAttempt.errors.map((error, errorIndex) => (
                          <div key={errorIndex} className="border-l-2 border-red-500 pl-3">
                            <p className="text-red-700"><strong>Problem Word:</strong> {error.word}</p>
                            {error.errorType && <p><strong>Error Type:</strong> {error.errorType}</p>}
                            <p><strong>Issue:</strong> {error.phonemeIssue}</p>
                            <p className="text-purple-700"><strong>Suggestion:</strong> <em>{error.suggestion}</em></p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-green-700 mt-2">No specific errors identified for this attempt.</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white p-4 border-t flex flex-wrap justify-end gap-3 rounded-b-lg">
          <Button onClick={onClose} variant="secondary" className="min-w-[100px]">Close</Button>
          
          <Button onClick={handleDownloadBadge} isLoading={isGeneratingBadge} className="min-w-[150px] bg-yellow-500 hover:bg-yellow-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Download Badge (PNG)
          </Button>

          <Button onClick={handleDownloadPdf} className="min-w-[150px]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l3-3m-3 3l-3-3m-3 8h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Download Report (PDF)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
