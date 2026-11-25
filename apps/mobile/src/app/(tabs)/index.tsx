import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BrandLogo } from '@/components/brand-logo';
import { PointsBalanceCard } from '@/components/points-balance-card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { SectionHeader } from '@/components/section-header';
import { TransactionItem } from '@/components/transaction-item';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { Tables } from '@/types/database';

type Transaction = Pick<
  Tables<'point_transactions'>,
  'id' | 'points' | 'description' | 'created_at'
>;

type Reward = Pick<Tables<'rewards'>, 'id' | 'name' | 'points_required'>;

export default function HomeScreen() {
  const { user } = useAuth();
  const [name, setName] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadHome = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setErrorMessage('');

    const [profileResult, accountResult, transactionsResult, rewardsResult] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('loyalty_accounts')
          .select('points_balance, lifetime_points')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('point_transactions')
          .select('id, points, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('rewards')
          .select('id, name, points_required')
          .eq('active', true)
          .order('points_required'),
      ]);

    if (
      profileResult.error ||
      accountResult.error ||
      transactionsResult.error ||
      rewardsResult.error
    ) {
      setErrorMessage('No se pudo actualizar tu información de fidelidad.');
      setLoading(false);
      return;
    }

    setName(profileResult.data?.name ?? null);
    setPoints(accountResult.data.points_balance);
    setLifetimePoints(accountResult.data.lifetime_points);
    setTransactions(transactionsResult.data ?? []);
    setRewards(rewardsResult.data ?? []);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [loadHome])
  );

  if (loading) {
    return <LoadingState message="Actualizando tus puntos..." />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void loadHome()} />;
  }

  const displayName =
    name?.trim().split(/\s+/)[0] || user?.email?.split('@')[0] || 'cliente';
  const nextReward = rewards.find((reward) => reward.points_required > points);
  const progress = nextReward
    ? Math.min(points / nextReward.points_required, 1)
    : 1;

  return (
    <Screen contentContainerStyle={styles.content}>
      <BrandLogo compact style={styles.logo} />
      <AppHeader
        eyebrow="DEL MAR LO MEJOR"
        title={`Hola, ${displayName}`}
        subtitle="Saborea el momento. Nosotros llevamos la cuenta."
      />

      <View style={styles.balanceWrapper}>
        <PointsBalanceCard lifetimePoints={lifetimePoints} points={points} />
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.progressCopy}>
            <View style={styles.progressDot} />
            <Text style={styles.progressText}>
              {nextReward
                ? `Te faltan ${nextReward.points_required - points} pts para ${nextReward.name}`
                : 'Ya alcanzaste los premios disponibles.'}
            </Text>
          </View>
        </View>
      </View>

      <PrimaryButton
        label="Escanear una compra"
        onPress={() => router.push('/scan')}
        style={styles.scanButton}
      />

      <View style={styles.quickLinks}>
        <QuickLink
          label="Historial"
          onPress={() => router.push('/history')}
          value="Tus movimientos"
        />
        <View style={styles.quickDivider} />
        <QuickLink
          label="Mis premios"
          onPress={() => router.push('/my-rewards')}
          value="Tus canjes"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          action="Ver historial"
          onPress={() => router.push('/history')}
          title="Últimos movimientos"
        />
        <View style={styles.list}>
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <Text style={styles.emptyText}>Todavía no tienes movimientos.</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          action="Ver catálogo"
          onPress={() => router.push('/rewards')}
          title="Premios disponibles"
        />
        <View style={styles.list}>
          {rewards.length > 0 ? (
            rewards.slice(0, 3).map((reward) => (
              <Pressable
                key={reward.id}
                onPress={() => router.push('/rewards')}
                style={({ pressed }) => [
                  styles.rewardRow,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.rewardName}>{reward.name}</Text>
                <Text style={styles.rewardPoints}>
                  {reward.points_required} pts
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay premios disponibles.</Text>
          )}
        </View>
      </View>
    </Screen>
  );
}

type QuickLinkProps = {
  label: string;
  value: string;
  onPress: () => void;
};

function QuickLink({ label, onPress, value }: QuickLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickLink, pressed && styles.pressed]}
    >
      <Text style={styles.quickLinkLabel}>{label}</Text>
      <Text style={styles.quickLinkValue}>{value} →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
  },
  logo: {
    width: 106,
    height: 64,
    marginBottom: spacing.sm,
  },
  balanceWrapper: {
    marginTop: spacing.xxl,
  },
  progressSection: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
  },
  progressFill: {
    height: '100%',
    minWidth: 6,
    borderRadius: radii.round,
    backgroundColor: colors.secondaryAction,
  },
  progressCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  progressDot: {
    width: 7,
    height: 7,
    marginRight: spacing.xs,
    borderRadius: radii.round,
    backgroundColor: colors.brand.accent,
  },
  progressText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  scanButton: {
    marginTop: spacing.xl,
  },
  quickLinks: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.lg,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  quickLink: {
    flex: 1,
    minHeight: 78,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  quickLinkLabel: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  quickLinkValue: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  quickDivider: {
    width: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: colors.border,
  },
  section: {
    marginTop: spacing.xxxl,
    gap: spacing.sm,
  },
  list: {
    borderTopColor: colors.borderStrong,
    borderTopWidth: 1,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 58,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  rewardName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '600',
    paddingRight: spacing.sm,
  },
  rewardPoints: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
