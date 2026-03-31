import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCart } from '@/providers/cart-provider';
import { useCustomerSession } from '@/providers/customer-session-provider';
import { publicService } from '@/services/public.service';
import type { PublicProductDetails } from '@/types/public';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductDetailsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { addToCart } = useCart();
  const { accessToken, isAuthenticated } = useCustomerSession();
  const { productId, organizationName } = useLocalSearchParams<{
    productId: string;
    organizationName?: string;
  }>();

  const normalizedProductId = useMemo(() => (typeof productId === 'string' ? productId : ''), [productId]);
  const [product, setProduct] = useState<PublicProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!normalizedProductId) {
        setLoading(false);
        setError('A productId is required to load this product.');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await publicService.getProduct(normalizedProductId);

        if (!active) {
          return;
        }

        setProduct(response);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        const message =
          fetchError instanceof Error ? fetchError.message : 'Unable to load this product right now.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [normalizedProductId]);

  useEffect(() => {
    if (!product) {
      return;
    }

    setQuantity((current) => {
      if (product.quantity <= 0) {
        return 1;
      }

      return Math.min(current, product.quantity);
    });
  }, [product]);

  async function handleAddToCart() {
    if (!accessToken || !product) {
      return;
    }

    try {
      setAddingToCart(true);
      await addToCart(product.id, quantity);
    } catch {
      // CartProvider already surfaces the error through the global toast.
    } finally {
      setAddingToCart(false);
    }
  }

  return (
    <ScreenShell>
      {loading ? (
        <View style={styles.feedbackState}>
          <ActivityIndicator color={palette.tint} />
          <Text style={[styles.feedbackText, { color: palette.icon }]}>Loading product...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>We could not load this product.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && product ? (
        <>
          <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: palette.surfaceMuted }]}>
              <MaterialIcons name="sell" size={28} color={palette.accentStrong} />
            </View>
            {typeof organizationName === 'string' && organizationName ? (
              <Text style={[styles.eyebrow, { color: palette.accentStrong }]}>{organizationName}</Text>
            ) : null}
            <Text style={[styles.title, { color: palette.text }]}>{product.name}</Text>
            <Text style={[styles.price, { color: palette.tint }]}>{formatCurrency(product.price)}</Text>
            <Text style={[styles.body, { color: palette.icon }]}>
              {product.description?.trim() || 'No public description is available for this product yet.'}
            </Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: palette.icon }]}>Availability</Text>
              <Text style={[styles.infoValue, { color: palette.text }]}>
                {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: palette.icon }]}>Product ID</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>{product.id}</Text>
            </View>
          </View>

          <View style={[styles.quantityCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.infoLabel, { color: palette.icon }]}>Quantity</Text>
            <View style={styles.quantityRow}>
              <Pressable
                accessibilityRole="button"
                disabled={quantity <= 1}
                onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                style={[styles.quantityButton, { borderColor: palette.border }]}>
                <Text style={[styles.quantityButtonText, { color: palette.text }]}>-</Text>
              </Pressable>
              <Text style={[styles.quantityValue, { color: palette.text }]}>{quantity}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={product.quantity <= 0 || quantity >= product.quantity}
                onPress={() => setQuantity((current) => Math.min(product.quantity, current + 1))}
                style={[styles.quantityButton, { borderColor: palette.border }]}>
                <Text style={[styles.quantityButtonText, { color: palette.text }]}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actions}>
            {isAuthenticated ? (
              <Pressable
                accessibilityRole="button"
                disabled={addingToCart || product.quantity <= 0}
                onPress={handleAddToCart}
                  style={[
                    styles.primaryAction,
                    {
                      backgroundColor: product.quantity > 0 ? palette.tint : palette.border,
                      opacity: addingToCart ? 0.7 : 1,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.primaryActionText,
                      { color: product.quantity > 0 ? palette.onTint : palette.text },
                    ]}>
                    {addingToCart ? 'Adding...' : product.quantity > 0 ? 'Add to cart' : 'Unavailable'}
                  </Text>
                </Pressable>
              ) : (
                <Link href="/login" asChild>
                  <Pressable style={[styles.primaryAction, { backgroundColor: palette.tint }]}>
                    <Text style={[styles.primaryActionText, { color: palette.onTint }]}>
                      Sign in to add to cart
                    </Text>
                  </Pressable>
                </Link>
              )}

            <Link href="/(tabs)/cart" asChild>
              <Pressable style={[styles.secondaryAction, { borderColor: palette.border }]}>
                <Text style={[styles.secondaryActionText, { color: palette.text }]}>Open cart</Text>
              </Pressable>
            </Link>
          </View>
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  infoRow: {
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metaValue: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  quantityCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quantityButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  quantityValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  actions: {
    gap: 10,
  },
  primaryAction: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  feedbackState: {
    gap: 8,
    alignItems: 'flex-start',
  },
  feedbackCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
