import { Platform } from 'react-native';

export const AUTH_COLORS = {
  background: '#FFFFFF',
  primary: '#000000',
  surface: '#F6F6F6',
  text: '#111111',
  muted: '#6B6B6B',
  border: '#E8E8E8',
  overlayTop: 'rgba(0, 0, 0, 0.10)',
  overlayBottom: 'rgba(0, 0, 0, 0.78)',
  danger: '#B42318',
};

export const AUTH_SPACING = {
  screen: 20,
  gap: 16,
};

export const AUTH_RADIUS = {
  panel: 24,
  control: 12,
};

export const AUTH_SHADOW = Platform.select({
  web: {
    boxShadow: '0px -10px 30px rgba(17, 17, 17, 0.08)',
  },
  default: {
    shadowColor: '#111111',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 18,
    elevation: 6,
  },
});
