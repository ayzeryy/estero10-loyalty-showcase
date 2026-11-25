import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { TransactionItem } from '@/components/transaction-item';
import { colors, iconSizes, layout, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { Tables } from '@/types/database';

type Transaction = Pick<
  Tables<'point_transactions'>,
  'id' | 'points' | 'description' | 'created_at'
>;

const PAGE_SIZE = 20;

async function getTransactionsPage(userId: string, offset: number) {
  return supabase
    .from('point_transactions')
    .select('id, points, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadMoreError, setLoadMoreError] = useState('');

  const loadTransactions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setErrorMessage('');
    setLoadMoreError('');

    const { data, error } = await getTransactionsPage(user.id, 0);

    if (error) {
      setErrorMessage('No se pudo cargar tu historial.');
    } else {
      const page = data ?? [];
      setTransactions(page);
      setHasMore(page.length === PAGE_SIZE);
    }

    setLoading(false);
  }, [user]);

  const refreshTransactions = useCallback(async () => {
    if (!user || refreshing) return;

    setRefreshing(true);
    setLoadMoreError('');
    const { data, error } = await getTransactionsPage(user.id, 0);

    if (error) {
      setLoadMoreError('No se pudo actualizar. Intenta nuevamente.');
    } else {
      const page = data ?? [];
      setTransactions(page);
      setHasMore(page.length === PAGE_SIZE);
    }

    setRefreshing(false);
  }, [refreshing, user]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore || !hasMore) return;

    setLoadingMore(true);
    setLoadMoreError('');
    const { data, error } = await getTransactionsPage(user.id, transactions.length);

    if (error) {
      setLoadMoreError('No se pudieron cargar más movimientos.');
    } else {
      const page = data ?? [];
      setTransactions((current) => [...current, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    }

    setLoadingMore(false);
  }, [hasMore, loadingMore, transactions.length, user]);

  useFocusEffect(
    useCallback(() => {
      void loadTransactions();
    }, [loadTransactions])
  );

  if (loading) {
    return <LoadingState message="Cargando movimientos..." />;
  }

  if (errorMessage) {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={() => void loadTransactions()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={transactions.length === 0 ? styles.emptyList : styles.list}
        data={transactions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>TU HISTORIA</Text>
            <Text style={styles.title}>Cada visita cuenta</Text>
            <Text style={styles.subtitle}>
              Revisa los puntos que ganaste y los que usaste en Estero 10.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons color={colors.secondaryAction} name="receipt-outline" size={iconSizes.lg} />
            <Text style={styles.emptyTitle}>Aún no hay movimientos</Text>
            <Text style={styles.emptyText}>Tu primera visita aparecerá aquí.</Text>
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
        onRefresh={() => void refreshTransactions()}
        refreshing={refreshing}
        renderItem={({ item }) => <TransactionItem transaction={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.section,
  },
  emptyList: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },
  intro: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  eyebrow: {
    color: colors.secondaryAction,
    fontSize: typography.micro,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.section,
  },
  emptyTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.body,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  footerError: {
    color: colors.error,
    fontSize: typography.caption,
    textAlign: 'center',
  },
});
