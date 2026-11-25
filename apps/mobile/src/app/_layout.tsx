import {
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

const brandNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primaryAction,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.brand.accent,
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { error, loading, refreshRole, role, session } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryAction} size="large" />
      </View>
    );
  }

  if (session && error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.button} onPress={() => void refreshRole()}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const isStaff = role === 'employee' || role === 'admin';

  return (
    <ThemeProvider value={brandNavigationTheme}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={!session}>
          <Stack.Screen name="auth/index" />
        </Stack.Protected>

        <Stack.Protected guard={Boolean(session) && role === 'customer'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="history"
            options={{
              headerShown: true,
              title: 'Historial',
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.primaryAction,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="my-rewards"
            options={{
              headerShown: true,
              title: 'Mis premios',
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.primaryAction,
              headerShadowVisible: false,
            }}
          />
        </Stack.Protected>

        <Stack.Protected guard={Boolean(session) && isStaff}>
          <Stack.Screen name="staff" />
          <Stack.Screen name="staff-purchase" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  error: {
    color: colors.error,
    fontSize: typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primaryAction,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
