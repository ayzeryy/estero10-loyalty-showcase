import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { MotionView } from '@/components/motion-view';
import { colors, radii, spacing, typography } from '@/constants/theme';

type ScreenStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function LoadingState({ message = 'Cargando...' }: ScreenStateProps) {
  return (
    <View style={styles.container}>
      <MotionView style={styles.stateContent} variant="scale">
        <ActivityIndicator color={colors.primaryAction} size="large" />
        <Text style={styles.message}>{message}</Text>
      </MotionView>
    </View>
  );
}

export function ErrorState({ message, onRetry }: ScreenStateProps) {
  return (
    <View style={styles.container}>
      <MotionView style={styles.stateContent} variant="scale">
        <Text style={styles.error}>{message ?? 'No se pudo cargar la información.'}</Text>
        {onRetry ? (
          <Pressable style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryLabel}>Reintentar</Text>
          </Pressable>
        ) : null}
      </MotionView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  message: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.body,
  },
  stateContent: {
    alignItems: 'center',
  },
  error: {
    color: colors.error,
    fontSize: typography.body,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.primaryAction,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryLabel: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
