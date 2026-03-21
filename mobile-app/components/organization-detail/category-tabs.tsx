import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CategoryTab = {
  id: string;
  name: string;
  count?: number;
};

type CategoryTabsProps = {
  categories: CategoryTab[];
  activeCategoryId: string | null;
  onPressCategory: (categoryId: string) => void;
  compact?: boolean;
};

export function CategoryTabs({
  categories,
  activeCategoryId,
  onPressCategory,
  compact = false,
}: CategoryTabsProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const scrollRef = useRef<ScrollView>(null);
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});

  const railPadding = compact ? 20 : 24;

  useEffect(() => {
    if (!activeCategoryId) {
      return;
    }

    const layout = layouts[activeCategoryId];

    if (!layout) {
      return;
    }

    scrollRef.current?.scrollTo({
      x: Math.max(0, layout.x - railPadding),
      y: 0,
      animated: true,
    });
  }, [activeCategoryId, layouts, railPadding]);

  const resolvedCategories = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        label:
          typeof category.count === 'number'
            ? `${category.name} (${category.count})`
            : category.name,
      })),
    [categories]
  );

  function handleLayout(categoryId: string, event: LayoutChangeEvent) {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((current) => ({ ...current, [categoryId]: { x, width } }));
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.background },
        compact && styles.compactContainer,
        compact && { borderBottomColor: palette.border },
      ]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          compact ? styles.compactContent : styles.defaultContent,
        ]}>
        {resolvedCategories.map((category) => {
          const isActive = category.id === activeCategoryId;

          return (
            <View key={category.id} onLayout={(event) => handleLayout(category.id, event)}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onPressCategory(category.id)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isActive ? palette.text : palette.surfaceSoft,
                    borderColor: isActive ? palette.text : palette.border,
                  },
                  compact ? styles.compactPill : styles.defaultPill,
                ]}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.pillText,
                    {
                      color: isActive ? palette.inverseText : palette.text,
                    },
                  ]}>
                  {category.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  compactContainer: {
    borderBottomWidth: 1,
  },
  content: {
    alignItems: 'center',
    gap: 10,
  },
  defaultContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  compactContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    justifyContent: 'center',
  },
  defaultPill: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  compactPill: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
  },
});
