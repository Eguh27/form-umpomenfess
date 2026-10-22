/**
 * themeUtils.ts — petakan tampilan tema form utk preview/inject (zona B).
 * Font dari whitelist schema; stack CSS masing-masing dipetakan di sini.
 */
import type { FormFont, FormTheme } from '../../lib/forms/schema';
import type { CSSProperties } from 'react';

export function fontStack(font: FormFont): string {
  switch (font) {
    case 'Poppins':
      return "'Poppins', system-ui, sans-serif";
    case 'Inter':
      return "'Inter', system-ui, sans-serif";
    case 'Georgia':
      return "Georgia, 'Times New Roman', serif";
    case 'system-ui':
      return "system-ui, -apple-system, 'Segoe UI', sans-serif";
  }
}

/** Inline style pembungkus preview sesuai tema pemilih. */
export function themeToStyle(t: FormTheme): CSSProperties {
  return {
    background: t.bg,
    color: t.text,
    fontFamily: fontStack(t.font),
  };
}

export const HEADING_SIZE_REM: Record<string, string> = {
  s: '1.15rem',
  m: '1.5rem',
  l: '2rem',
  xl: '2.6rem',
};

/** URL aman publicId → URL disampaikan (hanya host Cloudinary project ini). */
export function cloudinaryUrl(publicId: string, cloudName: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`;
}
