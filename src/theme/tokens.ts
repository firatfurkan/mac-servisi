// ============ FONT FAMILIES ============
export const fontFamily = {
  heading: 'Rajdhani',   // Başlık, skor, hero
  body: 'Rajdhani',      // Body, event text
};

// ============ TYPOGRAPHY SCALE ============
export const typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 13,
    base: 14,
    lg: 16,
    xl: 20,
    xxl: 22,
    hero: 44,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  score: {
    size: 20,
    weight: '700' as const,
    letterSpacing: 1,
  },
};

// ============ SPACING SCALE ============
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

// ============ BORDER RADIUS ============
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

// ============ SEMANTIC COLORS ============
export const semanticColors = {
  win: '#03422d',
  draw: '#FFBB33',
  loss: '#FF3B5C',
  assist: '#2196F3',
  goalFlash: '#16C784',
};

// ============ BASE COLORS - Forest Teal ============
export const colors = {
  primary: '#03422d',      // Forest Teal Accent
  primaryDark: '#00897b',  // Forest Teal Dark
  accent: '#FF3B5C',
  warning: '#FFBB33',
  success: '#00C851',
  secondary: '#2196F3',
  ...semanticColors,
};

// ============ SHADOWS ============
export const shadows = {
  dark: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 8,
    },
  },
  light: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 6,
    },
  },
};

// ============ DARK THEME - Forest Teal ============
export const darkTheme = {
  dark: true,
  colors: {
    ...colors,
    background: '#0f1a19',    // Forest Teal Dark Background
    surface: '#142420',       // Forest Teal Dark Header
    surfaceVariant: '#1a3a38',
    card: '#172d2c',
    textPrimary: '#f0fffe',   // Light text
    textSecondary: '#8ba9a7',
    divider: '#233432',
    liveBadge: '#22C55E',
  },
};

// ============ LIGHT THEME - Forest Teal ============
export const lightTheme = {
  dark: false,
  colors: {
    ...colors,
    background: '#f0fffe',   // Forest Teal Light Background
    surface: '#FFFFFF',      // Forest Teal Light Header
    surfaceVariant: '#e8faf9', // Forest Teal Light Variant
    card: '#FFFFFF',         // Forest Teal Light Card
    textPrimary: '#0F1724',  // Dark text
    textSecondary: '#5A8885', // Forest Teal Secondary Text
    divider: '#d0e8e6',      // Forest Teal Light Divider
    liveBadge: '#00C851',
  },
};

export type AppTheme = typeof darkTheme;
