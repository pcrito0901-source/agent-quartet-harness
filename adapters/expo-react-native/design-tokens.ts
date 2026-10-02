/**
 * Design Tokens — React Native / Expo 用の正本
 *
 * React Native には CSS 変数が存在しない。`design-tokens.css` の `var(--color-primary)` は
 * Expo Web では効いてしまうが**ネイティブでは一切効かない**ため、Web で正しく見えるのに
 * 実機で崩れるという最悪の壊れ方をする。RN/Expo プロジェクトでは必ずこちらを使うこと。
 *
 * 使い方:
 *   import { colors, spacing, typography, radius } from "@/docs/design-tokens";
 *   const styles = StyleSheet.create({
 *     button: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
 *   });
 *
 * NativeWind を使う場合は tailwind.config.js の theme.extend にこの値を流し込む。
 *
 * プロジェクトに合わせて値を差し替えてください。**キー名は変えないこと**
 * （エージェントのプロンプトがキー名を前提にしている）。
 */

export const colors = {
  primary: "#111111",
  primaryHover: "#2a2a2a",
  accent: "#0066ff",
  accentHover: "#0052cc",

  bg: "#ffffff",
  bgSecondary: "#f5f5f5",
  bgElevated: "#ffffff",
  border: "#e0e0e0",
  borderStrong: "#c4c4c4",

  text: "#111111",
  textSecondary: "#666666",
  textMuted: "#8a8a8a",
  textOnPrimary: "#ffffff",

  success: "#16a34a",
  error: "#dc2626",
  warning: "#d97706",
  info: "#0284c7",

  focusRing: "#0066ff",
} as const;

export const colorsDark = {
  ...colors,
  primary: "#f5f5f5",
  primaryHover: "#e0e0e0",
  accent: "#4d94ff",
  accentHover: "#6ba6ff",

  bg: "#0d0d0d",
  bgSecondary: "#1a1a1a",
  bgElevated: "#1f1f1f",
  border: "#2e2e2e",
  borderStrong: "#454545",

  text: "#f5f5f5",
  textSecondary: "#a3a3a3",
  textMuted: "#737373",
  textOnPrimary: "#0d0d0d",

  success: "#4ade80",
  error: "#f87171",
  warning: "#fbbf24",
  info: "#38bdf8",
} as const;

/** 4pt スケール。RN の数値は dp（density-independent pixels） */
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
  24: 96,
} as const;

export const typography = {
  fontFamily: {
    // Expo では expo-font で読み込んだ実際のフォント名を指定する。
    // 未読み込みのフォント名を書くとネイティブでは黙って既定フォントになる。
    sans: "Inter",
    mono: "JetBrainsMono",
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  weight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  /** RN の lineHeight は倍率ではなく絶対値(dp)。size に掛けて使う */
  leading: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

/**
 * RN の影は iOS と Android で別物。両方を指定すること。
 * iOS: shadowColor/shadowOffset/shadowOpacity/shadowRadius
 * Android: elevation
 */
export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
} as const;

export const duration = {
  fast: 120,
  normal: 200,
} as const;

/** 端末幅の目安。RN では useWindowDimensions() の値と比較して使う */
export const breakpoints = {
  phone: 375,
  tablet: 768,
  desktop: 1280,
} as const;
