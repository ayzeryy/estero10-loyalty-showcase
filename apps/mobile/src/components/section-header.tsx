import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

type SectionHeaderProps = {
  title: string;
  action?: string;
  onPress?: () => void;
};

export function SectionHeader({ action, onPress, title }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && onPress ? (
        <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
          <Text style={styles.action}>{action} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  action: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
});
