import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useColorScheme } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  type ColorPalette,
  darkPalette,
  elevation,
  lightPalette,
  motion,
  radii,
  spacing,
  typography,
} from "@/constants/tokens";

export type ThemeMode =
  | "light"
  | "dark"
  | "dynamic";

/**
 * Theme contract consumed by every screen and component.
 */
export interface Theme {
  mode: ThemeMode;

  colors: ColorPalette;

  spacing: typeof spacing;

  radii: typeof radii;

  typography: typeof typography;

  motion: typeof motion;

  elevation: typeof elevation;

  statusBarStyle: "light" | "dark";

  setThemeMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "app-theme-mode";

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();

  const [mode, setMode] =
    useState<ThemeMode>("dynamic");

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme =
          await AsyncStorage.getItem(STORAGE_KEY);

        if (
          storedTheme === "light" ||
          storedTheme === "dark" ||
          storedTheme === "dynamic"
        ) {
          setMode(storedTheme);
        }
      } catch (err) {
        console.log(err);
      }
    };

    loadTheme();
  }, []);

  const resolvedMode =
    mode === "dynamic"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : mode;

  const setThemeMode = async (
    nextMode: ThemeMode,
  ) => {
    setMode(nextMode);

    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        nextMode,
      );
    } catch (err) {
      console.log(err);
    }
  };

  const value = useMemo<Theme>(
    () => ({
      mode,

      colors:
        resolvedMode === "dark"
          ? darkPalette
          : lightPalette,

      spacing,

      radii,

      typography,

      motion,

      elevation,

      statusBarStyle:
        resolvedMode === "dark"
          ? "light"
          : "dark",

      setThemeMode,
    }),
    [mode, resolvedMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider",
    );
  }

  return context;
}