import { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { motion } from '@/constants/theme';

type AnimatedNumberProps = {
  animateOnMount?: boolean;
  style?: StyleProp<TextStyle>;
  value: number;
};

export function AnimatedNumber({ animateOnMount = false, style, value }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const initialValue = animateOnMount && !reduceMotion ? 0 : value;
  const animatedValue = useRef(new Animated.Value(initialValue)).current;
  const [displayValue, setDisplayValue] = useState(initialValue);

  useEffect(() => {
    const subscription = animatedValue.addListener(({ value: currentValue }) => {
      setDisplayValue(Math.round(currentValue));
    });
    return () => animatedValue.removeListener(subscription);
  }, [animatedValue]);

  useEffect(() => {
    if (reduceMotion) {
      animatedValue.setValue(value);
      setDisplayValue(value);
      return;
    }

    Animated.timing(animatedValue, {
      duration: motion.emphasis,
      toValue: value,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, reduceMotion, value]);

  return <Animated.Text style={style}>{displayValue.toLocaleString()}</Animated.Text>;
}
