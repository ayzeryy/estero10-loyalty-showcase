import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, iconSizes, radii, spacing, typography } from '@/constants/theme';
import type { Tables } from '@/types/database';

type TransactionItemProps = {
  transaction: Pick<
    Tables<'point_transactions'>,
    'id' | 'points' | 'description' | 'created_at'
  >;
};

export function TransactionItem({ transaction }: TransactionItemProps) {
  const isPositive = transaction.points >= 0;

  return (
    <View style={styles.container}>
      <View style={[styles.icon, isPositive ? styles.positiveIcon : styles.negativeIcon]}>
        <Ionicons
          color={isPositive ? colors.success : colors.error}
          name={isPositive ? 'arrow-down' : 'arrow-up'}
          size={iconSizes.sm}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={2}>
          {transaction.description ?? 'Movimiento de puntos'}
        </Text>
        <Text style={styles.date}>
          {new Date(transaction.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.amount}>
        <Text style={[styles.points, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '+' : ''}{transaction.points}
        </Text>
        <Text style={styles.kind}>{isPositive ? 'Ganaste' : 'Usaste'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  info: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  positiveIcon: {
    backgroundColor: colors.successSurface,
  },
  negativeIcon: {
    backgroundColor: colors.errorSurface,
  },
  description: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '600',
  },
  date: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginTop: spacing.xxs,
  },
  points: {
    fontSize: 18,
    fontWeight: '800',
  },
  amount: {
    alignItems: 'flex-end',
  },
  kind: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: typography.micro,
    fontWeight: '600',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
});
