export const COLORS = {
  primary: {
    purple: '#9747FF',
    black: '#141414',
    offWhite: '#F8F4EB',
  },
  secondary: {
    stoneGrey: '#DAD7CE',
    surfaceLight: '#262626',
    textMuted: '#C7C7C7',
  },
  states: {
    error: '#BA0C2F',
    success: '#28C76F',
    warning: '#FFA726',
    info: '#29B6F6',
  },
  purpleVariants: {
    50: 'rgba(151, 71, 255, 0.05)',
    100: 'rgba(151, 71, 255, 0.1)',
    200: 'rgba(151, 71, 255, 0.2)',
    300: 'rgba(151, 71, 255, 0.3)',
    400: 'rgba(151, 71, 255, 0.4)',
    500: '#9747FF',
    600: '#8532FF',
    700: '#721DFF',
    800: '#5F08FF',
    900: '#4C00F2',
  },
} as const;

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '2.5rem',
  '3xl': '3rem',
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const TRANSITIONS = {
  DEFAULT: '0.3s ease-in-out',
  FAST: '0.15s ease-in-out',
  SLOW: '0.5s ease-in-out',
} as const; 