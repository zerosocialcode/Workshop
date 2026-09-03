import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import QRCodeStyling from 'qr-code-styling';
import { QRStyleConfig } from '../types';

export async function createQRCodeInstance(
  payload: string,
  style: QRStyleConfig,
  sizePx: number = 1000
): Promise<QRCodeStyling> {
  const gradientConfig =
    style.dotColor.type !== 'none'
      ? {
          type: style.dotColor.type,
          rotation: (style.dotColor.rotation * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: style.dotColor.color1 },
            { offset: 1, color: style.dotColor.color2 },
          ],
        }
      : undefined;

  let imageSrc = style.logo.src;
  if (!imageSrc && style.logo.presetIcon) {
    imageSrc = style.logo.presetIcon;
  }

  const qrInstance = new QRCodeStyling({
    width: sizePx,
    height: sizePx,
    type: 'canvas',
    data: payload,
    image: imageSrc || undefined,
    margin: style.margin,
    qrOptions: {
      errorCorrectionLevel: style.errorCorrectionLevel,
    },
    imageOptions: {
      hideBackgroundDots: style.logo.hideBackgroundDots,
      imageSize: style.logo.size,
      margin: style.logo.margin,
      crossOrigin: 'anonymous',
    },
    dotsOptions: {
      type: style.dotType,
      color: style.dotColor.type === 'none' ? style.dotColor.color1 : undefined,
      gradient: gradientConfig,
    },
    cornersSquareOptions: {
      type: style.cornerSquareType,
      color: style.cornerSquareColor || style.dotColor.color1,
    },
    cornersDotOptions: {
      type: style.cornerDotType,
      color: style.cornerDotColor || style.dotColor.color1,
    },
    backgroundOptions: {
      color: style.isTransparent ? 'transparent' : style.backgroundColor,
    },
  });

  return qrInstance;
}

