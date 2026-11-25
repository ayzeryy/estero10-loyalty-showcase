import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { MotionView } from '@/components/motion-view';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { Tables } from '@/types/database';

type Reward = Pick<Tables<'rewards'>, 'id' | 'name' | 'description' | 'points_required'>;

type RewardCardProps = {
  points: number;
  reward: Reward;
  loading?: boolean;
  onRedeem: () => void;
};

export function RewardCard({ loading, onRedeem, points, reward }: RewardCardProps) {
  const canRedeem = points >= reward.points_required;
  const remaining = Math.max(reward.points_required - points, 0);
  const progress = Math.min(points / reward.points_required, 1);

  return (
    <MotionView style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.iconCircle}>
          <Ionicons color={colors.primaryAction} name="gift-outline" size={20} />
        </View>
        <Text style={styles.cost}>{reward.points_required.toLocaleString()} pts</Text>
      </View>
      <Text style={styles.name}>{reward.name}</Text>
      {reward.description ? <Text style={styles.description}>{reward.description}</Text> : null}

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={[styles.availability, canRedeem && styles.available]}>
        {canRedeem ? 'Disponible para canjear' : `Te faltan ${remaining.toLocaleString()} puntos`}
      </Text>

      <PrimaryButton
        disabled={!canRedeem}
        label={canRedeem ? 'Canjear premio' : 'Sigue acumulando'}
        loading={loading}
        onPress={onRedeem}
        style={styles.button}
        variant={canRedeem ? 'primary' : 'secondary'}
      />
    </MotionView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.brand.secondary,
  },
  cost: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '800',
  },
  name: {
    marginTop: spacing.lg,
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '800',
  },
  description: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },
  progressTrack: {
    height: 6,
    marginTop: spacing.lg,
    overflow: 'hidden',
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
  },
  progressFill: {
    height: '100%',
    minWidth: 6,
    borderRadius: radii.round,
    backgroundColor: colors.secondaryAction,
  },
  availability: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  available: {
    color: colors.success,
  },
  button: {
    marginTop: spacing.lg,
  },
});
