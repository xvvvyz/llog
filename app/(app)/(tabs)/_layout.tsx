import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="(subjects)" options={{ title: 'Subjects' }} />
      <Tabs.Screen name="(profile)/profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
