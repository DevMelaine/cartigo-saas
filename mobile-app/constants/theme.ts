import { Platform } from 'react-native';

const ink = '#111111';
const muted = '#6B7280';
const border = '#ECECEC';
const soft = '#F7F7F7';
const softStrong = '#F3F4F3';
const brandGreen = '#06C167';
const brandGreenDeep = '#05944E';
const midnight = '#101214';

export const Colors = {
  light: {
    text: ink,
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceMuted: soft,
    surfaceSoft: softStrong,
    tint: brandGreen,
    accent: brandGreen,
    accentStrong: brandGreenDeep,
    icon: muted,
    border,
    success: brandGreen,
    successSurface: '#EAF9F0',
    danger: '#D92D20',
    dangerSurface: '#FDEEEE',
    onTint: '#FFFFFF',
    inverseText: '#FFFFFF',
    tabIconDefault: '#A1A1AA',
    tabIconSelected: ink,
    tabBarBackground: '#FFFFFF',
    heroStart: '#FFFFFF',
    heroEnd: soft,
    floatingSurface: 'rgba(255,255,255,0.94)',
    backdrop: 'rgba(17,17,17,0.24)',
    overlay: 'rgba(17,17,17,0.08)',
    overlayStrong: 'rgba(17,17,17,0.56)',
    placeholderGlow: 'rgba(255,255,255,0.55)',
    shadow: 'rgba(17,17,17,0.08)',
  },
  dark: {
    text: '#F8FAFC',
    background: midnight,
    surface: '#17191B',
    surfaceMuted: '#1F2225',
    surfaceSoft: '#25292D',
    tint: brandGreen,
    accent: brandGreen,
    accentStrong: '#19D178',
    icon: '#94A3B8',
    border: '#2C3136',
    success: '#19D178',
    successSurface: '#11271B',
    danger: '#F97066',
    dangerSurface: '#341818',
    onTint: '#FFFFFF',
    inverseText: '#FFFFFF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#FFFFFF',
    tabBarBackground: '#101214',
    heroStart: '#17191B',
    heroEnd: '#1F2225',
    floatingSurface: 'rgba(23,25,27,0.94)',
    backdrop: 'rgba(0,0,0,0.42)',
    overlay: 'rgba(0,0,0,0.18)',
    overlayStrong: 'rgba(0,0,0,0.58)',
    placeholderGlow: 'rgba(255,255,255,0.08)',
    shadow: 'rgba(0,0,0,0.16)',
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
