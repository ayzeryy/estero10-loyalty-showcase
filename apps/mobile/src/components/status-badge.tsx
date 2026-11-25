import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';

import { MotionView } from '@/components/motion-view';
import { colors, iconSizes, radii, spacing, typography } from '@/constants/theme';

type StatusBadgeProps = {
  label: string;
  tone?: 'available' | 'neutral' | 'cancelled';
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const icon = tone === 'available' ? 'checkmark-circle' : tone === 'cancelled' ? 'close-circle' : 'time';

  return (
    <MotionView key={`${tone}-${label}`} style={[styles.badge, styles[tone]]} variant="scale">
      <Ionicons color={styles[`${tone}Text`].color} name={icon} size={iconSizes.sm} />
      <Text style={[styles.label, styles[`${tone}Text`]]}>{label}</Text>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  available: { backgroundColor: colors.successSurface },
  neutral: { backgroundColor: colors.surfaceMuted },
  cancelled: { backgroundColor: colors.errorSurface },
  label: { fontSize: typography.caption, fontWeight: '700' },
  availableText: { color: colors.success },
  neutralText: { color: colors.textSecondary },
  cancelledText: { color: colors.error },
});
