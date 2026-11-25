import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BrandLogo } from '@/components/brand-logo';
import { PrimaryButton } from '@/components/primary-button';
import { LoadingState } from '@/components/screen-state';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('profiles')
      .select('name, phone')
      .eq('id', user.id)
      .single();

    if (error) {
      setIsError(true);
      setMessage('No se pudo cargar tu perfil.');
    } else {
      setName(data.name ?? '');
      setPhone(data.phone ?? '');
    }

    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  async function saveProfile() {
    if (!user) return;

    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim() || null,
        phone: phone.trim() || null,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      setIsError(true);
      setMessage('No se pudieron guardar los cambios.');
      return;
    }

    setName(name.trim());
    setPhone(phone.trim());
    setIsError(false);
    setMessage('Perfil actualizado correctamente.');
  }

  async function handleSignOut() {
    setMessage('');

    try {
      await signOut();
    } catch {
      setIsError(true);
      setMessage('No se pudo cerrar la sesión.');
    }
  }

  if (loading) {
    return <LoadingState message="Cargando perfil..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <AppHeader
                eyebrow="TU CUENTA"
                subtitle="Mantén actualizados tus datos de contacto."
                title="Perfil"
              />
            </View>
            <BrandLogo compact style={styles.logo} />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              editable={false}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.readOnlyInput]}
              value={user?.email ?? ''}
            />
            <Text style={styles.helpText}>El correo no se puede editar desde aquí.</Text>

            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              autoCapitalize="words"
              maxLength={100}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={name}
            />

            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              keyboardType="phone-pad"
              maxLength={30}
              onChangeText={setPhone}
              placeholder="Tu teléfono"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={phone}
            />

            {message ? (
              <Text style={[styles.message, isError && styles.errorMessage]}>
                {message}
              </Text>
            ) : null}

            <PrimaryButton
              label="Guardar cambios"
              loading={saving}
              onPress={() => void saveProfile()}
            />
          </View>

          <PrimaryButton
            label="Cerrar sesión"
            onPress={() => void handleSignOut()}
            style={styles.signOutButton}
            variant="danger"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  logo: {
    width: 82,
    height: 50,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xxl,
    padding: spacing.lg,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.action,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  readOnlyInput: {
    backgroundColor: colors.disabledSurface,
    color: colors.textSecondary,
  },
  helpText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  message: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  errorMessage: {
    color: colors.error,
  },
  signOutButton: {
    marginTop: spacing.lg,
  },
});
