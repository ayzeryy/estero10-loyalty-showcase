import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { getAuthErrorMessage } from '@/lib/business-rules';
import { DEMO_PASSWORD, resetDemoData } from '@/lib/demo-client';
import { isDemoMode, supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<'signin' | 'signup' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function signIn() {
    setLoading(true);
    setActiveAction('signin');
    setErrorMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    setActiveAction(null);
    if (error) setErrorMessage(getAuthErrorMessage('sign-in', error.message));
  }

  async function signUp() {
    setLoading(true);
    setActiveAction('signup');
    setErrorMessage('');
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    setActiveAction(null);

    if (error) {
      setErrorMessage(getAuthErrorMessage('sign-up', error.message));
      return;
    }
    Alert.alert('Cuenta creada', 'Tu cuenta fue creada correctamente.');
  }

  return (
    <Screen
      contentContainerStyle={styles.content}
      scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
    >
      <View style={styles.brandBlock}>
        <BrandLogo style={styles.logo} />
        <Text style={styles.welcome}>Tu mesa te espera</Text>
        <Text style={styles.subtitle}>
          Demo de portafolio con datos ficticios. Inicia sesión para explorar puntos y premios.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="correo@ejemplo.com"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={email}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          autoComplete="password"
          onChangeText={setPassword}
          placeholder="Tu contraseña"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <PrimaryButton
          disabled={loading}
          label="Iniciar sesión"
          loading={activeAction === 'signin'}
          onPress={() => void signIn()}
          style={styles.primaryButton}
        />
        <PrimaryButton
          disabled={loading}
          label="Crear cuenta"
          loading={activeAction === 'signup'}
          onPress={() => void signUp()}
          style={styles.secondaryButton}
          variant="secondary"
        />
      </View>

      {isDemoMode ? (
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo sin servidor</Text>
          <Text style={styles.demoText}>
            Los datos son ficticios y se guardan solo en este navegador. Contraseña de ambas cuentas: {DEMO_PASSWORD}
          </Text>
          <View style={styles.demoActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setEmail('customer@example.test');
                setPassword(DEMO_PASSWORD);
              }}
              style={styles.demoChip}
            >
              <Text style={styles.demoChipText}>Usar cliente</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setEmail('staff@example.test');
                setPassword(DEMO_PASSWORD);
              }}
              style={styles.demoChip}
            >
              <Text style={styles.demoChipText}>Usar staff</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                resetDemoData();
                setErrorMessage('');
              }}
              style={styles.demoChip}
            >
              <Text style={styles.demoChipText}>Reiniciar datos</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing.xxxl,
  },
  brandBlock: { alignItems: 'center' },
  logo: { width: 210, height: 128 },
  welcome: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    maxWidth: 380,
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
    textAlign: 'center',
  },
  form: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: {
    marginBottom: spacing.xs,
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  input: {
    minHeight: 52,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontSize: typography.action,
  },
  error: {
    marginBottom: spacing.sm,
    color: colors.error,
    fontSize: typography.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButton: { marginTop: spacing.xs },
  secondaryButton: { marginTop: spacing.sm },
  demoBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  demoTitle: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  demoText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  demoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  demoChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  demoChipText: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
});
