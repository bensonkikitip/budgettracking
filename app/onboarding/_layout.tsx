/**
 * Onboarding stack — wraps the first-time user flow:
 *   /onboarding/intro → /onboarding/categories → (exits to /account/new)
 *   /onboarding/foundational-rules → /onboarding/done (per-account)
 *
 * `gestureEnabled: false` prevents the user from swiping back mid-flow,
 * which would leave the DB in a partial state (e.g. categories saved
 * but never importing an account).
 */

import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown:    false,
        gestureEnabled: false,
      }}
    />
  );
}
