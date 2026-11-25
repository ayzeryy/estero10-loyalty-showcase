import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppHeader } from '@/components/app-header';
import { GlassSurface } from '@/components/glass-surface';
import { MotionView } from '@/components/motion-view';
import { PointsBalanceCard } from '@/components/points-balance-card';
import { PrimaryButton } from '@/components/primary-button';
import { RewardCard } from '@/components/reward-card';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { colors, iconSizes, radii, spacing, typography } from '@/constants/theme';
import { getBackendErrorMessage } from '@/lib/business-rules';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { Tables } from '@/types/database';

type Reward = Pick<
  Tables<'rewards'>,
  'id' | 'name' | 'description' | 'points_required'
>;

export default function RewardsScreen() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    const [rewardsResult, accountResult] = await Promise.all([
      supabase
        .from('rewards')
        .select('id, name, description, points_required')
        .eq('active', true)
        .order('points_required'),
      supabase
        .from('loyalty_accounts')
        .select('points_balance')
        .eq('user_id', user.id)
        .single(),
    ]);

    if (rewardsResult.error || accountResult.error) {
      setIsError(true);
      setMessage('No se pudieron actualizar los premios.');
    } else {
      setRewards(rewardsResult.data ?? []);
      setPoints(accountResult.data.points_balance);
    }

    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  async function redeemReward(reward: Reward) {
    setRedeemingId(reward.id);
    setMessage('');

    const { error } = await supabase.rpc('redeem_reward', {
      p_reward_id: reward.id,
    });

    setRedeemingId(null);

    if (error) {
      setIsError(true);
      setMessage(getBackendErrorMessage('redeem-reward', error.message));
      return;
    }

    await loadData();
    setIsError(false);
    setMessage(`${reward.name} ya está en Mis premios.`);
  }

  async function handleConfirmRedeem() {
    if (!selectedReward) return;
    const reward = selectedReward;
    setSelectedReward(null);
    await redeemReward(reward);
  }

  if (loading) return <LoadingState message="Buscando premios para ti..." />;

  if (isError && rewards.length === 0) {
    return <ErrorState message={message} onRetry={() => void loadData()} />;
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader
        eyebrow="SABORES QUE REGRESAN"
        subtitle="Convierte tus visitas en momentos para disfrutar."
        title="Premios"
      />

      <View style={styles.balance}>
        <PointsBalanceCard points={points} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/my-rewards')}
        style={({ pressed }) => [styles.myRewardsLink, pressed && styles.pressed]}
      >
        <Ionicons color={colors.primaryAction} name="ticket-outline" size={iconSizes.md} />
        <View style={styles.linkCopy}>
          <Text style={styles.linkTitle}>Mis premios</Text>
          <Text style={styles.linkText}>Consulta tus canjes y códigos disponibles</Text>
        </View>
        <Ionicons color={colors.textMuted} name="arrow-forward" size={iconSizes.sm} />
      </Pressable>

      {message ? (
        <MotionView
          key={message}
          style={[styles.notice, isError ? styles.errorNotice : styles.successNotice]}
          variant="scale"
        >
          <Ionicons
            color={isError ? colors.error : colors.success}
            name={isError ? 'alert-circle' : 'checkmark-circle'}
            size={iconSizes.sm}
          />
          <Text style={[styles.noticeText, isError && styles.errorNoticeText]}>{message}</Text>
        </MotionView>
      ) : null}

      <Text style={styles.sectionTitle}>Elige tu próximo sabor</Text>
      {rewards.length > 0 ? (
        rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            loading={redeemingId === reward.id}
            onRedeem={() => setSelectedReward(reward)}
            points={points}
            reward={reward}
          />
        ))
      ) : (
        <Text style={styles.empty}>Pronto tendremos nuevos premios para ti.</Text>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedReward(null)}
        transparent
        visible={selectedReward !== null}
      >
        <View style={styles.modalOverlay}>
          <MotionView style={styles.modalMotion} variant="scale">
            <GlassSurface style={styles.modalCard} variant="creamStrong">
              <View style={styles.modalIcon}>
                <Ionicons color={colors.primaryAction} name="gift-outline" size={iconSizes.lg} />
              </View>
              <Text style={styles.modalEyebrow}>CONFIRMAR CANJE</Text>
              <Text style={styles.modalTitle}>{selectedReward?.name}</Text>
              <Text style={styles.modalText}>
                Usarás {selectedReward?.points_required.toLocaleString()} puntos. El premio aparecerá en Mis premios para mostrarlo al personal.
              </Text>
              <PrimaryButton label="Confirmar canje" onPress={() => void handleConfirmRedeem()} />
              <PrimaryButton
                label="Ahora no"
                onPress={() => setSelectedReward(null)}
                style={styles.cancelButton}
                variant="secondary"
              />
            </GlassSurface>
          </MotionView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  balance: { marginTop: spacing.xxl },
  myRewardsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  linkCopy: { flex: 1 },
  linkTitle: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '800' },
  linkText: { marginTop: spacing.xxs, color: colors.textSecondary, fontSize: typography.caption },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  successNotice: { backgroundColor: colors.successSurface },
  errorNotice: { backgroundColor: colors.errorSurface },
  noticeText: { flex: 1, color: colors.success, fontSize: typography.caption, fontWeight: '700' },
  errorNoticeText: { color: colors.error },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '800',
  },
  empty: {
    paddingVertical: spacing.xxxl,
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.overlayStrong,
  },
  modalCard: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  modalMotion: { width: '100%', maxWidth: 420 },
  modalIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.brand.secondary,
  },
  modalEyebrow: {
    marginTop: spacing.lg,
    color: colors.secondaryAction,
    fontSize: typography.micro,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  modalTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  modalText: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },
  cancelButton: { marginTop: spacing.sm },
  pressed: { opacity: 0.72 },
});
