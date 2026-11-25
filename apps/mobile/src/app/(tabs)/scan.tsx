import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import { AnimatedNumber } from '@/components/animated-number';
import { AppHeader } from '@/components/app-header';
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

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [awardedPoints, setAwardedPoints] = useState<number | null>(null);
  const scanLock = useRef(false);

  async function redeemCode(code: string) {
    // Bloqueo síncrono: evita que la cámara dispare dos RPC.
    if (scanLock.current) return;
    scanLock.current = true;

    setScanned(true);
    setLoading(true);
    setSuccess(false);
    setAwardedPoints(null);
    setMessage('Validando tu compra...');

    const token = normalizeUuid(code);

    if (!token) {
      setLoading(false);
      setMessage('Este código QR no es válido.');
      return;
    }

    const { data, error } = await supabase.rpc('redeem_qr', {
      p_token: token,
    });

    setLoading(false);

    if (error) {
      setSuccess(false);
      setMessage(getBackendErrorMessage('redeem-purchase', error.message));
      return;
    }

    setSuccess(true);
    setAwardedPoints(data);
    setMessage('Compra acreditada correctamente.');
  }

  function scanAgain() {
    scanLock.current = false;
    setMessage('');
    setSuccess(false);
    setAwardedPoints(null);
    setScanned(false);
  }


  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader
        eyebrow="SUMA UNA VISITA"
        subtitle="Coloca el QR de tu compra dentro del marco."
        title="Escanear compra"
      />

      {!permission?.granted ? (
        <PrimaryButton label="Activar cámara" onPress={() => void requestPermission()} variant="secondary" />
      ) : (
      <MotionView delay={80} style={styles.cameraContainer}>
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
            <Ionicons color={colors.onPrimary} name="scan" size={iconSizes.sm} />
            <Text style={styles.detectedText}>QR detectado</Text>
          </GlassSurface>
        ) : null}
      </MotionView>
      )}

      <QrCodeInput disabled={scanned || loading} onSubmit={(code) => void redeemCode(code)} />
      <Text style={styles.cameraHint}>La lectura ocurre automáticamente.</Text>

      {loading ? (
        <View style={styles.statusSpacing}>
          <OperationStatus message="Validando la compra de forma segura..." state="loading" />
        </View>
      ) : null}

      {!loading && message ? (
        <View style={styles.statusSpacing}>
          <OperationStatus message={message} state={success ? 'success' : 'error'} />
        </View>
      ) : null}

      {success && awardedPoints !== null ? (
        <MotionView style={styles.pointsResult} variant="scale">
          <Text style={styles.pointsEyebrow}>PUNTOS SUMADOS</Text>
          <View style={styles.pointsRow}>
            <Text style={styles.plus}>+</Text>
            <AnimatedNumber animateOnMount style={styles.pointsNumber} value={awardedPoints} />
            <Text style={styles.pointsUnit}>pts</Text>
          </View>
          <View style={styles.lemonAccent} />
        </MotionView>
      ) : null}

      {scanned && !loading ? (
        <PrimaryButton
          label="Escanear otro QR"
          onPress={scanAgain}
          style={styles.scanAgainButton}
          variant={success ? 'secondary' : 'primary'}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  permissionContent: { flexGrow: 1, justifyContent: 'center' },
  permissionIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderRadius: radii.round,
    backgroundColor: colors.brand.secondary,
  },
  permissionButton: { marginTop: spacing.xl },
  cameraContainer: {
    height: 390,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    overflow: 'hidden',
    borderRadius: radii.xl,
    backgroundColor: colors.primaryAction,
  },
  cameraShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 28, 57, 0.2)',
  },
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
  cameraHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: typography.caption,
    textAlign: 'center',
  },
  statusSpacing: { marginTop: spacing.lg },
  pointsResult: {
    position: 'relative',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  pointsEyebrow: {
    color: colors.secondaryAction,
    fontSize: typography.micro,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  plus: { color: colors.success, fontSize: 30, fontWeight: '800' },
  pointsNumber: { color: colors.textPrimary, fontSize: 48, fontWeight: '800' },
  pointsUnit: { marginLeft: spacing.xs, color: colors.textPrimary, fontSize: typography.action, fontWeight: '700' },
  lemonAccent: {
    position: 'absolute',
    bottom: 0,
    width: 48,
    height: 4,
    borderRadius: radii.round,
    backgroundColor: colors.brand.accent,
  },
  scanAgainButton: { marginTop: spacing.lg },
});
