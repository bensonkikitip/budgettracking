import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#007aff',
        headerTitleStyle: { color: '#1c1c1e', fontWeight: '600' },
      }}
    />
  );
}
