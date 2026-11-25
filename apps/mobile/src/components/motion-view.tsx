import { PropsWithChildren, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/constants/theme';

type MotionViewProps = PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
  variant?: 'fadeUp' | 'scale';
}>;

export function MotionView({
  children,
  delay = 0,
  style,
  variant = 'fadeUp',
}: MotionViewProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const offset = useSharedValue(reduceMotion ? 0 : variant === 'fadeUp' ? 10 : 0.96);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      offset.value = variant === 'fadeUp' ? 0 : 1;
      return;
    }

    opacity.value = withDelay(delay, withTiming(1, { duration: motion.standard }));
    offset.value = withDelay(
      delay,
      withTiming(variant === 'fadeUp' ? 0 : 1, { duration: motion.standard })
    );
  }, [delay, offset, opacity, reduceMotion, variant]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: variant === 'fadeUp'
      ? [{ translateY: offset.value }]
      : [{ scale: offset.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
