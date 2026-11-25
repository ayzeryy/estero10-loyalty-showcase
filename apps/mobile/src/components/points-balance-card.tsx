import { StyleSheet, Text, View } from 'react-native';

import { AnimatedNumber } from '@/components/animated-number';
import { GlassSurface } from '@/components/glass-surface';
import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from '@/constants/theme';

type PointsBalanceCardProps = {
  points: number;
  lifetimePoints?: number;
};

export function PointsBalanceCard({
  points,
  lifetimePoints,
}: PointsBalanceCardProps) {
  return (
    <GlassSurface style={styles.card} variant="creamStrong">
      <View style={styles.headingRow}>
        <Text style={styles.label}>TUS PUNTOS</Text>
        <View style={styles.lemonDot} />
      </View>
      <View style={styles.balanceRow}>
        <AnimatedNumber style={styles.points} value={points} />
        <Text style={styles.unit}>pts</Text>
      </View>
      {lifetimePoints !== undefined ? (
        <Text style={styles.lifetime}>
          {lifetimePoints} puntos acumulados históricamente
        </Text>
      ) : null}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    ...shadows.soft,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: colors.secondaryAction,
    fontSize: typography.micro,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  lemonDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brand.accent,
    marginLeft: spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xxs,
  },
  points: {
    color: colors.textPrimary,
    fontSize: typography.points,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 70,
  },
  unit: {
    color: colors.textPrimary,
    fontSize: typography.action,
    fontWeight: '700',
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
  },
  lifetime: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
});
