// components/ReportModal.tsx
import React from 'react';
import { ReportData } from '../types';
import Button from './Button';
import { generatePdfReport } from '../services/pdfService';
import { PRIMARY_PURPLE, ACCENT_BLUE, TEXT_DARK } from '../constants';

interface ReportModalProps {
  reportData: ReportData;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ reportData, onClose }) => {
  if (!reportData) return null;

  const handleDownload = () => {
    generatePdfReport(reportData);
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
          <h3 className={`text-xl md:text-2xl font-semibold ${TEXT_DARK} mb-4`}>Session Overview</h3>
          <p><strong className={ACCENT_BLUE}>Duration:</strong> {reportData.sessionDurationMinutes} minutes</p>
          <p><strong className={ACCENT_BLUE}>Sentences Read:</strong> {reportData.totalSentencesRead}</p>
          <p><strong className={ACCENT_BLUE}>Total Errors Detected:</strong> {reportData.totalErrors}</p>

          <h3 className={`text-xl md:text-2xl font-semibold ${TEXT_DARK} mt-6 mb-4`}>Ms. Emily's Feedback</h3>
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

        <div className="sticky bottom-0 bg-white p-4 border-t flex justify-end gap-3 rounded-b-lg">
          <Button onClick={onClose} variant="secondary" className="min-w-[120px]">Close</Button>
          <Button onClick={handleDownload} className="min-w-[120px]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l3-3m-3 3l-3-3m-3 8h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;