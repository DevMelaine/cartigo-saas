import { Platform } from 'react-native';

const charcoal = '#111111';
const slate = '#6B7280';
const line = '#E5E7EB';
const mist = '#F6F7F9';
const emerald = '#18A957';
const emeraldDeep = '#128246';
const midnight = '#0F172A';

export const Colors = {
  light: {
    text: charcoal,
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceMuted: mist,
    tint: charcoal,
    accent: emerald,
    accentStrong: emeraldDeep,
    icon: slate,
    border: line,
    success: emeraldDeep,
    danger: '#D92D20',
    tabIconDefault: '#98A2B3',
    tabIconSelected: charcoal,
    tabBarBackground: '#FFFFFF',
    heroStart: '#FFFFFF',
    heroEnd: mist,
  },
  dark: {
    text: '#F8FAFC',
    background: midnight,
    surface: '#172033',
    surfaceMuted: '#22314A',
    tint: emerald,
    accent: emerald,
    accentStrong: '#FF8B3D',
    icon: '#94A3B8',
    border: '#31425F',
    success: '#36C06B',
    danger: '#F97066',
    tabIconDefault: '#64748B',
    tabIconSelected: emerald,
    tabBarBackground: '#111827',
    heroStart: '#1A2236',
    heroEnd: '#22314A',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "'Avenir Next', 'Segoe UI', Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'Avenir Next Rounded', 'Segoe UI', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});
