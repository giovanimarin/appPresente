import { Tabs } from 'expo-router';
import { MessageSquare, Calendar, User, Home, FileText, Clock } from 'lucide-react-native';

export default function GuardianLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#e5e7eb', backgroundColor: '#fff' },
        tabBarLabelStyle: { fontSize: 10, marginBottom: 2 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Início', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tabs.Screen name="communications" options={{ title: 'Comunicados', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} /> }} />
      <Tabs.Screen name="forms" options={{ title: 'Formulários', tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }} />
      <Tabs.Screen name="appointments" options={{ title: 'Horários', tabBarIcon: ({ color, size }) => <Clock size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }} />
    </Tabs>
  );
}
