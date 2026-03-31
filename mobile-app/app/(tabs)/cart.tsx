import { useIsFocused } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { ScreenShell } from '@/components/screen-shell';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCart } from '@/providers/cart-provider';
import { useCustomerSession } from '@/providers/customer-session-provider';
import { orderService } from '@/services/order.service';
import { paymentService } from '@/services/payment.service';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CartScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const isFocused = useIsFocused();
  const { cart, isCartLoading, refreshCart, removeItem } = useCart();
  const { accessToken, isAuthenticated, isHydrating } = useCustomerSession();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCart() {
      if (!isAuthenticated || !accessToken || !isFocused) {
        return;
      }

      try {
        setError(null);
        setMessage(null);
        await refreshCart();
      } catch (fetchError) {
        const nextMessage = fetchError instanceof Error ? fetchError.message : 'Unable to load cart.';
        setError(nextMessage);
      }
    }

    loadCart();
  }, [accessToken, isAuthenticated, isFocused, refreshCart]);

  async function handleRemove(itemId: string) {
    try {
      setRemovingItemId(itemId);
      await removeItem(itemId);
    } catch (removeError) {
      const nextMessage = removeError instanceof Error ? removeError.message : 'Unable to remove item.';
      setError(nextMessage);
    } finally {
      setRemovingItemId(null);
    }
  }

  async function handleCheckout() {
    if (!accessToken) {
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);
      setMessage(null);

      const orderResponse = await orderService.checkout({ accessToken });
      const paymentResponse = await paymentService.createPayGatePayment({
        accessToken,
        orderId: orderResponse.data.id,
      });

      await refreshCart();
      setMessage('Order created. Opening PayGate...');

      await WebBrowser.openBrowserAsync(paymentResponse.paymentUrl);
      router.push({
        pathname: '/orders/[orderId]',
        params: { orderId: orderResponse.data.id },
      });
    } catch (checkoutError) {
      const nextMessage =
        checkoutError instanceof Error ? checkoutError.message : 'Unable to complete checkout.';
      setError(nextMessage);
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (isHydrating) {
    return (
      <ScreenShell>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.title, { color: palette.text }]}>Loading session...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenShell>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: palette.surfaceMuted }]}>
            <MaterialIcons name="shopping-cart-checkout" size={28} color={palette.tint} />
          </View>
          <Text style={[styles.title, { color: palette.text }]}>Sign in to open your cart</Text>
          <Text style={[styles.body, { color: palette.icon }]}>
            Cartigo now protects the cart with the real customer session and bearer token.
          </Text>
        </View>

          <View style={styles.actions}>
            <Link href="/login" asChild>
              <Pressable style={[styles.primaryAction, { backgroundColor: palette.tint }]}>
                <Text style={[styles.primaryActionText, { color: palette.onTint }]}>Sign in</Text>
              </Pressable>
            </Link>
          <Link href="/register" asChild>
            <Pressable style={[styles.secondaryAction, { borderColor: palette.border }]}>
              <Text style={[styles.secondaryActionText, { color: palette.text }]}>Create account</Text>
            </Pressable>
          </Link>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: palette.surfaceMuted }]}>
          <MaterialIcons name="shopping-cart-checkout" size={28} color={palette.tint} />
        </View>
        <Text style={[styles.title, { color: palette.text }]}>Your cart</Text>
        <Text style={[styles.body, { color: palette.icon }]}>
          This screen loads the real `/api/cart` endpoint with the customer access token.
        </Text>
      </View>

      {isCartLoading ? (
        <View style={styles.feedbackState}>
          <ActivityIndicator color={palette.tint} />
          <Text style={[styles.feedbackText, { color: palette.icon }]}>Loading cart...</Text>
        </View>
      ) : null}

      {!isCartLoading && error ? (
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>We could not load the cart.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>{error}</Text>
        </View>
      ) : null}

      {!isCartLoading && !error && cart.items.length === 0 ? (
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>Your cart is empty.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>
            Browse a category and add a product to see it here.
          </Text>
        </View>
      ) : null}

      {!isCartLoading && !error && cart.items.length > 0 ? (
        <>
          <View style={styles.list}>
            {cart.items.map((item) => (
              <View
                key={item.id}
                style={[styles.itemCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, { color: palette.text }]}>{item.name}</Text>
                  <Text style={[styles.itemMeta, { color: palette.icon }]}>
                    Qty {item.quantity} • {formatCurrency(Number(item.price))}
                  </Text>
                  <Text style={[styles.itemSubtotal, { color: palette.tint }]}>
                    {formatCurrency(Number(item.subtotal))}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={removingItemId === item.id}
                  onPress={() => handleRemove(item.id)}
                  style={[styles.removeButton, { borderColor: palette.border }]}>
                  <Text style={[styles.removeButtonText, { color: palette.text }]}>
                    {removingItemId === item.id ? 'Removing...' : 'Remove'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.summaryLabel, { color: palette.icon }]}>Total</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>
              {formatCurrency(Number(cart.total))}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={checkoutLoading}
            onPress={handleCheckout}
              style={[
                styles.checkoutButton,
                { backgroundColor: palette.tint, opacity: checkoutLoading ? 0.7 : 1 },
              ]}>
              <Text style={[styles.checkoutButtonText, { color: palette.onTint }]}>
                {checkoutLoading ? 'Creating order...' : 'Checkout and pay'}
              </Text>
            </Pressable>
        </>
      ) : null}

      {message ? <Text style={[styles.messageText, { color: palette.success }]}>{message}</Text> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
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
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
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
  list: {
    gap: 12,
  },
  itemCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  itemContent: {
    gap: 4,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 13,
  },
  itemSubtotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  removeButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  checkoutButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
