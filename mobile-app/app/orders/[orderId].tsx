import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCustomerSession } from '@/providers/customer-session-provider';
import { orderService } from '@/services/order.service';
import { paymentService } from '@/services/payment.service';
import type { Order } from '@/types/order';
import type { PaymentStatusData } from '@/types/payment';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrderDetailsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { accessToken, isAuthenticated } = useCustomerSession();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const normalizedOrderId = useMemo(() => (typeof orderId === 'string' ? orderId : ''), [orderId]);

  const [order, setOrder] = useState<Order | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      if (!isAuthenticated || !accessToken || !normalizedOrderId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await orderService.getOrder({
          accessToken,
          orderId: normalizedOrderId,
        });

        if (!active) {
          return;
        }

        setOrder(response.data);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        const nextMessage =
          fetchError instanceof Error ? fetchError.message : 'Unable to load this order.';
        setError(nextMessage);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [accessToken, isAuthenticated, normalizedOrderId]);

  async function handlePayNow() {
    if (!accessToken || !normalizedOrderId) {
      return;
    }

    try {
      setActionLoading(true);
      setMessage(null);
      const response = await paymentService.createPayGatePayment({
        accessToken,
        orderId: normalizedOrderId,
      });
      setMessage('Opening PayGate...');
      await WebBrowser.openBrowserAsync(response.paymentUrl);
    } catch (paymentError) {
      const nextMessage =
        paymentError instanceof Error ? paymentError.message : 'Unable to start payment.';
      setMessage(nextMessage);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefreshPaymentStatus() {
    if (!accessToken || !normalizedOrderId) {
      return;
    }

    try {
      setActionLoading(true);
      setMessage(null);
      const response = await paymentService.getPaymentStatus({
        accessToken,
        orderId: normalizedOrderId,
      });
      setPaymentStatus(response.data);

      const refreshedOrder = await orderService.getOrder({
        accessToken,
        orderId: normalizedOrderId,
      });
      setOrder(refreshedOrder.data);
      setMessage(`Payment status updated: ${response.data.status}.`);
    } catch (statusError) {
      const nextMessage =
        statusError instanceof Error ? statusError.message : 'Unable to refresh payment status.';
      setMessage(nextMessage);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <ScreenShell>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.tint} />
          <Text style={[styles.feedbackText, { color: palette.icon }]}>Loading order...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>We could not load this order.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && order ? (
        <>
          <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.eyebrow, { color: palette.accentStrong }]}>Order details</Text>
            <Text style={[styles.title, { color: palette.text }]}>Order {order.id.slice(0, 8)}</Text>
            <Text style={[styles.body, { color: palette.icon }]}>
              Current status: {order.status.replaceAll('_', ' ')}
            </Text>
            <Text style={[styles.total, { color: palette.tint }]}>{formatCurrency(order.total)}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>Items</Text>
            <View style={styles.itemList}>
              {order.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemCopy}>
                    <Text style={[styles.itemName, { color: palette.text }]}>
                      {item.product?.name ?? item.productId}
                    </Text>
                    <Text style={[styles.itemMeta, { color: palette.icon }]}>
                      Qty {item.quantity} • {formatCurrency(item.price)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: palette.text }]}>
                    {formatCurrency(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            {order.status === 'PENDING_PAYMENT' ? (
              <Pressable
                accessibilityRole="button"
                disabled={actionLoading}
                onPress={handlePayNow}
                  style={[
                    styles.primaryAction,
                    { backgroundColor: palette.tint, opacity: actionLoading ? 0.7 : 1 },
                  ]}>
                  <Text style={[styles.primaryActionText, { color: palette.onTint }]}>
                    {actionLoading ? 'Please wait...' : 'Pay with PayGate'}
                  </Text>
                </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={actionLoading}
              onPress={handleRefreshPaymentStatus}
              style={[styles.secondaryAction, { borderColor: palette.border }]}>
              <Text style={[styles.secondaryActionText, { color: palette.text }]}>
                {actionLoading ? 'Refreshing...' : 'Refresh payment status'}
              </Text>
            </Pressable>
          </View>

          {paymentStatus ? (
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>Payment</Text>
              <Text style={[styles.paymentText, { color: palette.icon }]}>
                Status: <Text style={[styles.paymentValue, { color: palette.text }]}>{paymentStatus.status}</Text>
              </Text>
              <Text style={[styles.paymentText, { color: palette.icon }]}>
                Provider: <Text style={[styles.paymentValue, { color: palette.text }]}>{paymentStatus.provider}</Text>
              </Text>
              <Text style={[styles.paymentText, { color: palette.icon }]}>
                Method: <Text style={[styles.paymentValue, { color: palette.text }]}>{paymentStatus.method ?? '-'}</Text>
              </Text>
            </View>
          ) : null}

          {message ? (
            <Text
              style={[
                styles.message,
                { color: message.toLowerCase().includes('unable') ? palette.danger : palette.success },
              ]}>
              {message}
            </Text>
          ) : null}
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
    gap: 10,
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
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  total: {
    fontSize: 22,
    fontWeight: '800',
  },
  loadingState: {
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
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  itemList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemCopy: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 13,
  },
  itemTotal: {
    fontSize: 14,
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
  paymentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  paymentValue: {
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
