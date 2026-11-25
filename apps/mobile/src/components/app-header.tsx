import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

type AppHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function AppHeader({ eyebrow, subtitle, title }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.accentDot} />
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
  },
  eyebrow: {
    color: colors.secondaryAction,
    fontSize: typography.micro,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xxs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.screenTitle,
    fontWeight: '800',
    letterSpacing: -1,
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.accent,
    marginLeft: spacing.xs,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
    marginTop: spacing.xs,
  },
});
