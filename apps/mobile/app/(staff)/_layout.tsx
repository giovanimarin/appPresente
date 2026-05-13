import { Tabs } from 'expo-router';
import { MessageSquare, Calendar, Users, Home, BookOpen, GraduationCap, Clock } from 'lucide-react-native';

export default function StaffLayout() {
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
      <Tabs.Screen name="classes" options={{ title: 'Turmas', tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} /> }} />
      <Tabs.Screen name="students" options={{ title: 'Alunos', tabBarIcon: ({ color, size }) => <GraduationCap size={size} color={color} /> }} />
      <Tabs.Screen name="guardians" options={{ title: 'Responsáveis', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} /> }} />
      <Tabs.Screen name="appointments" options={{ title: 'Horários', tabBarIcon: ({ color, size }) => <Clock size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      {/* Rotas sem tab */}
      <Tabs.Screen name="communications-new" options={{ href: null }} />
      <Tabs.Screen name="classes/[id]" options={{ href: null }} />
    </Tabs>
  );
}
