import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppHeader } from '@/components/app-header';
import { MenuProductCard } from '@/components/menu-product-card';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

type Category = Pick<Tables<'categories'>, 'id' | 'name' | 'sort_order'>;
type Product = Pick<
  Tables<'products'>,
  'id' | 'category_id' | 'name' | 'description' | 'price' | 'image_url'
>;

export default function MenuScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    const [categoryResult, productResult] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, sort_order')
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('products')
        .select('id, category_id, name, description, price, image_url')
        .eq('active', true)
        .order('name'),
    ]);

    if (categoryResult.error || productResult.error) {
      setErrorMessage('No se pudo cargar el menú de Estero 10.');
      setLoading(false);
      return;
    }

    setCategories(categoryResult.data ?? []);
    setProducts(productResult.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMenu();
    }, [loadMenu])
  );

  useEffect(() => {
    if (!selectedCategoryId && categories[0]) {
      setSelectedCategoryId(categories[0].id);
    } else if (
      selectedCategoryId &&
      !categories.some((category) => category.id === selectedCategoryId)
    ) {
      setSelectedCategoryId(categories[0]?.id ?? null);
    }
  }, [categories, selectedCategoryId]);

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  );
  const visibleProducts = useMemo(
    () => products.filter((product) => product.category_id === selectedCategoryId),
    [products, selectedCategoryId]
  );

  if (loading) return <LoadingState message="Preparando el menú..." />;
  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void loadMenu()} />;
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader
        eyebrow="DEL MAR A TU MESA"
        subtitle="Descubre los sabores que hoy preparamos para ti."
        title="Menú"
      />

      {categories.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroller}
        >
          {categories.map((category) => {
            const selected = category.id === selectedCategoryId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={category.id}
                onPress={() => setSelectedCategoryId(category.id)}
                style={({ pressed }) => [
                  styles.categoryPill,
                  selected && styles.categoryPillSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.categoryTitle}>{selectedCategory?.name ?? 'Nuestra carta'}</Text>
          <Text style={styles.productCount}>
            {visibleProducts.length} {visibleProducts.length === 1 ? 'opción' : 'opciones'}
          </Text>
        </View>
        <View style={styles.accentLine} />
      </View>

      {visibleProducts.length > 0 ? (
        visibleProducts.map((product) => (
          <MenuProductCard key={product.id} product={product} />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Próximamente</Text>
          <Text style={styles.emptyText}>
            Estamos preparando nuevas opciones para esta categoría.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
  },
  categoryScroller: {
    marginHorizontal: -spacing.xl,
    marginTop: spacing.xxl,
  },
  categories: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  categoryPill: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  categoryPillSelected: {
    borderColor: colors.primaryAction,
    backgroundColor: colors.primaryAction,
  },
  categoryLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  categoryLabelSelected: {
    color: colors.onPrimary,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '800',
  },
  productCount: {
    marginTop: spacing.xxs,
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  accentLine: {
    width: 42,
    height: 3,
    marginBottom: spacing.xxs,
    borderRadius: radii.round,
    backgroundColor: colors.brand.accent,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.section,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '800',
  },
  emptyText: {
    maxWidth: 320,
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
});
