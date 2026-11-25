import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { GlassSurface } from '@/components/glass-surface';
import { MotionView } from '@/components/motion-view';
import { PrimaryButton } from '@/components/primary-button';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { StatusBadge } from '@/components/status-badge';
import { colors, iconSizes, layout, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type Redemption = {
  id: string;
  points_spent: number;
  status: 'pending' | 'used' | 'cancelled';
  created_at: string;
  used_at: string | null;
  reward: { name: string; description: string | null } | null;
};

const PAGE_SIZE = 20;

const statusContent = {
  pending: { label: 'Disponible', tone: 'available' as const },
  used: { label: 'Utilizado', tone: 'neutral' as const },
  cancelled: { label: 'Cancelado', tone: 'cancelled' as const },
};

async function getRedemptionsPage(userId: string, offset: number) {
  return supabase
    .from('reward_redemptions')
    .select(`
      id,
      points_spent,
      status,
      created_at,
      used_at,
      reward:rewards!reward_redemptions_reward_id_fkey (
        name,
        description
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
}

export default function MyRewardsScreen() {
  const { user } = useAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadMoreError, setLoadMoreError] = useState('');
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);

  const loadRedemptions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setErrorMessage('');
    setLoadMoreError('');
    const { data, error } = await getRedemptionsPage(user.id, 0);

    if (error) {
      setErrorMessage('No se pudieron cargar tus premios.');
    } else {
      const page = (data ?? []) as Redemption[];
      setRedemptions(page);
      setHasMore(page.length === PAGE_SIZE);
    }

    setLoading(false);
  }, [user]);

  const refreshRedemptions = useCallback(async () => {
    if (!user || refreshing) return;

    setRefreshing(true);
    setLoadMoreError('');
    const { data, error } = await getRedemptionsPage(user.id, 0);

    if (error) {
      setLoadMoreError('No se pudo actualizar. Intenta nuevamente.');
    } else {
      const page = (data ?? []) as Redemption[];
      setRedemptions(page);
      setHasMore(page.length === PAGE_SIZE);
    }

    setRefreshing(false);
  }, [refreshing, user]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore || !hasMore) return;

    setLoadingMore(true);
    setLoadMoreError('');
    const { data, error } = await getRedemptionsPage(user.id, redemptions.length);

    if (error) {
      setLoadMoreError('No se pudieron cargar más premios.');
    } else {
      const page = (data ?? []) as Redemption[];
      setRedemptions((current) => [...current, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    }

    setLoadingMore(false);
  }, [hasMore, loadingMore, redemptions.length, user]);

  useFocusEffect(
    useCallback(() => {
      void loadRedemptions();
    }, [loadRedemptions])
  );

  if (loading) return <LoadingState message="Preparando tus premios..." />;
  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void loadRedemptions()} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.list}
        data={redemptions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>TUS CANJES</Text>
            <Text style={styles.introTitle}>Sabores que ya son tuyos</Text>
            <Text style={styles.introText}>
              Presenta el código de un premio disponible cuando visites Estero 10.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons color={colors.secondaryAction} name="ticket-outline" size={36} />
            <Text style={styles.emptyTitle}>Aún no tienes premios</Text>
            <Text style={styles.emptyText}>Tus próximos canjes aparecerán aquí.</Text>
          </View>
        }
        ListFooterComponent={
          hasMore || loadMoreError ? (
            <View style={styles.footer}>
              {loadMoreError ? <Text style={styles.footerError}>{loadMoreError}</Text> : null}
              <PrimaryButton
                label={loadMoreError ? 'Reintentar' : 'Cargar más'}
                loading={loadingMore}
                onPress={() => void loadMore()}
                variant="secondary"
              />
            </View>
          ) : null
        }
        onRefresh={() => void refreshRedemptions()}
        refreshing={refreshing}
        renderItem={({ item }) => (
          <RewardTicket redemption={item} onShowCode={() => setSelectedRedemption(item)} />
        )}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedRedemption(null)}
        transparent
        visible={selectedRedemption !== null}
      >
        <View style={styles.modalOverlay}>
          <MotionView style={styles.modalMotion} variant="scale">
            <GlassSurface style={styles.modalCard} variant="creamStrong">
              <BrandLogo compact style={styles.modalLogo} />
              <Text style={styles.modalEyebrow}>PREMIO DIGITAL</Text>
              <Text style={styles.modalTitle}>
                {selectedRedemption?.reward?.name ?? 'Premio Estero 10'}
              </Text>
              <Text style={styles.modalDescription}>
                Muestra este QR al personal. El código se valida una sola vez.
              </Text>

              {selectedRedemption ? (
                <View style={styles.qrContainer}>
                  <QRCode
                    backgroundColor="#FFFFFF"
                    color="#000000"
                    size={220}
                    value={selectedRedemption.id}
                  />
                </View>
              ) : null}

              <Text style={styles.codeLabel}>Código de respaldo</Text>
              <Text style={styles.shortCode}>
                {selectedRedemption?.id.split('-')[0].toUpperCase()}
              </Text>
              <Text selectable style={styles.fullCode}>{selectedRedemption?.id}</Text>

              <PrimaryButton
                label="Cerrar"
                onPress={() => setSelectedRedemption(null)}
                style={styles.closeButton}
              />
            </GlassSurface>
          </MotionView>
        </View>
      </Modal>
    </View>
  );
}

function RewardTicket({
  onShowCode,
  redemption,
}: {
  onShowCode: () => void;
  redemption: Redemption;
}) {
  const status = statusContent[redemption.status];

  return (
    <MotionView style={styles.ticket}>
      <View style={styles.ticketAccent} />
      <View style={styles.ticketHeading}>
        <View style={styles.ticketIcon}>
          <Ionicons color={colors.primaryAction} name="fish-outline" size={iconSizes.md} />
        </View>
        <StatusBadge label={status.label} tone={status.tone} />
      </View>
      <Text style={styles.rewardName}>{redemption.reward?.name ?? 'Premio Estero 10'}</Text>
      {redemption.reward?.description ? (
        <Text style={styles.rewardDescription}>{redemption.reward.description}</Text>
      ) : null}
      <View style={styles.ticketMeta}>
        <Text style={styles.points}>{redemption.points_spent.toLocaleString()} puntos</Text>
        <Text style={styles.date}>
          Canjeado {new Date(redemption.created_at).toLocaleDateString()}
        </Text>
      </View>
      {redemption.status === 'used' && redemption.used_at ? (
        <Text style={styles.usedDate}>
          Utilizado {new Date(redemption.used_at).toLocaleDateString()}
        </Text>
      ) : null}
      {redemption.status === 'pending' ? (
        <PrimaryButton label="Mostrar QR" onPress={onShowCode} style={styles.showCodeButton} />
      ) : null}
    </MotionView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.section,
  },
  intro: { paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  eyebrow: {
    color: colors.secondaryAction,
    fontSize: typography.micro,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  introTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  introText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },
  ticket: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ticketAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: colors.secondaryAction,
  },
  ticketHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
  },
  rewardName: {
    marginTop: spacing.lg,
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '800',
  },
  rewardDescription: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  points: { color: colors.textPrimary, fontSize: typography.caption, fontWeight: '800' },
  date: { flex: 1, color: colors.textMuted, fontSize: typography.caption, textAlign: 'right' },
  usedDate: { marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.caption },
  showCodeButton: { marginTop: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: spacing.section },
  emptyTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '800',
  },
  emptyText: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.body },
  footer: { gap: spacing.sm, paddingTop: spacing.sm },
  footerError: { color: colors.error, fontSize: typography.caption, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.overlayStrong,
  },
  modalCard: {
    width: '100%',
    maxHeight: '94%',
    alignItems: 'center',
    overflow: 'hidden',
    padding: spacing.xl,
    borderRadius: radii.xl,
  },
  modalMotion: { width: '100%', maxWidth: 430 },
  modalLogo: { width: 94, height: 56 },
  modalEyebrow: {
    marginTop: spacing.sm,
    color: colors.secondaryAction,
    fontSize: typography.micro,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  modalTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalDescription: {
    maxWidth: 320,
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  qrContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
  },
  codeLabel: { marginTop: spacing.lg, color: colors.textMuted, fontSize: typography.micro },
  shortCode: {
    marginTop: spacing.xxs,
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 3,
  },
  fullCode: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  closeButton: { alignSelf: 'stretch', marginTop: spacing.lg },
});
