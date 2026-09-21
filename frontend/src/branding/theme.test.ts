import { describe, expect, it } from 'vitest';
import { applyTheme, darken } from './theme';
import { DEFAULT_BRANDING } from './BrandingContext';

describe('theme', () => {
  it('darken oscurece un hex', () => {
    expect(darken('#2563eb', 0)).toBe('#2563eb');
    expect(darken('#ffffff', 1)).toBe('#000000');
    expect(darken('#2563eb', 0.18)).toBe('#1e51c1');
    expect(darken('no-es-color', 0.2)).toBe('#1d4ed8');
  });

  it('applyTheme fija las variables CSS', () => {
    applyTheme({ ...DEFAULT_BRANDING, primaryColor: '#0f766e', sidebarColor: '#14342b' });
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBe('#0f766e');
    expect(root.style.getPropertyValue('--sidebar')).toBe('#14342b');
    expect(root.style.getPropertyValue('--primary-dark')).toBe(darken('#0f766e', 0.18));
    applyTheme(DEFAULT_BRANDING);
  });
});
