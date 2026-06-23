// FILE: app/_layout.js
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../src/context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" backgroundColor="#085041" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f4f6f9' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="classes" />
        <Stack.Screen name="students" />
        <Stack.Screen name="attendance" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="backup" />
        <Stack.Screen name="settings" />
      </Stack>
    </AppProvider>
  );
}
