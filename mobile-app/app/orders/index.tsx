import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { OrderCard } from '@/components/orders/order-card';
import { ScreenShell } from '@/components/screen-shell';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCustomerSession } from '@/providers/customer-session-provider';
import { orderService } from '@/services/order.service';
import type { Order } from '@/types/order';

export default function OrdersScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const isFocused = useIsFocused();
  const { accessToken, isAuthenticated, isHydrating } = useCustomerSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      if (!isFocused || !isAuthenticated || !accessToken) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await orderService.getMyOrders({ accessToken });

        if (!active) {
          return;
        }

        setOrders(response.data);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        const message = fetchError instanceof Error ? fetchError.message : 'Unable to load orders.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [accessToken, isAuthenticated, isFocused]);

  if (isHydrating) {
    return (
      <ScreenShell>
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>Loading session...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenShell>
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>Sign in to view your orders.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>
            Order history is available only for the authenticated customer session.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.eyebrow, { color: palette.accentStrong }]}>Order history</Text>
        <Text style={[styles.title, { color: palette.text }]}>Track your recent orders</Text>
        <Text style={[styles.body, { color: palette.icon }]}>
          Each order comes from the real `/api/orders/my-orders` endpoint.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.tint} />
          <Text style={[styles.feedbackText, { color: palette.icon }]}>Loading orders...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>We could not load your orders.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>No orders yet.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>
            Once you check out a cart, your orders will appear here.
          </Text>
        </View>
      ) : null}

      {!loading && !error && orders.length > 0 ? (
        <View style={styles.list}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              createdAt={order.createdAt}
              id={order.id}
              itemCount={order.items.length}
              status={order.status}
              total={order.total}
              onPress={() =>
                router.push({
                  pathname: '/orders/[orderId]',
                  params: { orderId: order.id },
                })
              }
            />
          ))}
        </View>
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
  loadingState: {
    gap: 8,
    alignItems: 'flex-start',
  },
  list: {
    gap: 12,
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
