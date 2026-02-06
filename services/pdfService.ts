// services/pdfService.ts
import { ReportData } from '../types';
import { APP_NAME, APP_SLOGAN } from '../constants';
import { jsPDF } from 'jspdf'; // Import jsPDF as an ES module

/**
 * Generates and downloads a PDF report of the speech practice session.
 * @param reportData The data to include in the report.
 */
export const generatePdfReport = (reportData: ReportData): void => {
  // jsPDF is now imported, so no need to check window.jspdf or use window.jspdf.jsPDF
  const doc = new jsPDF();

  const primaryColor = '#582D88'; // From constants.ts
  const accentColor = '#446CA3'; // From constants.ts
  const textColor = '#333333';

  let yOffset = 20;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text(APP_NAME, 20, yOffset);
  yOffset += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(accentColor);
  doc.text(APP_SLOGAN, 20, yOffset);
  yOffset += 20;

  doc.setDrawColor(primaryColor);
  doc.line(20, yOffset - 5, 190, yOffset - 5); // Line separator

  // Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(textColor);
  doc.text("Practice Session Report", 20, yOffset);
  yOffset += 10;
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 20, yOffset);
  yOffset += 15;

  // Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("Session Summary:", 20, yOffset);
  yOffset += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`Difficulty Level: ${reportData.difficultyLevel}`, 25, yOffset);
  yOffset += 7;
  doc.text(`Sentences in Session: ${reportData.totalSentencesInSession}`, 25, yOffset);
  yOffset += 7;
  doc.text(`Sentence Type: ${reportData.sentenceType === 'conversational' ? 'Conversational' : 'Tongue Twister'}`, 25, yOffset);
  yOffset += 7;
  doc.text(`Total Sentences Read: ${reportData.totalSentencesRead}`, 25, yOffset);
  yOffset += 7;
  doc.text(`Total Pronunciation Errors: ${reportData.totalErrors}`, 25, yOffset);
  yOffset += 10;

  // Qualitative Analysis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("Qualitative Analysis (Speech Pal's Notes):", 20, yOffset);
  yOffset += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const qualitativeAnalysisLines = doc.splitTextToSize(reportData.qualitativeAnalysis, 160); // 160mm width
  doc.text(qualitativeAnalysisLines, 25, yOffset);
  yOffset += (qualitativeAnalysisLines.length * 7) + 10;

  // Difficult Sounds
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("Areas for Practice:", 20, yOffset);
  yOffset += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const difficultSoundsLines = doc.splitTextToSize(reportData.difficultSoundsAnalysis, 160);
  doc.text(difficultSoundsLines, 25, yOffset);
  yOffset += (difficultSoundsLines.length * 7) + 10;

  // Error Details
  if (reportData.errorHistory.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("Detailed Error Log:", 20, yOffset);
    yOffset += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    reportData.errorHistory.forEach((sessionAttempt, sessionIndex) => {
      if (yOffset > 270) { // Check for new page
        doc.addPage();
        yOffset = 20;
      }
      doc.setTextColor(primaryColor);
      doc.text(`--- Sentence Attempt ${sessionIndex + 1} (Try ${sessionAttempt.attempts}) ---`, 25, yOffset);
      yOffset += 5;
      doc.setTextColor(textColor);
      doc.text(`Expected: "${sessionAttempt.expectedSentence}"`, 30, yOffset);
      yOffset += 5;
      doc.text(`Spoken: "${sessionAttempt.spokenSentence}"`, 30, yOffset);
      yOffset += 5;

      if (sessionAttempt.errors.length > 0) {
        doc.setFontSize(10);
        sessionAttempt.errors.forEach((error, errorIndex) => {
          if (yOffset > 270) { // Check for new page within an attempt's errors
            doc.addPage();
            doc.setTextColor(primaryColor);
            doc.text(`--- Sentence Attempt ${sessionIndex + 1} (cont.) ---`, 25, 20); // Add continuation header
            yOffset = 25; // Reset yOffset for new page
          }
          doc.setTextColor(accentColor);
          doc.text(`  • Problem Word: ${error.word}`, 35, yOffset);
          yOffset += 5;
          if (error.errorType) {
            doc.text(`    Type: ${error.errorType}`, 40, yOffset);
            yOffset += 5;
          }
          doc.text(`    Issue: ${error.phonemeIssue}`, 40, yOffset);
          yOffset += 5;
          doc.text(`    Suggestion: ${error.suggestion}`, 40, yOffset);
          yOffset += 7;
        });
      } else {
        doc.setTextColor('#388E3C'); // Green color for no errors
        doc.text(`  No specific errors identified for this attempt.`, 30, yOffset);
        yOffset += 7;
      }
      yOffset += 5; // Extra space after each attempt's log
    });
  }

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(accentColor);
  doc.text(`Generated by ${APP_NAME}`, 20, doc.internal.pageSize.height - 10);
  doc.text(`Page 1 of ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);


  doc.save(`Speech_Practice_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};
