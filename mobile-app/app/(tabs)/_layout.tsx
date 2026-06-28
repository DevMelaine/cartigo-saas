import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCart } from '@/providers/cart-provider';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { cartCount } = useCart();

  function renderTabIcon(name: React.ComponentProps<typeof MaterialIcons>['name'], color: string) {
    return (
      <View
        style={[
          styles.iconShell,
          {
            borderColor: palette.surfaceSoft,
            backgroundColor: palette.surfaceSoft,
          },
        ]}>
        <MaterialIcons size={22} name={name} color={color} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tabIconSelected,
        tabBarInactiveTintColor: palette.tabIconDefault,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: palette.tabBarBackground,
          borderTopColor: palette.border,
          height: 78,
          paddingBottom: 8,
          paddingTop: 10,
        },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarBadgeStyle: {
          backgroundColor: palette.text,
          color: palette.inverseText,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Decouvrir',
          tabBarIcon: ({ color }) => renderTabIcon('storefront', color),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Panier',
          tabBarIcon: ({ color }) => renderTabIcon('shopping-cart', color),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Compte',
          tabBarIcon: ({ color }) => renderTabIcon('person', color),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
