// services/badgeService.ts
import { ReportData } from '../types';

/**
 * Generates a PNG badge image using HTML5 Canvas.
 * @param reportData The data to summarize on the badge.
 */
export const generateBadgeImage = async (reportData: ReportData): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  
  // Calculate required height based on wrap length of qualitative analysis
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not initialize canvas context");

  const primaryPurple = '#582D88';
  const secondaryBlue = '#446CA3';
  const backgroundLight = '#F8FAFC';
  const gold = '#F59E0B';
  const emerald = '#10B981';
  const rose = '#F43F5E';

  const textToWrap = `Coach Summary: ${reportData.qualitativeAnalysis}`;
  ctx.font = 'italic bold 20px Arial';
  const maxWidth = 680;
  const lineHeight = 30;
  
  const getWrappedLines = (text: string, maxWidth: number) => {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      let word = words[i];
      let width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    const wrappedWords = text.split(' ');
    let currentLineManual = '';
    const linesManual = [];
    wrappedWords.forEach(word => {
        const testLine = currentLineManual + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
            linesManual.push(currentLineManual);
            currentLineManual = word + ' ';
        } else {
            currentLineManual = testLine;
        }
    });
    linesManual.push(currentLineManual);
    return linesManual;
  };

  const lines = getWrappedLines(textToWrap, maxWidth);
  const baseHeight = 650;
  const additionalHeight = Math.max(0, (lines.length - 2) * lineHeight);
  canvas.height = baseHeight + additionalHeight + 40; // Add some padding

  // Redraw Background & Border now that height is set
  ctx.fillStyle = backgroundLight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 200);
  gradient.addColorStop(0, '#582D88');
  gradient.addColorStop(1, '#446CA3');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, 200);

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

  // Title Section
  ctx.fillStyle = 'white';
  ctx.font = 'bold 50px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SPEECH STAR AWARD', canvas.width / 2, 90);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = 'italic 20px Arial';
  ctx.fillText('Student Practice Summary & Achievement', canvas.width / 2, 130);

  // Star Graphic
  const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'white';
    ctx.stroke();
    ctx.fillStyle = gold;
    ctx.fill();
  };
  drawStar(canvas.width / 2, 280, 5, 80, 40);

  // Statistics Section
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('STUDENT PRACTICE DATA:', 60, 420);

  ctx.fillStyle = 'white';
  if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(50, 435, 700, 180, 20);
      ctx.fill();
  } else {
      ctx.fillRect(50, 435, 700, 180);
  }

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 18px Arial';
  const total = reportData.totalSentencesInSession;
  const read = reportData.totalSentencesRead;
  const skipped = reportData.totalSentencesSkipped;
  const accuracy = Math.round((read / (read + reportData.totalErrors || 1)) * 100);

  ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 80, 470);
  ctx.fillText(`Difficulty Level: ${reportData.difficultyLevel}`, 80, 500);
  ctx.fillText(`Total Planned Sentences: ${total}`, 80, 530);
  ctx.fillText(`Target Sounds: ${reportData.targetPhonemes.join(', ')}`, 80, 560);

  ctx.fillText(`Successfully Read: ${read}`, 420, 470);
  ctx.fillStyle = skipped > 0 ? rose : '#475569';
  ctx.fillText(`Sentences Skipped: ${skipped}`, 420, 500);
  ctx.fillStyle = accuracy < 80 ? rose : emerald;
  ctx.fillText(`Phonetic Accuracy: ${accuracy}%`, 420, 530);
  ctx.fillStyle = '#475569';
  ctx.fillText(`Total Misarticulations: ${reportData.totalErrors}`, 420, 560);

  // Qualitative Feedback wrapping - use precalculated lines
  ctx.textAlign = 'center';
  ctx.fillStyle = primaryPurple;
  ctx.font = 'italic bold 20px Arial';
  
  let currentY = 640;
  lines.forEach(line => {
      ctx.fillText(line, canvas.width / 2, currentY);
      currentY += lineHeight;
  });

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