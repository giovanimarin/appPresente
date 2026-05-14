import { View, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Tabs } from 'expo-router';
import {
  MessageSquare, Calendar, Users, Home, BookOpen,
  GraduationCap, Clock, User, Menu,
} from 'lucide-react-native';
import AppSidebar from '@/components/AppSidebar';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';

const STATUS_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const STAFF_ITEMS = [
  { href: '/home',           icon: Home,          label: 'Início' },
  { href: '/communications', icon: MessageSquare, label: 'Comunicados' },
  { href: '/classes',        icon: BookOpen,      label: 'Turmas' },
  { href: '/students',       icon: GraduationCap, label: 'Alunos' },
  { href: '/guardians',      icon: Users,         label: 'Responsáveis' },
  { href: '/agenda',         icon: Calendar,      label: 'Agenda' },
  { href: '/appointments',   icon: Clock,         label: 'Horários' },
  { href: '/profile',        icon: User,          label: 'Perfil' },
];

function StaffTabs() {
  const { open, openSidebar, closeSidebar } = useSidebar();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="communications" />
        <Tabs.Screen name="classes" />
        <Tabs.Screen name="students" />
        <Tabs.Screen name="guardians" />
        <Tabs.Screen name="agenda" />
        <Tabs.Screen name="appointments" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="communications-new" options={{ href: null }} />
        <Tabs.Screen name="classes/[id]" options={{ href: null }} />
      </Tabs>

      {/* Botão hamburguer flutuante no topo */}
      {!open && (
        <TouchableOpacity
          onPress={openSidebar}
          hitSlop={8}
          style={{
            position: 'absolute',
            top: STATUS_TOP + 8,
            left: 16,
            zIndex: 100,
            width: 36,
            height: 36,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <Menu size={20} color="#374151" />
        </TouchableOpacity>
      )}

      <AppSidebar isOpen={open} onClose={closeSidebar} items={STAFF_ITEMS} />
    </View>
  );
}

export default function StaffLayout() {
  return (
    <SidebarProvider>
      <StaffTabs />
    </SidebarProvider>
  );
}
