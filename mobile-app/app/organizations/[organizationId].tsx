import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SectionList,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTabs } from '@/components/organization-detail/category-tabs';
import { CoverHeader } from '@/components/organization-detail/cover-header';
import { DetailSheet } from '@/components/organization-detail/detail-sheet';
import { OrganizationInfo } from '@/components/organization-detail/organization-info';
import { OrganizationProductCard } from '@/components/organization-detail/organization-product-card';
import { StickyHeader } from '@/components/organization-detail/sticky-header';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { publicService } from '@/services/public.service';
import type { PublicOrganizationDetails, PublicProduct } from '@/types/public';

const COMPACT_HEADER_TRIGGER = 156;
const SEARCH_DEBOUNCE_MS = 180;
const COMPACT_HEADER_HEIGHT = 62;
const SEARCH_OVERLAY_HEIGHT = 64;
const STICKY_TABS_HEIGHT = 62;

type ProductSection = {
  id: string;
  title: string;
  productCount: number;
  data: PublicProduct[];
};

function buildSections(organization: PublicOrganizationDetails | null, query: string) {
  if (!organization) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const orderMap = new Map(
    organization.categories.map((category, index) => [category.id, index])
  );

  const grouped = new Map<
    string,
    {
      id: string;
      title: string;
      productCount: number;
      sortOrder: number;
      data: PublicProduct[];
    }
  >();

  for (const product of organization.products) {
    const matchesCategory = product.categoryName?.toLowerCase().includes(normalizedQuery) ?? false;
    const matchesProduct =
      product.name.toLowerCase().includes(normalizedQuery) ||
      (product.description?.toLowerCase().includes(normalizedQuery) ?? false);

    if (normalizedQuery && !matchesCategory && !matchesProduct) {
      continue;
    }

    const categoryKey = product.categoryId || 'uncategorized';
    const categoryTitle = product.categoryName || 'Produits';

    if (!grouped.has(categoryKey)) {
      grouped.set(categoryKey, {
        id: categoryKey,
        title: categoryTitle,
        productCount: 0,
        sortOrder: product.categoryId ? orderMap.get(product.categoryId) ?? 9999 : 10000,
        data: [],
      });
    }

    const section = grouped.get(categoryKey);

    if (!section) {
      continue;
    }

    section.data.push(product);
    section.productCount += 1;
  }

  return Array.from(grouped.values())
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title))
    .map(({ id, title, productCount, data }) => ({
      id,
      title,
      productCount,
      data,
    }));
}

function formatOpeningHoursLine(
  entry: NonNullable<PublicOrganizationDetails['openingHours']>['schedule'][number]
) {
  if (entry.isClosed) {
    return `${entry.label} · Ferme`;
  }

  if (!entry.opensAt || !entry.closesAt) {
    return `${entry.label} · Horaires indisponibles`;
  }

  return `${entry.label} · ${entry.opensAt.slice(0, 5)} - ${entry.closesAt.slice(0, 5)}`;
}

