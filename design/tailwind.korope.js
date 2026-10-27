// Tailwind preset that maps utilities to Korope CSS variables (import korope-tokens.css globally).
// Usage: presets: [require('./tailwind.korope.js')]  ·  Dark mode: set data-theme="dark" on <html>.
const scale = (n) => Object.fromEntries([50,100,200,300,400,500,600,700,800,900].map(s => [s, `var(--${n}-${s})`]));
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: 'transparent', current: 'currentColor', white: '#FFFFFF',
      primary: scale('primary'), secondary: scale('secondary'), accent: scale('accent'),
      neutral: { 0: 'var(--neutral-0)', ...scale('neutral') },
      success: scale('success'), warning: scale('warning'), error: scale('error'), info: scale('info'),
      canvas: 'var(--bg-canvas)', surface: 'var(--bg-surface)', raised: 'var(--bg-surface-raised)', sunken: 'var(--bg-sunken)',
      brand: { DEFAULT: 'var(--action-primary)', pressed: 'var(--action-primary-pressed)', subtle: 'var(--bg-brand-subtle)' },
      highlight: { DEFAULT: 'var(--bg-highlight)', subtle: 'var(--bg-highlight-subtle)' },
      fg: { DEFAULT: 'var(--text-primary)', muted: 'var(--text-secondary)', disabled: 'var(--text-disabled)', brand: 'var(--text-brand)', onbrand: 'var(--text-on-brand)' },
      line: { subtle: 'var(--border-subtle)', DEFAULT: 'var(--border-default)', strong: 'var(--border-strong)', focus: 'var(--border-focus)' },
      route: 'var(--route-line)',
    },
    spacing: Object.fromEntries([0,2,4,8,12,16,20,24,32,40,48,64,96].map(n => [n, n === 0 ? '0' : `var(--space-${n})`])),
    borderRadius: { none: '0', xs: 'var(--radius-xs)', s: 'var(--radius-s)', m: 'var(--radius-m)', l: 'var(--radius-l)', xl: 'var(--radius-xl)', pill: 'var(--radius-pill)', circle: 'var(--radius-circle)' },
    boxShadow: { none: 'none', 1: 'var(--elevation-1)', 2: 'var(--elevation-2)', 3: 'var(--elevation-3)', 4: 'var(--elevation-4)' },
    fontFamily: { sans: 'var(--font-family)' },
    fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
    fontSize: Object.fromEntries(['display','h1','h2','h3','title','subtitle','body','caption','label'].map(t => [t, [`var(--type-${t}-size)`, { lineHeight: `var(--type-${t}-line)`, letterSpacing: `var(--type-${t}-tracking)`, fontWeight: `var(--type-${t}-weight)` }]])),
    transitionDuration: { instant: 'var(--duration-instant)', fast: 'var(--duration-fast)', base: 'var(--duration-base)', moderate: 'var(--duration-moderate)', slow: 'var(--duration-slow)' },
    transitionTimingFunction: { standard: 'var(--ease-standard)', enter: 'var(--ease-enter)', exit: 'var(--ease-exit)', sheet: 'var(--ease-sheet)', settle: 'var(--ease-settle)' },
    extend: { minHeight: { touch: 'var(--size-touch-min)' }, minWidth: { touch: 'var(--size-touch-min)' } },
  },
};
