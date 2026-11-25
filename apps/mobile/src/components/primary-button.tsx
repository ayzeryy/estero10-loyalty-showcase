import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, layout, motion, radii, spacing, typography } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (!isDisabled && !reduceMotion) {
      scale.value = withTiming(0.98, { duration: motion.pressIn });
    }
  }

  function handlePressOut() {
    if (!reduceMotion) {
      scale.value = withTiming(1, { duration: motion.pressOut });
    }
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? colors.primaryAction : colors.onPrimary}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'secondary' && styles.secondaryLabel,
          ]}
        >
          {label}
        </Text>
      )}
      {variant === 'primary' && !loading ? <ViewAccent /> : null}
    </AnimatedPressable>
  );
}

function ViewAccent() {
  return <View pointerEvents="none" style={styles.accent} />;
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.minTouchTarget,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: colors.primaryAction,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: colors.error,
  },
  label: {
    color: colors.onPrimary,
    fontSize: typography.action,
    fontWeight: '700',
    zIndex: 1,
  },
  secondaryLabel: {
    color: colors.primaryAction,
  },
  disabled: {
    backgroundColor: colors.disabled,
    opacity: 0.72,
  },
  accent: {
    position: 'absolute',
    right: spacing.md,
    bottom: 0,
    width: 30,
    height: 3,
    borderRadius: radii.round,
    backgroundColor: colors.brand.accent,
  },
});
