export interface ContrastResult {
  ratio: number;
  score: 'excellent' | 'good' | 'warning' | 'poor';
  message: string;
  reliabilityPercent: number;
  isLightBg: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  let clean = (hex || '#000000').replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrastRatio(fgColor: string, bgColor: string): number {
  const [r1, g1, b1] = hexToRgb(fgColor);
  const [r2, g2, b2] = hexToRgb(bgColor);

  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function getContrastGrade(ratio: number): {
  grade: string;
  label: string;
  isAcceptable: boolean;
} {
  if (ratio >= 7.0) {
    return { grade: 'AAA', label: 'OPTIMAL (AAA)', isAcceptable: true };
  } else if (ratio >= 4.5) {
    return { grade: 'AA', label: 'COMPLIANT (AA)', isAcceptable: true };
  } else if (ratio >= 3.0) {
    return { grade: 'CAUTION', label: 'MARGINAL (3:1)', isAcceptable: true };
  } else {
    return { grade: 'FAIL', label: 'INSUFFICIENT CONTRAST', isAcceptable: false };
  }
}

export function evaluateContrast(
  fgColor: string,
  bgColor: string,
  isTransparent: boolean
): ContrastResult {
  if (isTransparent) {
    return {
      ratio: 10,
      score: 'good',
      message: 'Transparent background (Ensure target surface has high contrast)',
      reliabilityPercent: 95,
      isLightBg: true,
    };
  }

  const [r1, g1, b1] = hexToRgb(fgColor);
  const [r2, g2, b2] = hexToRgb(bgColor);

  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const ratio = (brightest + 0.05) / (darkest + 0.05);
  const isLightBg = lum2 > lum1;

  if (ratio >= 7.0) {
    return {
      ratio: Number(ratio.toFixed(1)),
      score: 'excellent',
      message: 'Excellent optical contrast. Scans instantly in any lighting condition.',
      reliabilityPercent: 99.9,
      isLightBg,
    };
  } else if (ratio >= 4.5) {
    return {
      ratio: Number(ratio.toFixed(1)),
      score: 'good',
      message: 'Good contrast. Meets ISO standards for QR code scanning.',
      reliabilityPercent: 98,
      isLightBg,
    };
  } else if (ratio >= 2.8) {
    return {
      ratio: Number(ratio.toFixed(1)),
      score: 'warning',
      message: 'Moderate contrast. Older or low-light smartphone cameras might struggle.',
      reliabilityPercent: 78,
      isLightBg,
    };
  } else {
    return {
      ratio: Number(ratio.toFixed(1)),
      score: 'poor',
      message: 'Critically low contrast! Most smartphone cameras will fail to decode.',
      reliabilityPercent: 35,
      isLightBg,
    };
  }
}
