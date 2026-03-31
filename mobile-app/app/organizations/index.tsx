import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { OrganizationCard } from '@/components/discovery/organization-card';
import { ScreenShell } from '@/components/screen-shell';
import { APP_CONFIG } from '@/constants/app';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { publicService } from '@/services/public.service';
import type { PublicOrganization } from '@/types/public';

export default function OrganizationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
  }>();

  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(APP_CONFIG.defaultPage);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadOrganizations() {
      if (!categoryId) {
        setLoading(false);
        setOrganizations([]);
        setError('A categoryId is required to list organizations.');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await publicService.listOrganizations({
          categoryId,
          page: APP_CONFIG.defaultPage,
          limit: APP_CONFIG.defaultLimit,
        });

        if (!active) {
          return;
        }

        setOrganizations(response.data);
        setPage(response.page);
        setTotalPages(response.totalPages);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        const message =
          fetchError instanceof Error ? fetchError.message : 'Unable to load organizations right now.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      active = false;
    };
  }, [categoryId]);

  async function handleLoadMore() {
    if (!categoryId || loadingMore || page >= totalPages) {
      return;
    }

    try {
      setLoadingMore(true);

      const nextPage = page + 1;
      const response = await publicService.listOrganizations({
        categoryId,
        page: nextPage,
        limit: APP_CONFIG.defaultLimit,
      });

      setOrganizations((current) => [...current, ...response.data]);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Unable to load more organizations.';
      setError(message);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <ScreenShell>
      <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.eyebrow, { color: palette.accentStrong }]}>Organizations</Text>
        <Text style={[styles.title, { color: palette.text }]}>Browse businesses by category</Text>
        <Text style={[styles.body, { color: palette.icon }]}>
          This screen is filtered with the category you selected from the discovery rail.
        </Text>
        {categoryName ? (
          <View style={[styles.categoryBadge, { backgroundColor: palette.surfaceMuted }]}>
            <Text style={[styles.categoryBadgeText, { color: palette.tint }]}>{categoryName}</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.feedbackState}>
          <ActivityIndicator color={palette.tint} />
          <Text style={[styles.feedbackText, { color: palette.icon }]}>Loading organizations...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>We could not load this category.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && organizations.length === 0 ? (
        <View style={[styles.feedbackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.feedbackTitle, { color: palette.text }]}>No organizations found.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>
            This category exists but there are no active organizations available yet.
          </Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.list}>
          {organizations.map((organization) => (
            <OrganizationCard
              key={organization.id}
              name={organization.name}
              category={organization.category}
              description={organization.description}
              logo={organization.logo}
              onPress={() =>
                router.push({
                  pathname: '/organizations/[organizationId]',
                  params: {
                    organizationId: organization.id,
                    organizationName: organization.name,
                    categoryName: organization.category ?? categoryName ?? '',
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
          <Text style={[styles.loadMoreText, { color: palette.onTint }]}>
            {loadingMore ? 'Loading...' : 'Load more organizations'}
          </Text>
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
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryBadgeText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
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
  loadMoreButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