export default function OrganizationDetailsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ organizationId: string }>();
  const organizationId = typeof params.organizationId === 'string' ? params.organizationId : '';

  const sectionListRef = useRef<SectionList<PublicProduct, ProductSection>>(null);
  const searchInputRef = useRef<TextInput>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [organization, setOrganization] = useState<PublicOrganizationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCompactHeader, setShowCompactHeader] = useState(false);
  const [showStickyTabs, setShowStickyTabs] = useState(false);
  const [tabsTriggerY, setTabsTriggerY] = useState(0);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [isScheduleVisible, setIsScheduleVisible] = useState(false);

  const sections = useMemo(
    () => buildSections(organization, debouncedSearch),
    [debouncedSearch, organization]
  );

  const tabItems = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        name: section.title,
        count: section.productCount,
      })),
    [sections]
  );

  const stickyTop = insets.top + COMPACT_HEADER_HEIGHT + (isSearchVisible ? SEARCH_OVERLAY_HEIGHT : 0);
  const stickyScrollOffset = stickyTop + STICKY_TABS_HEIGHT + 8;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    if (!organizationId) {
      setIsLoading(false);
      setError("Cette organisation est introuvable.");
      return;
    }

    let active = true;

    async function loadOrganization() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await publicService.getOrganization(organizationId);

        if (!active) {
          return;
        }

        setOrganization(response);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Impossible de charger cette organisation."
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadOrganization();

    return () => {
      active = false;
    };
  }, [organizationId]);

  useEffect(() => {
    setSelectedCategoryId((current) => {
      if (current && sections.some((section) => section.id === current)) {
        return current;
      }

      return sections[0]?.id ?? null;
    });
  }, [sections]);

  useEffect(() => {
    if (isSearchVisible) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [isSearchVisible]);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const nextShowCompactHeader = value > COMPACT_HEADER_TRIGGER;
      const nextShowStickyTabs = value > Math.max(0, tabsTriggerY - stickyTop);

      setShowCompactHeader((current) =>
        current === nextShowCompactHeader ? current : nextShowCompactHeader
      );
      setShowStickyTabs((current) => (current === nextShowStickyTabs ? current : nextShowStickyTabs));
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [scrollY, stickyTop, tabsTriggerY]);

  const compactHeaderAnimatedStyle = {
    opacity: scrollY.interpolate({
      inputRange: [COMPACT_HEADER_TRIGGER - 36, COMPACT_HEADER_TRIGGER],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [COMPACT_HEADER_TRIGGER - 36, COMPACT_HEADER_TRIGGER],
          outputRange: [-18, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  };

  const stickyTabsAnimatedStyle = {
    opacity: scrollY.interpolate({
      inputRange: [Math.max(0, tabsTriggerY - stickyTop - 28), Math.max(1, tabsTriggerY - stickyTop)],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [Math.max(0, tabsTriggerY - stickyTop - 28), Math.max(1, tabsTriggerY - stickyTop)],
          outputRange: [-8, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  };

  const searchAnimatedStyle = {
    opacity: isSearchVisible ? 1 : 0,
    transform: [{ translateY: isSearchVisible ? 0 : -10 }],
  };

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    waitForInteraction: true,
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<PublicProduct>[] }) => {
      const visibleSectionId = viewableItems.find((item) => item.isViewable)?.section?.id;

      if (visibleSectionId) {
        setSelectedCategoryId((current) => (current === visibleSectionId ? current : visibleSectionId));
      }
    }
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.setValue(event.nativeEvent.contentOffset.y);
    },
    [scrollY]
  );

  const handleToggleSearch = useCallback(() => {
    setIsSearchVisible((current) => {
      const next = !current;

      if (!next) {
        setSearchValue('');
      }

      return next;
    });
  }, []);

  const handleCategoryPress = useCallback(
    (categoryId: string) => {
      const sectionIndex = sections.findIndex((section) => section.id === categoryId);

      if (sectionIndex < 0) {
        return;
      }

      setSelectedCategoryId(categoryId);
      sectionListRef.current?.scrollToLocation({
        animated: true,
        sectionIndex,
        itemIndex: 0,
        viewOffset: stickyScrollOffset,
      });
    },
    [sections, stickyScrollOffset]
  );

  const handleShare = useCallback(async () => {
    if (!organization) {
      return;
    }

    const url = Linking.createURL(`/organizations/${organization.id}`);
    await Share.share({
      message: `${organization.name}\n${url}`,
      url,
      title: organization.name,
    });

    setIsMenuVisible(false);
  }, [organization]);

  function renderProductItem({
    item,
  }: {
    item: PublicProduct;
    section: ProductSection;
  }) {
    return (
      <OrganizationProductCard
        name={item.name}
        description={item.description}
        image={item.image}
        price={item.price}
        quantity={item.quantity}
        onPress={() =>
          router.push({
            pathname: '/products/[productId]',
            params: {
              productId: item.id,
              organizationName: organization?.name || '',
            },
          })
        }
      />
    );
  }

  function renderSectionHeader({ section }: { section: ProductSection }) {
    return (
      <View style={[styles.sectionHeader, { backgroundColor: palette.background }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{section.title}</Text>
        <Text style={[styles.sectionCount, { color: palette.icon }]}>
          {section.productCount} article{section.productCount > 1 ? 's' : ''}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={[styles.feedbackText, { color: palette.icon }]}>Chargement de l organisation...</Text>
        </View>
      ) : error || !organization ? (
        <View style={styles.centerState}>
          <Text style={[styles.errorTitle, { color: palette.text }]}>Impossible de charger cette page.</Text>
          <Text style={[styles.feedbackText, { color: palette.icon }]}>
            {error || 'Cette organisation est indisponible pour le moment.'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
            <Text style={[styles.primaryButtonText, { color: palette.onTint }]}>Retour</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderProductItem}
            renderSectionHeader={renderSectionHeader}
            onScroll={handleScroll}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
            scrollEventThrottle={16}
            stickySectionHeadersEnabled={false}
            initialNumToRender={10}
            contentContainerStyle={[styles.listContent, { backgroundColor: palette.background }]}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: palette.border }]} />
            )}
            ListHeaderComponent={
              <View style={[styles.headerContent, { backgroundColor: palette.background }]}>
                <CoverHeader
                  coverImage={organization.coverImage}
                  topInset={insets.top}
                  onBack={() => router.back()}
                  onSearch={handleToggleSearch}
                  onMenu={() => setIsMenuVisible(true)}
                />

                <OrganizationInfo
                  name={organization.name}
                  address={organization.address}
                  description={organization.description}
                  logo={organization.logo}
                  category={organization.category}
                  isOpen={organization.isOpen}
                  statusLabel={organization.statusLabel}
                  openingHoursLabel={organization.openingHoursLabel}
                  onPressSchedule={() => setIsScheduleVisible(true)}
                />

                <View
                  onLayout={(event) => setTabsTriggerY(event.nativeEvent.layout.y)}
                  style={styles.inlineTabsWrap}>
                  <CategoryTabs
                    categories={tabItems}
                    activeCategoryId={selectedCategoryId}
                    onPressCategory={handleCategoryPress}
                  />
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.errorTitle, { color: palette.text }]}>Aucun produit a afficher.</Text>
                <Text style={[styles.feedbackText, { color: palette.icon }]}>
                  Essaie une autre recherche ou reviens plus tard.
                </Text>
              </View>
            }
          />

          <Animated.View
            pointerEvents={showCompactHeader ? 'auto' : 'none'}
            style={[styles.compactHeader, compactHeaderAnimatedStyle]}>
            <StickyHeader
              title={organization.name}
              topInset={insets.top}
              onBack={() => router.back()}
              onSearch={handleToggleSearch}
            />
          </Animated.View>

          {isSearchVisible ? (
            <Animated.View
              style={[
                styles.searchOverlay,
                searchAnimatedStyle,
                {
                  top: insets.top + COMPACT_HEADER_HEIGHT + 8,
                },
              ]}>
              <View
                style={[
                  styles.searchBar,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    shadowColor: palette.text,
                  },
                ]}>
                <MaterialIcons name="search" size={20} color={palette.icon} />
                <TextInput
                  ref={searchInputRef}
                  value={searchValue}
                  onChangeText={setSearchValue}
                  placeholder="Rechercher plats, boissons, categories..."
                  placeholderTextColor={palette.icon}
                  style={[styles.searchInput, { color: palette.text }]}
                />
                <Pressable accessibilityRole="button" onPress={handleToggleSearch}>
                  <MaterialIcons name="close" size={20} color={palette.text} />
                </Pressable>
              </View>
            </Animated.View>
          ) : null}

          <Animated.View
            pointerEvents={showStickyTabs ? 'auto' : 'none'}
            style={[
              styles.stickyTabs,
              stickyTabsAnimatedStyle,
              {
                top: stickyTop,
                backgroundColor: palette.background,
              },
            ]}>
            <CategoryTabs
              compact
              categories={tabItems}
              activeCategoryId={selectedCategoryId}
              onPressCategory={handleCategoryPress}
            />
          </Animated.View>

          <DetailSheet visible={isMenuVisible} title="Plus d options" onClose={() => setIsMenuVisible(false)}>
            <Pressable
              accessibilityRole="button"
              onPress={handleShare}
              style={[styles.sheetAction, { backgroundColor: palette.surfaceSoft }]}>
              <MaterialIcons name="share" size={20} color={palette.text} />
              <Text style={[styles.sheetActionText, { color: palette.text }]}>Partager l organisation</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsMenuVisible(false);
                setIsDetailsVisible(true);
              }}
              style={[styles.sheetAction, { backgroundColor: palette.surfaceSoft }]}>
              <MaterialIcons name="info-outline" size={20} color={palette.text} />
              <Text style={[styles.sheetActionText, { color: palette.text }]}>Voir les details</Text>
            </Pressable>
          </DetailSheet>

          <DetailSheet
            visible={isDetailsVisible}
            title="A propos"
            onClose={() => setIsDetailsVisible(false)}>
            <View style={styles.detailBlock}>
              <Text style={[styles.detailLabel, { color: palette.icon }]}>Nom</Text>
              <Text style={[styles.detailValue, { color: palette.text }]}>{organization.name}</Text>
            </View>

            {organization.address ? (
              <View style={styles.detailBlock}>
                <Text style={[styles.detailLabel, { color: palette.icon }]}>Adresse</Text>
                <Text style={[styles.detailValue, { color: palette.text }]}>{organization.address}</Text>
              </View>
            ) : null}

            {organization.description ? (
              <View style={styles.detailBlock}>
                <Text style={[styles.detailLabel, { color: palette.icon }]}>Description</Text>
                <Text style={[styles.detailValue, { color: palette.text }]}>{organization.description}</Text>
              </View>
            ) : null}

            <View style={styles.detailBlock}>
              <Text style={[styles.detailLabel, { color: palette.icon }]}>Categorie</Text>
              <Text style={[styles.detailValue, { color: palette.text }]}>{organization.category}</Text>
            </View>
          </DetailSheet>

          <DetailSheet
            visible={isScheduleVisible}
            title="Horaires"
            onClose={() => setIsScheduleVisible(false)}>
            {organization.openingHours.schedule.length ? (
              organization.openingHours.schedule.map((entry) => (
                <View
                  key={entry.day}
                  style={[styles.scheduleRow, { backgroundColor: palette.surfaceSoft }]}>
                  <Text style={[styles.scheduleLabel, { color: palette.text }]}>
                    {formatOpeningHoursLine(entry)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.feedbackText, { color: palette.icon }]}>
                Les horaires ne sont pas encore disponibles pour cette organisation.
              </Text>
            )}
          </DetailSheet>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  errorTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 40,
  },
  headerContent: {
    paddingBottom: 14,
  },
  inlineTabsWrap: {
    marginTop: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    gap: 2,
  },
  sectionTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginLeft: 20,
    marginRight: 20,
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 10,
  },
  compactHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },
  searchOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
  },
  searchBar: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  stickyTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 18,
  },
  sheetAction: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailBlock: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  scheduleRow: {
    minHeight: 44,
    borderRadius: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  scheduleLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
