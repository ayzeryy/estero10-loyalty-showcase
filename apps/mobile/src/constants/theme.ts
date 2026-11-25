import '@/global.css';

import { Platform } from 'react-native';

export const BrandColors = {
  primary: '#063B75',
  secondary: '#55C5E8',
  background: '#F7F4EA',
  accent: '#F4D44D',
} as const;

export const colors = {
  brand: BrandColors,
  background: BrandColors.background,
  surface: '#FFFDF7',
  surfaceMuted: '#EFEBDD',
  textPrimary: BrandColors.primary,
  textSecondary: '#526879',
  textMuted: '#74828B',
  border: '#D5DEDF',
  borderStrong: '#B8CED4',
  primaryAction: BrandColors.primary,
  secondaryAction: BrandColors.secondary,
  onPrimary: '#FFFDF7',
  success: '#246B4A',
  successSurface: '#E5F1E9',
  error: '#9D3B34',
  errorSurface: '#F6E7E3',
  disabled: '#9AA7AD',
  disabledSurface: '#E5E4DD',
  overlay: 'rgba(6, 59, 117, 0.54)',
  overlayStrong: 'rgba(3, 28, 57, 0.78)',
  navySurface: '#0B477F',
  onNavyMuted: '#C5E6EF',
} as const;

export const glass = {
  surface: 'rgba(255, 253, 247, 0.78)',
  surfaceStrong: 'rgba(255, 253, 247, 0.92)',
  surfaceNavy: 'rgba(6, 59, 117, 0.86)',
  surfaceSky: 'rgba(85, 197, 232, 0.16)',
  border: 'rgba(255, 255, 255, 0.58)',
  borderNavy: 'rgba(6, 59, 117, 0.16)',
  highlight: 'rgba(255, 255, 255, 0.72)',
  blur: 24,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  section: 64,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  round: 999,
} as const;

export const typography = {
  micro: 11,
  caption: 12,
  body: 15,
  action: 16,
  sectionTitle: 21,
  screenTitle: 36,
  points: 64,
  lineHeightBody: 22,
} as const;

export const shadows = {
  soft: Platform.select({
    ios: {
      shadowColor: BrandColors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 10px 30px rgba(6, 59, 117, 0.08)' },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: BrandColors.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    web: { boxShadow: '0 16px 38px rgba(6, 59, 117, 0.16)' },
    default: {},
  }),
} as const;

export const iconSizes = {
  sm: 16,
  md: 22,
  lg: 28,
} as const;

export const layout = {
  screenPadding: spacing.xl,
  maxContentWidth: 720,
  minTouchTarget: 48,
} as const;

export const motion = {
  pressIn: 90,
  pressOut: 150,
  fast: 180,
  standard: 280,
  emphasis: 440,
} as const;

// Compatibilidad con los componentes temáticos heredados de Expo.
export const Colors = {
  light: {
    text: colors.textPrimary,
    background: colors.background,
    backgroundElement: colors.surface,
    backgroundSelected: colors.surfaceMuted,
    textSecondary: colors.textSecondary,
  },
  dark: {
    text: colors.textPrimary,
    background: colors.background,
    backgroundElement: colors.surface,
    backgroundSelected: colors.surfaceMuted,
    textSecondary: colors.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui, -apple-system, sans-serif',
    serif: 'Georgia, serif',
    rounded: 'system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, monospace',
  },
});

export const Spacing = {
  half: spacing.xxs / 2,
  one: spacing.xxs,
  two: spacing.xs,
  three: spacing.md,
  four: spacing.xl,
  five: spacing.xxl,
  six: spacing.section,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = layout.maxContentWidth;
