import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@stockiq:dark_mode';

interface ThemeCtx {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ isDark: false, toggleTheme: () => {} });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'true') setIsDark(true);
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start(() => {
      setIsDark(prev => {
        const next = !prev;
        AsyncStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
      setTimeout(() => {
        Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }, 140);
    });
  }, [overlayOpacity]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#09090B',
          opacity: overlayOpacity,
        }}
      />
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeCtx => useContext(ThemeContext);
