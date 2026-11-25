import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/glass-surface';
import { MotionView } from '@/components/motion-view';
import { colors, iconSizes, radii, spacing, typography } from '@/constants/theme';
import type { Tables } from '@/types/database';

type MenuProduct = Pick<
  Tables<'products'>,
  'id' | 'name' | 'description' | 'price' | 'image_url'
>;

export function MenuProductCard({ product }: { product: MenuProduct }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [product.image_url]);

  const hasImage = Boolean(product.image_url) && !imageFailed;

  return (
    <MotionView style={styles.card}>
      <View style={styles.imageFrame}>
        {hasImage ? (
          <Image
            accessibilityLabel={`Fotografía de ${product.name}`}
            contentFit="cover"
            onError={() => setImageFailed(true)}
            source={product.image_url}
            style={StyleSheet.absoluteFill}
            transition={260}
          />
        ) : (
          <View style={styles.fallback}>
            <View style={styles.fallbackRing}>
              <Ionicons color={colors.secondaryAction} name="restaurant-outline" size={iconSizes.lg} />
            </View>
            <Text style={styles.fallbackText}>Del mar lo mejor</Text>
          </View>
        )}

        <GlassSurface style={styles.priceSurface} variant="creamStrong">
          <Text style={styles.price}>Q{Number(product.price).toFixed(2)}</Text>
        </GlassSurface>
      </View>

      <View style={styles.copy}>
        <Text style={styles.name}>{product.name}</Text>
        {product.description ? (
          <Text style={styles.description}>{product.description}</Text>
        ) : (
          <Text style={styles.descriptionMuted}>Preparado por Estero 10.</Text>
        )}
      </View>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xxl,
  },
  imageFrame: {
    height: 220,
    overflow: 'hidden',
    borderRadius: radii.xl,
    backgroundColor: colors.primaryAction,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navySurface,
  },
  fallbackRing: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.secondaryAction,
  },
  fallbackText: {
    marginTop: spacing.sm,
    color: colors.onNavyMuted,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  priceSurface: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  price: {
    color: colors.textPrimary,
    fontSize: typography.action,
    fontWeight: '800',
  },
  copy: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  description: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },
  descriptionMuted: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typography.body,
    fontStyle: 'italic',
  },
});
