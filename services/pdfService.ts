// services/pdfService.ts
import { ReportData } from '../types';
import { APP_NAME, APP_SLOGAN } from '../constants';
import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a PDF report of the speech practice session.
 * @param reportData The data to include in the report.
 */
export const generatePdfReport = (reportData: ReportData): void => {
  const doc = new jsPDF();
  const primaryColor = '#582D88'; 
  const accentColor = '#446CA3'; 
  const textColor = '#1E293B';
  const roseColor = '#F43F5E';
  const emeraldColor = '#10B981';
  const containerBg = '#F8FAFC';
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const printableWidth = pageWidth - (margin * 2);

  // 6 inches in mm is approx 152.4
  const containerWidth = 152.4; 
  const containerX = (pageWidth - containerWidth) / 2;
  const containerPadding = 10;
  const textWidth = containerWidth - (containerPadding * 2);

  let yOffset = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (yOffset + neededHeight > pageHeight - margin) {
      doc.addPage();
      yOffset = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text(APP_NAME, margin, yOffset);
  yOffset += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(accentColor);
  doc.text(APP_SLOGAN, margin, yOffset);
  yOffset += 15;

  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yOffset, pageWidth - margin, yOffset);
  yOffset += 15;

  // Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(textColor);
  doc.text("Clinical Progress Report", margin, yOffset);
  yOffset += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yOffset);
  yOffset += 15;

  // Clinical Data Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("Quantitative Data (Clinical Metrics)", margin, yOffset);
  yOffset += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const accuracy = Math.round((reportData.totalSentencesRead / (reportData.totalSentencesRead + reportData.totalErrors || 1)) * 100);

  const stats = [
    { label: "Difficulty Level", value: reportData.difficultyLevel },
    { label: "Target Phonemes", value: reportData.targetPhonemes.join(', ') },
    { label: "Planned Trials", value: reportData.totalSentencesInSession.toString() },
    { label: "Completed Trials", value: reportData.totalSentencesRead.toString() },
    { label: "Sentences Skipped", value: reportData.totalSentencesSkipped.toString(), color: reportData.totalSentencesSkipped > 0 ? roseColor : textColor },
    { label: "Total Articulation Errors", value: reportData.totalErrors.toString() },
    { label: "Overall Accuracy Percentage", value: `${accuracy}%`, color: accuracy > 80 ? emeraldColor : roseColor, bold: true }
  ];

  stats.forEach(stat => {
    if (stat.bold) doc.setFont('helvetica', 'bold');
    if (stat.color) doc.setTextColor(stat.color);
    
    doc.text(`${stat.label}:`, margin + 5, yOffset);
    doc.text(stat.value, margin + 75, yOffset);
    
    yOffset += 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
  });
  
  yOffset += 15;

  // Qualitative Analysis (6-inch wide container)
  doc.setFontSize(11);
  const qualitativeAnalysisLines = doc.splitTextToSize(reportData.qualitativeAnalysis, textWidth);
  const containerHeight = (qualitativeAnalysisLines.length * 7) + (containerPadding * 2);

  checkPageBreak(containerHeight + 20);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("SLP Qualitative Summary:", margin, yOffset);
  yOffset += 8;

  // Draw Container Box
  doc.setFillColor(containerBg);
  doc.setDrawColor('#E2E8F0');
  doc.roundedRect(containerX, yOffset, containerWidth, containerHeight, 3, 3, 'FD');
  
  let textY = yOffset + containerPadding + 4; // Initial padding
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  qualitativeAnalysisLines.forEach((line: string) => {
    if (textY > pageHeight - margin) {
        doc.addPage();
        textY = margin + containerPadding;
        yOffset = margin;
    }
    doc.text(line, containerX + containerPadding, textY);
    textY += 7;
  });
  
  yOffset += containerHeight + 15;

  // Error Log
  if (reportData.errorHistory.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("Phonetic Trial History:", margin, yOffset);
    yOffset += 10;
    
    reportData.errorHistory.forEach((attempt, idx) => {
      const errorCount = attempt.errors.length || 1;
      const estimatedHeight = 5 + 7 + (errorCount * 6) + 10;
      checkPageBreak(estimatedHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor);
      doc.text(`Trial ${idx + 1}: ${attempt.attempts > 1 ? `(Result after ${attempt.attempts} attempts)` : '(First attempt)'}`, margin + 5, yOffset);
      yOffset += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(textColor);
      const wrappedTarget = doc.splitTextToSize(`Target: "${attempt.expectedSentence}"`, printableWidth - 20);
      wrappedTarget.forEach((line: string) => {
        checkPageBreak(6);
        doc.text(line, margin + 10, yOffset);
        yOffset += 6;
      });
      
      if (attempt.errors.length > 0) {
          attempt.errors.forEach(err => {
              checkPageBreak(6);
              doc.setTextColor(roseColor);
              doc.text(`• ${err.word}: ${err.phonemeIssue}`, margin + 15, yOffset);
              yOffset += 6;
          });
      } else {
          checkPageBreak(6);
          doc.setTextColor(emeraldColor);
          doc.text(`• Correct articulation.`, margin + 15, yOffset);
          yOffset += 6;
      }
      yOffset += 4;
    });
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(accentColor);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated for clinical record by ${APP_NAME} | Page ${i} of ${pageCount}`, margin, pageHeight - 10);
  }

  doc.save(`Speech_Practice_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};