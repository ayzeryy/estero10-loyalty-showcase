import { GlassView } from 'expo-glass-effect';
import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { glass, shadows } from '@/constants/theme';

type GlassSurfaceProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  variant?: 'cream' | 'creamStrong' | 'navy' | 'sky';
}>;

export function GlassSurface({
  children,
  style,
  variant = 'cream',
}: GlassSurfaceProps) {
  const isNavy = variant === 'navy';

  return (
    <GlassView
      colorScheme={isNavy ? 'dark' : 'light'}
      glassEffectStyle="regular"
      style={[styles.base, styles[variant], style]}
      tintColor={isNavy ? glass.surfaceNavy : glass.surfaceStrong}
    >
      {children}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: glass.border,
    ...shadows.soft,
  },
  cream: {
    backgroundColor: glass.surface,
  },
  creamStrong: {
    backgroundColor: glass.surfaceStrong,
  },
  navy: {
    backgroundColor: glass.surfaceNavy,
    borderColor: glass.highlight,
  },
  sky: {
    backgroundColor: glass.surfaceSky,
    borderColor: glass.borderNavy,
  },
});
