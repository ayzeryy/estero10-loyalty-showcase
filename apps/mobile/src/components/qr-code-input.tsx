import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { colors, radii, spacing, typography } from '@/constants/theme';

export function QrCodeInput({
  disabled, onSubmit,
}: {
  disabled: boolean;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = useState('');
  return (
    <View style={styles.container}>
      <Text style={styles.title}>¿Prefieres pegar el código?</Text>
      <Text style={styles.hint}>Puedes probar el mismo flujo sin utilizar la cámara.</Text>
      <TextInput
        accessibilityLabel="Código QR"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        onChangeText={setCode}
        placeholder="Pega el código del QR"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={code}
      />
      <PrimaryButton
        disabled={disabled || !code.trim()}
        label="Validar código"
        onPress={() => onSubmit(code)}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginVertical: spacing.lg },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: typography.body },
  hint: { color: colors.textSecondary, fontSize: typography.caption },
  input: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: radii.md, color: colors.textPrimary, padding: spacing.md,
  },
});
