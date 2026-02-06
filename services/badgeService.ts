// services/badgeService.ts
import { ReportData } from '../types';

/**
 * Generates a PNG badge image using HTML5 Canvas and triggers a download.
 * @param reportData The data to summarize on the badge.
 */
export const generateBadgeImage = async (reportData: ReportData): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error("Could not initialize canvas context");

  // Colors
  const primaryPurple = '#582D88';
  const secondaryBlue = '#446CA3';
  const backgroundLight = '#F3E8FF';
  const gold = '#D4AF37';

  // 1. Background & Border
  ctx.fillStyle = backgroundLight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Fancy double border
  ctx.strokeStyle = primaryPurple;
  ctx.lineWidth = 15;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  
  ctx.strokeStyle = gold;
  ctx.lineWidth = 5;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  // 2. Title Section
  ctx.fillStyle = primaryPurple;
  ctx.font = 'bold 50px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SPEECH STAR AWARD', canvas.width / 2, 120);

  ctx.fillStyle = secondaryBlue;
  ctx.font = 'italic 25px Arial';
  ctx.fillText('Proudly Presented To A Great Communicator', canvas.width / 2, 160);

  // 3. Speech Pal's Seal (Circle)
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 280, 80, 0, Math.PI * 2);
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.strokeStyle = primaryPurple;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('Speech Pal', canvas.width / 2, 275);
  ctx.fillText('APPROVED', canvas.width / 2, 305);

  // 4. Statistics Section
  ctx.fillStyle = '#333';
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Session Summary:', 100, 420);

  ctx.font = '24px Arial';
  const dateStr = new Date().toLocaleDateString();
  ctx.fillText(`Date: ${dateStr}`, 120, 460);
  ctx.fillText(`Sentences Practiced: ${reportData.totalSentencesRead}`, 120, 500);
  ctx.fillText(`Difficulty Level: ${reportData.difficultyLevel}`, 120, 540);
  
  const targetText = reportData.targetPhoneme && reportData.targetPhoneme !== 'MIX' 
    ? `Target Sound: /${reportData.targetPhoneme.toLowerCase()}/` 
    : 'Target: General Practice';
  ctx.fillText(targetText, 120, 580);

  // 5. Success Message
  ctx.textAlign = 'right';
  ctx.fillStyle = primaryPurple;
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Great Work Today!', 700, 460);
  
  ctx.font = 'italic 20px Arial';
  ctx.fillText('Speech Pal', 700, 500);

  // Return PNG data URL
  return canvas.toDataURL('image/png');
};

/**
 * Utility to trigger a file download from a data URL.
 */
export const downloadDataUrl = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