export async function renderQRToCanvas(
  payload: string,
  style: QRStyleConfig,
  targetResolution: number = 1024
): Promise<HTMLCanvasElement> {
  const baseSize = targetResolution;
  const qrInstance = await createQRCodeInstance(payload, style, baseSize);
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = baseSize;
  rawCanvas.height = baseSize;

  const rawBlob = await qrInstance.getRawData('png');
  if (!rawBlob) {
    throw new Error('Failed to generate raw QR image data');
  }

  const rawUrl = URL.createObjectURL(rawBlob as Blob);
  const qrImg = await loadImage(rawUrl);
  URL.revokeObjectURL(rawUrl);

  // If no frame is applied, return the raw QR canvas directly
  if (style.frame.type === 'none') {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = baseSize;
    finalCanvas.height = baseSize;
    const ctx = finalCanvas.getContext('2d')!;
    if (!style.isTransparent) {
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(0, 0, baseSize, baseSize);
    }
    ctx.drawImage(qrImg, 0, 0, baseSize, baseSize);
    return finalCanvas;
  }

  // Handle framed QR layouts
  const finalCanvas = document.createElement('canvas');
  const ctx = finalCanvas.getContext('2d')!;

  const frameType = style.frame.type;
  const frameText = style.frame.text || 'SCAN ME';
  const frameSubtext = style.frame.subtext || '';
  const bgColor = style.frame.bgColor || '#0f172a';
  const textColor = style.frame.textColor || '#ffffff';

  if (frameType === 'bottom-banner' || frameType === 'top-banner') {
    const bannerHeight = Math.round(baseSize * 0.16);
    finalCanvas.width = baseSize;
    finalCanvas.height = baseSize + bannerHeight;

    // Fill background
    ctx.fillStyle = style.isTransparent ? 'transparent' : style.backgroundColor;
    if (!style.isTransparent) {
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    }

    const qrY = frameType === 'top-banner' ? bannerHeight : 0;
    const bannerY = frameType === 'top-banner' ? 0 : baseSize;

    // Draw QR code
    ctx.drawImage(qrImg, 0, qrY, baseSize, baseSize);

    // Draw banner background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, bannerY, baseSize, bannerHeight);

    // Draw banner text
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.round(bannerHeight * 0.44)}px ${style.frame.fontFamily || 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frameText, baseSize / 2, bannerY + bannerHeight / 2);
  } else if (frameType === 'polaroid') {
    const padding = Math.round(baseSize * 0.08);
    const bottomPadding = Math.round(baseSize * 0.26);
    finalCanvas.width = baseSize + padding * 2;
    finalCanvas.height = baseSize + padding + bottomPadding;

    // Outer polaroid card
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, finalCanvas.width, finalCanvas.height, 12);
    ctx.fill();

    if (!style.isTransparent) {
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(padding, padding, baseSize, baseSize);
    }

    ctx.drawImage(qrImg, padding, padding, baseSize, baseSize);

    // Draw text
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(baseSize * 0.052)}px ${style.frame.fontFamily || 'sans-serif'}`;
    ctx.fillText(frameText, finalCanvas.width / 2, baseSize + padding + bottomPadding * 0.45);

    if (frameSubtext) {
      ctx.font = `500 ${Math.round(baseSize * 0.034)}px ${style.frame.fontFamily || 'sans-serif'}`;
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.75;
      ctx.fillText(frameSubtext, finalCanvas.width / 2, baseSize + padding + bottomPadding * 0.75);
      ctx.globalAlpha = 1.0;
    }
  } else if (frameType === 'pill' || frameType === 'badge') {
    const bannerHeight = Math.round(baseSize * 0.15);
    const padding = Math.round(baseSize * 0.06);
    finalCanvas.width = baseSize + padding * 2;
    finalCanvas.height = baseSize + padding * 2 + bannerHeight;

    if (!style.isTransparent) {
      ctx.fillStyle = style.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(0, 0, finalCanvas.width, finalCanvas.height, 12);
      ctx.fill();
    }

    ctx.drawImage(qrImg, padding, padding, baseSize, baseSize);

    const pillW = Math.round(baseSize * 0.7);
    const pillH = bannerHeight;
    const pillX = (finalCanvas.width - pillW) / 2;
    const pillY = baseSize + padding;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 4);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.round(pillH * 0.42)}px ${style.frame.fontFamily || 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frameText, finalCanvas.width / 2, pillY + pillH / 2);
  } else {
    finalCanvas.width = baseSize;
    finalCanvas.height = baseSize;
    ctx.drawImage(qrImg, 0, 0, baseSize, baseSize);
  }

  return finalCanvas;
}

export async function renderQRToSVG(payload: string, style: QRStyleConfig): Promise<string> {
  const qrInstance = await createQRCodeInstance(payload, style, 1024);
  const rawBlob = await qrInstance.getRawData('svg');
  if (!rawBlob) throw new Error('Could not generate SVG');
  return await (rawBlob as Blob).text();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string = 'qrcode.png') {
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadQRSVG(payload: string, style: QRStyleConfig, filename: string = 'qrcode.svg') {
  const qrInstance = await createQRCodeInstance(payload, style, 1024);
  const rawBlob = await qrInstance.getRawData('svg');
  if (!rawBlob) throw new Error('Could not generate SVG');
  const url = URL.createObjectURL(rawBlob as Blob);
  const link = document.createElement('a');
  link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          resolve(true);
        } catch {
          resolve(false);
        }
      }, 'image/png');
    });
  } catch {
    return false;
  }
}

export async function exportToPDF(
  canvas: HTMLCanvasElement,
  title: string = 'QR Code Asset',
  mode: 'single' | 'sheet' = 'single'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const imgData = canvas.toDataURL('image/png');

  if (mode === 'single') {
    doc.setFont('courier', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(35, 38, 31);
    doc.text(title.toUpperCase(), pageWidth / 2, 28, { align: 'center' });

    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(99, 96, 78);
    doc.text(`SPECIFICATION SHEET // ${new Date().toLocaleDateString()}`, pageWidth / 2, 36, {
      align: 'center',
    });

    const qrSizeMm = 120;
    const x = (pageWidth - qrSizeMm) / 2;
    const y = 55;
    doc.addImage(imgData, 'PNG', x, y, qrSizeMm, qrSizeMm * (canvas.height / canvas.width));

    doc.setDrawColor(199, 187, 152);
    doc.setLineDashPattern([2, 2], 0);
    doc.roundedRect(x - 5, y - 5, qrSizeMm + 10, (qrSizeMm * (canvas.height / canvas.width)) + 10, 1, 1);

    doc.setFontSize(9);
    doc.setTextColor(99, 96, 78);
    doc.text('PRINT AT 100% SCALE FOR CALIBRATED OPTICAL SCANNING.', pageWidth / 2, 260, {
      align: 'center',
    });
  } else {
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(35, 38, 31);
    doc.text(`${title.toUpperCase()} // 3x3 STICKER MATRIX`, pageWidth / 2, 18, { align: 'center' });

    const cols = 3;
    const rows = 3;
    const marginX = 18;
    const marginY = 26;
    const itemW = 50;
    const itemH = itemW * (canvas.height / canvas.width);
    const spacingX = (pageWidth - marginX * 2 - cols * itemW) / (cols - 1);
    const spacingY = (pageHeight - marginY * 2 - rows * itemH) / (rows - 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = marginX + c * (itemW + spacingX);
        const y = marginY + r * (itemH + spacingY);

        doc.addImage(imgData, 'PNG', x, y, itemW, itemH);
        doc.setDrawColor(199, 187, 152);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.roundedRect(x - 2, y - 2, itemW + 4, itemH + 4, 1, 1);
      }
    }
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_spec.pdf`);
}

export async function createBatchZip(
  items: { filename: string; canvas: HTMLCanvasElement }[]
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('qr_codes');

  for (const item of items) {
    const dataUrl = item.canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    folder?.file(`${item.filename}.png`, base64Data, { base64: true });
  }

  return await zip.generateAsync({ type: 'blob' });
}
