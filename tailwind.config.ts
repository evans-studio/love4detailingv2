import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // ShadCN variables (using CSS variables)
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        
        // Love4Detailing specific colors
        l4d: {
          success: "var(--success)",
          warning: "var(--warning)",
          info: "var(--info)",
        },
        
        // Keep existing brand colors for compatibility
        'off-white': '#F8F4EB',
        stone: '#DAD7CE',
        surface: '#262626',
        error: '#BA0C2F',
        success: '#28C76F',
        warning: '#FFA726',
        info: '#29B6F6',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Glass-morphism specific utilities
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      // Mobile-first breakpoints
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      // Glass-morphism transparency variations
      opacity: {
        '15': '0.15',
        '35': '0.35',
        '65': '0.65',
        '85': '0.85',
      },
      // Premium transition timing functions
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'premium-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'premium-smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      // Premium box shadows
      boxShadow: {
        'premium': '0 4px 15px rgba(151, 71, 255, 0.25)',
        'premium-lg': '0 8px 25px rgba(151, 71, 255, 0.4)',
        'premium-xl': '0 12px 35px rgba(151, 71, 255, 0.5)',
        'glow': '0 0 20px rgba(151, 71, 255, 0.3)',
        'glow-lg': '0 0 30px rgba(151, 71, 255, 0.5)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'glass-shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'smooth-slide-in': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'smooth-fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'premium-float': {
          '0%, 100%': { transform: 'translateY(0px) translateZ(0)' },
          '50%': { transform: 'translateY(-10px) translateZ(0)' },
        },
        'premium-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(151, 71, 255, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(151, 71, 255, 0.5), 0 0 40px rgba(151, 71, 255, 0.2)' },
        },
        'premium-scale': {
          '0%': { transform: 'scale(1) translateZ(0)' },
          '50%': { transform: 'scale(1.02) translateZ(0)' },
          '100%': { transform: 'scale(1) translateZ(0)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'glass-shimmer': 'glass-shimmer 2s infinite',
        'smooth-slide-in': 'smooth-slide-in 0.3s ease-out',
        'smooth-fade-in': 'smooth-fade-in 0.4s ease-out',
        'premium-float': 'premium-float 3s ease-in-out infinite',
        'premium-glow': 'premium-glow 2s ease-in-out infinite',
        'premium-scale': 'premium-scale 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config; 