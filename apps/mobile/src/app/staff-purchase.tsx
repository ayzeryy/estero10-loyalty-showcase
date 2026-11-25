import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AnimatedNumber } from '@/components/animated-number';
import { BrandLogo } from '@/components/brand-logo';
import { GlassSurface } from '@/components/glass-surface';
import { MotionView } from '@/components/motion-view';
import { OperationStatus } from '@/components/operation-status';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { colors, iconSizes, radii, spacing, typography } from '@/constants/theme';
import { getBackendErrorMessage, parsePurchaseAmount } from '@/lib/business-rules';
import { supabase } from '@/lib/supabase';

type PurchaseQR = {
  token: string;
  points: number;
  purchase_amount: number;
  expires_at: string;
};

export default function StaffPurchaseScreen() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [purchaseQR, setPurchaseQR] = useState<PurchaseQR | null>(null);

  async function generateQR() {
    const purchaseAmount = parsePurchaseAmount(amount);

    if (purchaseAmount === null) {
      setMessage('Ingresa un monto válido mayor que cero.');
      return;
    }

    setLoading(true);
    setMessage('');
    setPurchaseQR(null);

    const { data, error } = await supabase.rpc('create_purchase_qr', {
      p_purchase_amount: purchaseAmount,
    });

    setLoading(false);

    if (error) {
      setMessage(getBackendErrorMessage('create-purchase', error.message));
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      setMessage('No se pudo generar el QR. Intenta nuevamente.');
      return;
    }

    setPurchaseQR(result as PurchaseQR);
  }

  function newPurchase() {
    setPurchaseQR(null);
    setAmount('');
    setMessage('');
  }

  return (
    <Screen
      contentContainerStyle={styles.content}
      scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
    >
      <View style={styles.brandRow}>
        <BrandLogo compact style={styles.logo} />
        <View style={styles.modeBadge}>
          <View style={styles.modeDot} />
          <Text style={styles.modeText}>MODO STAFF</Text>
        </View>
      </View>

      <Text style={styles.title}>Generar QR de compra</Text>
      <Text style={styles.subtitle}>
        Ingresa únicamente el total pagado. Los puntos los calcula Estero 10 de forma segura.
      </Text>

      {!purchaseQR ? (
        <MotionView delay={60}>
          <GlassSurface style={styles.formCard} variant="creamStrong">
            <Text style={styles.label}>Monto de compra</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currency}>Q</Text>
              <TextInput
                accessibilityLabel="Monto de compra en quetzales"
                keyboardType="decimal-pad"
                onChangeText={setAmount}
                placeholder="500.00"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={amount}
              />
            </View>
            <Text style={styles.helpText}>No es posible introducir puntos manualmente.</Text>
            <PrimaryButton
              label="Generar QR"
              loading={loading}
              onPress={() => void generateQR()}
              style={styles.generateButton}
            />
          </GlassSurface>
        </MotionView>
      ) : (
        <MotionView key={purchaseQR.token} style={styles.result} variant="scale">
          <View style={styles.successHeading}>
            <View style={styles.successIcon}>
              <Ionicons color={colors.success} name="checkmark-circle" size={iconSizes.lg} />
              <View style={styles.lemonDot} />
            </View>
            <View style={styles.successCopy}>
              <Text style={styles.successTitle}>QR listo para el cliente</Text>
              <Text style={styles.successSubtitle}>Compra registrada temporalmente</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>MONTO</Text>
              <Text style={styles.purchaseAmount}>
                Q{Number(purchaseQR.purchase_amount).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.pointsSummary}>
              <Text style={styles.summaryLabel}>GENERA</Text>
              <View style={styles.pointsRow}>
                <AnimatedNumber animateOnMount style={styles.points} value={purchaseQR.points} />
                <Text style={styles.pointsUnit}>pts</Text>
              </View>
            </View>
          </View>

          <GlassSurface style={styles.qrShell} variant="sky">
            <View style={styles.qrContainer}>
              <QRCode
                backgroundColor="#FFFFFF"
                color="#000000"
                size={230}
                value={purchaseQR.token}
              />
            </View>
          </GlassSurface>

          <Text selectable accessibilityLabel="Código de compra" style={styles.instructions}>{purchaseQR.token}</Text>
          <Text style={styles.instructions}>
            El cliente debe escanear este QR desde la sección QR de su app.
          </Text>
          <View style={styles.expirationRow}>
            <Ionicons color={colors.textSecondary} name="time-outline" size={iconSizes.sm} />
            <Text style={styles.expiration}>
              Expira a las {new Date(purchaseQR.expires_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <PrimaryButton label="Nueva compra" onPress={newPurchase} style={styles.newButton} />
        </MotionView>
      )}

      {message ? (
        <View style={styles.messageSpacing}>
          <OperationStatus message={message} state="error" />
        </View>
      ) : null}

      <PrimaryButton
        label="Volver a Staff"
        onPress={() => router.back()}
        style={styles.backButton}
        variant="secondary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: spacing.section },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 94, height: 58 },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
  },
  modeDot: { width: 7, height: 7, borderRadius: radii.round, backgroundColor: colors.brand.accent },
  modeText: { color: colors.textPrimary, fontSize: typography.micro, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: spacing.lg, color: colors.textPrimary, fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.body, lineHeight: typography.lineHeightBody },
  formCard: { marginTop: spacing.xxl, padding: spacing.lg, borderRadius: radii.lg, overflow: 'hidden' },
  label: { color: colors.textPrimary, fontSize: typography.caption, fontWeight: '800' },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  currency: { paddingLeft: spacing.md, color: colors.textPrimary, fontSize: 26, fontWeight: '800' },
  input: { flex: 1, minHeight: 64, paddingHorizontal: spacing.sm, color: colors.textPrimary, fontSize: 26, fontWeight: '700' },
  helpText: { marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.caption },
  generateButton: { marginTop: spacing.lg },
  result: { marginTop: spacing.xxl },
  successHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  successIcon: { position: 'relative' },
  lemonDot: { position: 'absolute', top: -2, right: -3, width: 7, height: 7, borderRadius: radii.round, backgroundColor: colors.brand.accent },
  successCopy: { flex: 1 },
  successTitle: { color: colors.textPrimary, fontSize: typography.action, fontWeight: '800' },
  successSubtitle: { marginTop: 2, color: colors.textMuted, fontSize: typography.caption },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: { color: colors.secondaryAction, fontSize: typography.micro, fontWeight: '800', letterSpacing: 1.2 },
  purchaseAmount: { marginTop: spacing.xs, color: colors.textPrimary, fontSize: 28, fontWeight: '800' },
  summaryDivider: { width: 1, marginHorizontal: spacing.xl, backgroundColor: colors.border },
  pointsSummary: { flex: 1 },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  points: { color: colors.textPrimary, fontSize: 28, fontWeight: '800' },
  pointsUnit: { marginLeft: spacing.xs, color: colors.textPrimary, fontSize: typography.caption, fontWeight: '700' },
  qrShell: { alignSelf: 'center', marginTop: spacing.xl, padding: spacing.sm, borderRadius: radii.lg },
  qrContainer: { padding: spacing.md, borderRadius: radii.md, backgroundColor: '#FFFFFF' },
  instructions: { maxWidth: 340, alignSelf: 'center', marginTop: spacing.lg, color: colors.textSecondary, fontSize: typography.body, lineHeight: typography.lineHeightBody, textAlign: 'center' },
  expirationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
  expiration: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: '700' },
  newButton: { marginTop: spacing.xl },
  messageSpacing: { marginTop: spacing.lg },
  backButton: { marginTop: spacing.lg },
});
