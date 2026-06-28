import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
  type SectionListData,
  type SectionListRenderItemInfo,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryPill } from '@/components/discovery/category-pill';
import { OrganizationCard } from '@/components/discovery/organization-card';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/providers/notification-provider';
import { publicService } from '@/services/public.service';
import type { OrganizationCategory, PublicOrganization } from '@/types/public';

const PAGE_SIZE = 16;
const CATEGORY_RAIL_PADDING = 16;

type OrganizationRow = [PublicOrganization, PublicOrganization?];

type DiscoverySection = {
  key: string;
  categoryId: string;
  title: string;
  data: OrganizationRow[];
  count: number;
};

function chunkOrganizations(organizations: PublicOrganization[]) {
  const rows: OrganizationRow[] = [];

  for (let index = 0; index < organizations.length; index += 2) {
    rows.push([organizations[index], organizations[index + 1]]);
  }

  return rows;
}

function mergeOrganizations(current: PublicOrganization[], incoming: PublicOrganization[]) {
  const organizationMap = new Map(current.map((organization) => [organization.id, organization]));

  incoming.forEach((organization) => {
    organizationMap.set(organization.id, {
      ...organizationMap.get(organization.id),
      ...organization,
    });
  });

  return Array.from(organizationMap.values());
}

function getOrganizationRowKey(item: OrganizationRow | undefined, index: number) {
  const firstOrganizationId = item?.[0]?.id;
  const secondOrganizationId = item?.[1]?.id ?? 'empty';

  if (!firstOrganizationId) {
    return `organization-row-${index}`;
  }

  return `${firstOrganizationId}-${secondOrganizationId}-${index}`;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const sectionListRef = useRef<SectionList<OrganizationRow, DiscoverySection>>(null);
  const categoryRailRef = useRef<ScrollView>(null);
  const pendingCategoryIdRef = useRef<string | null>(null);
  const categoryLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});

  const [categories, setCategories] = useState<OrganizationCategory[]>([]);
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [organizationsError, setOrganizationsError] = useState<string | null>(null);

  const organizationsByCategoryId = useMemo(() => {
    const grouped = new Map<string, PublicOrganization[]>();

    organizations.forEach((organization) => {
      if (!grouped.has(organization.categoryId)) {
        grouped.set(organization.categoryId, []);
      }

      grouped.get(organization.categoryId)?.push(organization);
    });

    grouped.forEach((items) => {
      items.sort((left, right) => left.name.localeCompare(right.name));
    });

    return grouped;
  }, [organizations]);

  const sections = useMemo<DiscoverySection[]>(() => {
    return categories
      .map((category) => {
        const organizationsForCategory = organizationsByCategoryId.get(category.id) ?? [];

        if (!organizationsForCategory.length) {
          return null;
        }

        return {
          key: category.id,
          categoryId: category.id,
          title: category.name,
          count: organizationsForCategory.length,
          data: chunkOrganizations(organizationsForCategory),
        };
      })
      .filter((section): section is DiscoverySection => section !== null);
  }, [categories, organizationsByCategoryId]);

  const hasMoreOrganizations = page < totalPages;

  const scrollCategoryRailIntoView = useCallback((categoryId: string) => {
    const layout = categoryLayoutsRef.current[categoryId];

    if (!layout) {
      return;
    }

    const nextOffset = Math.max(0, layout.x - CATEGORY_RAIL_PADDING);

    requestAnimationFrame(() => {
      categoryRailRef.current?.scrollTo({
        x: nextOffset,
        y: 0,
        animated: true,
      });
    });
  }, []);

  const scrollToCategory = useCallback(
    (categoryId: string) => {
      const sectionIndex = sections.findIndex((section) => section.categoryId === categoryId);

      if (sectionIndex < 0) {
        return false;
      }

      requestAnimationFrame(() => {
        sectionListRef.current?.scrollToLocation({
          animated: true,
          itemIndex: 0,
          sectionIndex,
          viewOffset: 6,
        });
      });

      return true;
    },
    [sections]
  );

  const loadMoreOrganizations = useCallback(async () => {
    if (isInitialLoading || isLoadingMore || !hasMoreOrganizations) {
      return;
    }

    try {
      setIsLoadingMore(true);

      const response = await publicService.listOrganizations({
        page: page + 1,
        limit: PAGE_SIZE,
      });

      setOrganizations((current) => mergeOrganizations(current, response.data));
      setPage(response.page);
      setTotalPages(response.totalPages);
      setOrganizationsError(null);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Impossible de charger plus d organisations.';
      setOrganizationsError(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreOrganizations, isInitialLoading, isLoadingMore, page]);

  useEffect(() => {
    let active = true;

    async function loadDiscovery() {
      try {
        setIsInitialLoading(true);
        setCategoriesError(null);
        setOrganizationsError(null);

        const [categoriesResult, organizationsResult] = await Promise.allSettled([
          publicService.listCategories(),
          publicService.listOrganizations({
            page: 1,
            limit: PAGE_SIZE,
          }),
        ]);

        if (!active) {
          return;
        }

        if (categoriesResult.status === 'fulfilled') {
          setCategories(categoriesResult.value);
        } else {
          setCategoriesError(
            categoriesResult.reason instanceof Error
              ? categoriesResult.reason.message
              : 'Impossible de charger les categories.'
          );
        }

        if (organizationsResult.status === 'fulfilled') {
          setOrganizations(organizationsResult.value.data);
          setPage(organizationsResult.value.page);
          setTotalPages(organizationsResult.value.totalPages);
        } else {
          setOrganizationsError(
            organizationsResult.reason instanceof Error
              ? organizationsResult.reason.message
              : 'Impossible de charger les organisations.'
          );
        }
      } finally {
        if (active) {
          setIsInitialLoading(false);
        }
      }
    }

    loadDiscovery();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setActiveCategoryId((current) => {
      if (current && categories.some((category) => category.id === current)) {
        return current;
      }

      return sections[0]?.categoryId ?? categories[0]?.id ?? null;
    });
  }, [categories, sections]);

  useEffect(() => {
    if (activeCategoryId) {
      scrollCategoryRailIntoView(activeCategoryId);
    }
  }, [activeCategoryId, scrollCategoryRailIntoView]);

  useEffect(() => {
    const pendingCategoryId = pendingCategoryIdRef.current;

    if (!pendingCategoryId || isInitialLoading) {
      return;
    }

    if (scrollToCategory(pendingCategoryId)) {
      pendingCategoryIdRef.current = null;
      return;
    }

    if (hasMoreOrganizations && !isLoadingMore) {
      loadMoreOrganizations();
      return;
    }

    if (!hasMoreOrganizations) {
      pendingCategoryIdRef.current = null;
    }
  }, [hasMoreOrganizations, isInitialLoading, isLoadingMore, loadMoreOrganizations, scrollToCategory, sections]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<OrganizationRow>[] }) => {
      if (pendingCategoryIdRef.current) {
        return;
      }

      const visibleCategoryId = viewableItems.find((item) => item.section?.categoryId)?.section?.categoryId;

      if (visibleCategoryId) {
        setActiveCategoryId((current) => (current === visibleCategoryId ? current : visibleCategoryId));
      }
    }
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
    waitForInteraction: true,
  });

  const handleCategoryPress = useCallback(
    (category: OrganizationCategory) => {
      setActiveCategoryId(category.id);
      scrollCategoryRailIntoView(category.id);
      pendingCategoryIdRef.current = category.id;

      if (scrollToCategory(category.id)) {
        pendingCategoryIdRef.current = null;
        return;
      }

      if (hasMoreOrganizations && !isLoadingMore) {
        loadMoreOrganizations();
      }
    },
    [hasMoreOrganizations, isLoadingMore, loadMoreOrganizations, scrollCategoryRailIntoView, scrollToCategory]
  );

  const handleCategoryLayout = useCallback(
    (categoryId: string, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      categoryLayoutsRef.current[categoryId] = { x, width };
    },
    []
  );

  const renderOrganizationRow = useCallback(
    ({ item, section }: SectionListRenderItemInfo<OrganizationRow, DiscoverySection>) => {
      const [firstOrganization, secondOrganization] = item;

      return (
        <View style={styles.organizationRow}>
          <OrganizationCard
            category={firstOrganization.category}
            description={firstOrganization.description}
            logo={firstOrganization.logo}
            name={firstOrganization.name}
            onPress={() =>
              router.push({
                pathname: '/organizations/[organizationId]',
                params: {
                  organizationId: firstOrganization.id,
                  organizationName: firstOrganization.name,
                  categoryName: firstOrganization.category ?? section.title,
                },
              })
            }
            style={styles.organizationCard}
          />

          {secondOrganization ? (
            <OrganizationCard
              category={secondOrganization.category}
              description={secondOrganization.description}
              logo={secondOrganization.logo}
              name={secondOrganization.name}
              onPress={() =>
                router.push({
                  pathname: '/organizations/[organizationId]',
                  params: {
                    organizationId: secondOrganization.id,
                    organizationName: secondOrganization.name,
                    categoryName: secondOrganization.category ?? section.title,
                  },
                })
              }
              style={styles.organizationCard}
            />
          ) : (
            <View style={styles.organizationCardSpacer} />
          )}
        </View>
      );
    },
    [router]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<OrganizationRow, DiscoverySection> }) => (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{section.title}</Text>
        <Text style={[styles.sectionCount, { color: palette.icon }]}>
          {section.count} organisation{section.count > 1 ? 's' : ''}
        </Text>
      </View>
    ),
    [palette.icon, palette.text]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.topArea, { backgroundColor: palette.background }]}>
        <View style={styles.topBar}>
          <Text style={[styles.brand, { color: palette.accent }]}>Cartigo</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/notifications')}
            style={styles.notificationButton}>
            <MaterialIcons name="notifications-none" size={22} color={palette.text} />
            {unreadCount > 0 ? (
              <View style={[styles.notificationBadge, { backgroundColor: palette.text }]}>
                <Text style={[styles.notificationBadgeText, { color: palette.inverseText }]}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          ref={categoryRailRef}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRail}>
          {categories.map((category) => (
            <View key={category.id} onLayout={(event) => handleCategoryLayout(category.id, event)}>
              <CategoryPill
                active={activeCategoryId === category.id}
                label={category.name}
                onPress={() => handleCategoryPress(category)}
              />
            </View>
          ))}
        </ScrollView>

        {categoriesError ? (
          <Text style={[styles.inlineFeedback, { color: palette.danger }]}>{categoriesError}</Text>
        ) : null}
      </View>

      {isInitialLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={palette.text} />
          <Text style={[styles.feedbackText, { color: palette.icon }]}>Chargement des organisations...</Text>
        </View>
      ) : (
        <SectionList
          contentContainerStyle={styles.listContent}
          keyExtractor={(item, index) => getOrganizationRowKey(item, index)}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>Aucune organisation a afficher.</Text>
              {organizationsError ? (
                <Text style={[styles.feedbackText, { color: palette.danger }]}>{organizationsError}</Text>
              ) : (
                <Text style={[styles.feedbackText, { color: palette.icon }]}>
                  Ajoute des organisations dans la base pour alimenter cette page.
                </Text>
              )}
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerState}>
                <ActivityIndicator color={palette.text} />
                <Text style={[styles.feedbackText, { color: palette.icon }]}>Chargement...</Text>
              </View>
            ) : organizationsError && organizations.length > 0 ? (
              <View style={styles.footerState}>
                <Text style={[styles.feedbackText, { color: palette.danger }]}>{organizationsError}</Text>
              </View>
            ) : (
              <View style={styles.footerSpacer} />
            )
          }
          onEndReached={loadMoreOrganizations}
          onEndReachedThreshold={0.45}
          onViewableItemsChanged={onViewableItemsChanged.current}
          ref={sectionListRef}
          renderItem={renderOrganizationRow}
          renderSectionHeader={renderSectionHeader}
          sections={sections}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          viewabilityConfig={viewabilityConfig.current}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topArea: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    fontWeight: '800',
  },
  notificationButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryRail: {
    paddingVertical: 2,
    paddingRight: 16,
  },
  inlineFeedback: {
    fontSize: 13,
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 10,
    gap: 2,
  },
  sectionTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 21,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
  },
  organizationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  organizationCard: {
    flex: 1,
  },
  organizationCardSpacer: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footerState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerSpacer: {
    height: 20,
  },
});
