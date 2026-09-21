import type { Branding } from './BrandingContext';

/** Oscurece un hex (#rrggbb) por una fracción 0-1. */
export function darken(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '#1d4ed8';
  const num = parseInt(normalized, 16);
  const factor = 1 - Math.min(Math.max(amount, 0), 1);
  const red = Math.round(((num >> 16) & 0xff) * factor);
  const green = Math.round(((num >> 8) & 0xff) * factor);
  const blue = Math.round((num & 0xff) * factor);
  return `#${((red << 16) | (green << 8) | blue).toString(16).padStart(6, '0')}`;
}

/** Aplica los colores de la empresa como variables CSS. */
export function applyTheme(branding: Branding) {
  const root = document.documentElement;
  root.style.setProperty('--primary', branding.primaryColor);
  root.style.setProperty('--primary-dark', darken(branding.primaryColor, 0.18));
  root.style.setProperty('--sidebar', branding.sidebarColor);
}
