import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import { BrandLogo } from '@/components/brand-logo';
import { GlassSurface } from '@/components/glass-surface';
import { MotionView } from '@/components/motion-view';
import { OperationStatus } from '@/components/operation-status';
import { PrimaryButton } from '@/components/primary-button';
import { ScanFrame } from '@/components/scan-frame';
import { Screen } from '@/components/screen';
import { QrCodeInput } from '@/components/qr-code-input';
import { colors, iconSizes, radii, spacing, typography } from '@/constants/theme';
import { getBackendErrorMessage, normalizeUuid } from '@/lib/business-rules';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function StaffScreen() {
  const { signOut } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const scanLock = useRef(false);

  async function redeemCode(code: string) {
    // Bloqueo síncrono: evita validar el mismo premio más de una vez.
    if (scanLock.current) return;
    scanLock.current = true;

    setScanned(true);
    setLoading(true);
    setSuccess(false);
    setMessage('Validando premio...');

    const redemptionId = normalizeUuid(code);

    if (!redemptionId) {
      setLoading(false);
      setMessage('El código del premio no es válido.');
      return;
    }

    const { data, error } = await supabase.rpc('use_reward', {
      p_redemption_id: redemptionId,
    });

    setLoading(false);

    if (error) {
      setSuccess(false);
      setMessage(getBackendErrorMessage('use-reward', error.message));
      return;
    }

    setSuccess(true);
    setMessage(`Premio validado: ${data}`);
  }

  function scanAgain() {
    scanLock.current = false;
    setScanned(false);
    setSuccess(false);
    setMessage('');
  }

  async function handleSignOut() {
    setMessage('');
    try {
      await signOut();
    } catch {
      setSuccess(false);
      setMessage('No se pudo cerrar la sesión.');
    }
  }


  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.brandRow}>
        <BrandLogo compact style={styles.logo} />
        <View style={styles.modeBadge}>
          <View style={styles.modeDot} />
          <Text style={styles.modeText}>MODO STAFF</Text>
        </View>
      </View>

      <Text style={styles.title}>Operación rápida</Text>
      <Text style={styles.subtitle}>
        Genera compras o valida premios sin pasos innecesarios.
      </Text>

      <MotionView delay={60}>
        <PressableAction
          icon="qr-code-outline"
          label="Generar QR de compra"
          onPress={() => router.push('/staff-purchase')}
          supporting="Ingresa el monto y entrega el QR al cliente"
        />
      </MotionView>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Validar premio</Text>
        <Text style={styles.sectionCaption}>Escanea el ticket del cliente</Text>
      </View>

      {!permission?.granted ? (
        <GlassSurface style={styles.permissionCard} variant="sky">
          <View style={styles.permissionIcon}>
            <Ionicons color={colors.primaryAction} name="camera-outline" size={iconSizes.lg} />
          </View>
          <Text style={styles.permissionTitle}>Activa la cámara</Text>
          <Text style={styles.permissionText}>
            La cámara solo se utiliza para validar el QR del premio.
          </Text>
          <PrimaryButton
            label="Permitir cámara"
            onPress={() => void requestPermission()}
            style={styles.permissionButton}
          />
        </GlassSurface>
      ) : (
        <>
          <MotionView style={styles.cameraContainer}>
            <CameraView
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              facing="back"
              onBarcodeScanned={scanned ? undefined : (result) => void redeemCode(result.data)}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.cameraShade} />
            <ScanFrame />
            {scanned ? (
              <GlassSurface style={styles.detectedBadge} variant="navy">
                <Ionicons color={colors.onPrimary} name="ticket-outline" size={iconSizes.sm} />
                <Text style={styles.detectedText}>Premio detectado</Text>
              </GlassSurface>
            ) : null}
          </MotionView>

        </>
      )}

      <QrCodeInput disabled={scanned || loading} onSubmit={(code) => void redeemCode(code)} />
          {loading ? (
            <View style={styles.statusSpacing}>
              <OperationStatus message="Validando el premio en el sistema..." state="loading" />
            </View>
          ) : null}

          {!loading && message ? (
            <View style={styles.statusSpacing}>
              <OperationStatus message={message} state={success ? 'success' : 'error'} />
            </View>
          ) : null}

          {scanned && !loading ? (
            <PrimaryButton
              label="Escanear otro premio"
              onPress={scanAgain}
              style={styles.scanAgainButton}
            />
          ) : null}

      <PrimaryButton
        label="Cerrar sesión"
        onPress={() => void handleSignOut()}
        style={styles.logoutButton}
        variant="danger"
      />
    </Screen>
  );
}

function PressableAction({
  icon,
  label,
  onPress,
  supporting,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  supporting: string;
}) {
  return (
    <GlassSurface style={styles.actionCard} variant="creamStrong">
      <View style={styles.actionIcon}>
        <Ionicons color={colors.primaryAction} name={icon} size={iconSizes.lg} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{label}</Text>
        <Text style={styles.actionSupporting}>{supporting}</Text>
      </View>
      <PrimaryButton label="Abrir" onPress={onPress} style={styles.actionButton} />
    </GlassSurface>
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
  actionCard: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    overflow: 'hidden',
    borderRadius: radii.lg,
  },
  actionIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.brand.secondary,
  },
  actionCopy: { marginTop: spacing.md },
  actionTitle: { color: colors.textPrimary, fontSize: typography.sectionTitle, fontWeight: '800' },
  actionSupporting: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18 },
  actionButton: { marginTop: spacing.lg },
  sectionHeading: { marginTop: spacing.xxxl, marginBottom: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.sectionTitle, fontWeight: '800' },
  sectionCaption: { marginTop: spacing.xxs, color: colors.textMuted, fontSize: typography.caption },
  permissionCard: { alignItems: 'center', padding: spacing.xl, borderRadius: radii.lg },
  permissionIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.surface,
  },
  permissionTitle: { marginTop: spacing.md, color: colors.textPrimary, fontSize: typography.sectionTitle, fontWeight: '800' },
  permissionText: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.body, textAlign: 'center' },
  permissionButton: { alignSelf: 'stretch', marginTop: spacing.lg },
  cameraContainer: {
    height: 360,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radii.xl,
    backgroundColor: colors.primaryAction,
  },
  cameraShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 28, 57, 0.2)' },
  detectedBadge: {
    position: 'absolute',
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.round,
  },
  detectedText: { color: colors.onPrimary, fontSize: typography.caption, fontWeight: '800' },
  statusSpacing: { marginTop: spacing.lg },
  scanAgainButton: { marginTop: spacing.lg },
  logoutButton: { marginTop: spacing.xxxl },
});
