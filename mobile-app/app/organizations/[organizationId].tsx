import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ProductCard } from '@/components/discovery/product-card';
import { ScreenShell } from '@/components/screen-shell';
import { APP_CONFIG } from '@/constants/app';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { publicService } from '@/services/public.service';
import type { PublicProduct } from '@/types/public';

export default function OrganizationDetailsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { organizationId, organizationName, categoryName } = useLocalSearchParams<{
    organizationId: string;
    organizationName?: string;
    categoryName?: string;
  }>();

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(APP_CONFIG.defaultPage);
  const [totalPages, setTotalPages] = useState(1);

  const normalizedOrganizationId = useMemo(
    () => (typeof organizationId === 'string' ? organizationId : ''),
    [organizationId]
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!normalizedOrganizationId) {
        setLoading(false);
        setProducts([]);
        setError('An organizationId is required to load products.');
        return;
      }

      try {
        if (active) {
          setLoading(true);
          setError(null);
        }

        const response = await publicService.listOrganizationProducts(normalizedOrganizationId, {
          page: APP_CONFIG.defaultPage,
          limit: APP_CONFIG.defaultLimit,
          search: query.trim() || undefined,
        });

        if (!active) {
          return;
        }

        setProducts(response.data);
        setPage(response.page);
        setTotalPages(response.totalPages);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        const message =
          fetchError instanceof Error ? fetchError.message : 'Unable to load products right now.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalizedOrganizationId, query]);

  async function handleLoadMore() {
    if (!normalizedOrganizationId || loadingMore || page >= totalPages) {
      return;
    }

    try {
      setLoadingMore(true);

      const nextPage = page + 1;
      const response = await publicService.listOrganizationProducts(normalizedOrganizationId, {
        page: nextPage,
        limit: APP_CONFIG.defaultLimit,
        search: query.trim() || undefined,
      });

      setProducts((current) => [...current, ...response.data]);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Unable to load more products.';
      setError(message);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <ScreenShell>
      <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.heroTop}>
          <View style={[styles.iconWrap, { backgroundColor: palette.surfaceMuted }]}>
            <MaterialIcons name="storefront" size={28} color={palette.tint} />
          </View>
          {categoryName ? (
            <View style={[styles.badge, { backgroundColor: palette.surfaceMuted }]}>
              <Text style={[styles.badgeText, { color: palette.accentStrong }]}>{categoryName}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.title, { color: palette.text }]}>
          {typeof organizationName === 'string' && organizationName ? organizationName : 'Organization'}
        </Text>
        <Text style={[styles.body, { color: palette.icon }]}>
          Browse public products from this organization and open a product sheet before adding items to cart.
        </Text>

        <Link href="/login" asChild>
          <Pressable style={[styles.heroButton, { borderColor: palette.border }]}>
            <Text style={[styles.heroButtonText, { color: palette.text }]}>Sign in to keep your cart</Text>
          </Pressable>
        </Link>
      </View>

      <View style={[styles.searchCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.searchLabel, { color: palette.text }]}>Search products</Text>
        <TextInput
          autoCapitalize="none"
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder="Rice, milk, soap..."
          placeholderTextColor={palette.icon}
          value={query}
          style={[
            styles.searchInput,
            {
              borderColor: palette.border,
              color: palette.text,
              backgroundColor: palette.background,
            },
          ]}
        />
      </View>

      {loading ? (
        <View style={styles.feedbackState}>
          <ActivityIndicator color={palette.tint} />
          <Text style={[styles.feedbackText, { color: palette.icon }]}>Loading products...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>We could not load this organization.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && products.length === 0 ? (
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>No products found.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>
            Try a different search or come back later when this organization publishes more active products.
          </Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.list}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              name={product.name}
              price={product.price}
              quantity={product.quantity}
              onPress={() =>
                router.push({
                  pathname: '/products/[productId]',
                  params: {
                    productId: product.id,
                    organizationName: typeof organizationName === 'string' ? organizationName : '',
                  },
                })
              }
            />
          ))}
        </View>
      ) : null}

      {!loading && !error && page < totalPages ? (
        <Pressable
          accessibilityRole="button"
          onPress={handleLoadMore}
          style={[styles.loadMoreButton, { backgroundColor: palette.tint }]}>
          <Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load more products'}</Text>
        </Pressable>
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
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  badgeText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
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
  heroButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  searchLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
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
  loadMoreButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
