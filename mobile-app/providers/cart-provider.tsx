import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { CartToast } from '@/components/cart/cart-toast';
import { useCustomerSession } from '@/providers/customer-session-provider';
import { cartService } from '@/services/cart.service';
import type { Cart } from '@/types/cart';

type CartNotice = {
  type: 'success' | 'error';
  text: string;
} | null;

type CartContextValue = {
  cart: Cart;
  cartCount: number;
  isCartLoading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
};

const EMPTY_CART: Cart = {
  items: [],
  total: 0,
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { accessToken, isAuthenticated } = useCustomerSession();
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [notice, setNotice] = useState<CartNotice>(null);

  const showNotice = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
  }, []);

  const refreshCart = useCallback(async () => {
    if (!accessToken || !isAuthenticated) {
      setCart(EMPTY_CART);
      return;
    }

    try {
      setIsCartLoading(true);
      const response = await cartService.getCart({ accessToken });
      setCart(response.data);
    } catch (fetchError) {
      const text = fetchError instanceof Error ? fetchError.message : 'Unable to refresh cart.';
      showNotice('error', text);
      throw fetchError;
    } finally {
      setIsCartLoading(false);
    }
  }, [accessToken, isAuthenticated, showNotice]);

  const addToCart = useCallback(
    async (productId: string, quantity: number) => {
      if (!accessToken || !isAuthenticated) {
        showNotice('error', 'Sign in first to add products to your cart.');
        return;
      }

      await cartService.addItem({ accessToken, productId, quantity });
      await refreshCart();
      showNotice('success', 'Product added to cart.');
    },
    [accessToken, isAuthenticated, refreshCart, showNotice]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!accessToken || !isAuthenticated) {
        return;
      }

      await cartService.removeItem({ accessToken, itemId });
      await refreshCart();
      showNotice('success', 'Item removed from cart.');
    },
    [accessToken, isAuthenticated, refreshCart, showNotice]
  );

  useEffect(() => {
    if (!accessToken || !isAuthenticated) {
      setCart(EMPTY_CART);
      return;
    }

    refreshCart();
  }, [accessToken, isAuthenticated, refreshCart]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => clearTimeout(timeout);
  }, [notice]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      cartCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      isCartLoading,
      refreshCart,
      addToCart,
      removeItem,
    }),
    [addToCart, cart, isCartLoading, refreshCart, removeItem]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {notice ? (
        <View pointerEvents="none" style={[styles.toastLayer, { top: insets.top + 12 }]}>
          <CartToast text={notice.text} type={notice.type} />
        </View>
      ) : null}
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);

  if (!value) {
    throw new Error('useCart must be used within a CartProvider.');
  }

  return value;
}

const styles = StyleSheet.create({
  toastLayer: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
});
