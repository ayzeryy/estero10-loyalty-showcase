import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { MotionView } from '@/components/motion-view';
import { colors, iconSizes, radii, spacing, typography } from '@/constants/theme';

type OperationStatusProps = {
  message: string;
  state: 'loading' | 'success' | 'error';
};

export function OperationStatus({ message, state }: OperationStatusProps) {
  return (
    <MotionView key={`${state}-${message}`} style={[styles.card, styles[state]]} variant="scale">
      <View style={styles.iconWrap}>
        {state === 'loading' ? (
          <ActivityIndicator color={colors.primaryAction} />
        ) : (
          <Ionicons
            color={state === 'success' ? colors.success : colors.error}
            name={state === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={iconSizes.lg}
          />
        )}
        {state === 'success' ? <View style={styles.successAccent} /> : null}
      </View>
      <Text style={[styles.message, state === 'error' && styles.errorText]}>{message}</Text>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  loading: { backgroundColor: colors.surface, borderColor: colors.border },
  success: { backgroundColor: colors.successSurface, borderColor: colors.success },
  error: { backgroundColor: colors.errorSurface, borderColor: colors.error },
  iconWrap: { position: 'relative' },
  successAccent: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 7,
    height: 7,
    borderRadius: radii.round,
    backgroundColor: colors.brand.accent,
  },
  message: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
    lineHeight: typography.lineHeightBody,
  },
  errorText: { color: colors.error },
});
