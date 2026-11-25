import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii } from '@/constants/theme';

export function ScanFrame() {
  const reduceMotion = useReducedMotion();
  const linePosition = useSharedValue(0);

  useEffect(() => {
    if (!reduceMotion) {
      linePosition.value = withRepeat(withTiming(184, { duration: 1600 }), -1, true);
    }
    return () => cancelAnimation(linePosition);
  }, [linePosition, reduceMotion]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: linePosition.value }],
  }));

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.frame}>
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
      {!reduceMotion ? <Animated.View style={[styles.scanLine, lineStyle]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 230,
    height: 230,
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  corner: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderColor: colors.secondaryAction,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radii.md },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radii.md },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radii.md },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radii.md },
  scanLine: {
    position: 'absolute',
    top: 20,
    left: 14,
    right: 14,
    height: 2,
    borderRadius: radii.round,
    backgroundColor: colors.brand.accent,
  },
});
