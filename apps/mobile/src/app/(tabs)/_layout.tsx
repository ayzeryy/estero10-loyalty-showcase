import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { ComponentProps, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GlassSurface } from '@/components/glass-surface';
import { colors, iconSizes, motion, radii, shadows, spacing, typography } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ focused, name }: { focused: boolean; name: IconName }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(focused && !reduceMotion ? 1.08 : 1, {
      duration: motion.fast,
    });
  }, [focused, reduceMotion, scale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.iconWrapper}>
      <Animated.View style={iconStyle}>
        <Ionicons
          color={focused ? colors.primaryAction : colors.textMuted}
          name={name}
          size={iconSizes.md}
        />
      </Animated.View>
      {focused ? <View style={styles.activeDot} /> : null}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryAction,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <GlassSurface style={styles.tabBackground} variant="creamStrong" />
        ),
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? 'home' : 'home-outline'} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Menú',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? 'restaurant' : 'restaurant-outline'} />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'QR',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? 'scan' : 'scan-outline'} />
          ),
        }}
      />

      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Premios',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? 'gift' : 'gift-outline'} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? 'person' : 'person-outline'} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm,
    height: 70,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderTopWidth: 0,
    borderRadius: radii.xl,
    backgroundColor: 'transparent',
    ...shadows.floating,
  },
  tabBackground: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radii.xl,
  },
  tabItem: {
    paddingVertical: spacing.xxs,
  },
  label: {
    fontSize: typography.micro,
    fontWeight: '700',
  },
  iconWrapper: {
    minWidth: 32,
    alignItems: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 5,
    height: 5,
    borderRadius: radii.round,
    backgroundColor: colors.brand.accent,
  },
});
