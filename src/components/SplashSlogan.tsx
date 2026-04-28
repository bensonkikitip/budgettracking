/**
 * SplashSlogan — brief branded overlay shown on every app launch.
 *
 * Displays the v4.0 slogan and Rachey in a meditating pose.
 * Visible for 800ms, then fades out over 400ms.
 * Never blocks user input — it sits on top but the underlying navigator
 * is fully interactive immediately; the overlay is purely cosmetic.
 *
 * Usage: mount in _layout.tsx, pass onDone to unmount after fade.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Sloth } from './Sloth';
import { colors, font, spacing } from '../theme';

interface Props {
  onDone: () => void;
}

export function SplashSlogan({ onDone }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const showTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue:         0,
        duration:        400,
        useNativeDriver: true,
      }).start(() => onDone());
    }, 800);

    return () => clearTimeout(showTimer);
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={styles.card}>
        <Sloth sloth="meditating" size={100} />
        <Text style={styles.line1}>Take it Slow,</Text>
        <Text style={styles.line2}>Do it Steady,</Text>
        <Text style={styles.line3}>Become Ready...zZ</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          999,
  },
  card: {
    alignItems: 'center',
    gap:        spacing.sm,
  },
  line1: {
    fontFamily: font.extraBold,
    fontSize:   26,
    color:      colors.text,
    marginTop:  spacing.lg,
  },
  line2: {
    fontFamily: font.extraBold,
    fontSize:   26,
    color:      colors.text,
  },
  line3: {
    fontFamily: font.bold,
    fontSize:   22,
    color:      colors.primary,
  },
});
