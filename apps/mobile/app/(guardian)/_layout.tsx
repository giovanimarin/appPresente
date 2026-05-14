import { View, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Tabs } from 'expo-router';
import { MessageSquare, Calendar, User, Home, FileText, Clock, Menu } from 'lucide-react-native';
import AppSidebar from '@/components/AppSidebar';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';

const STATUS_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const GUARDIAN_ITEMS = [
  { href: '/home',           icon: Home,          label: 'Início' },
  { href: '/communications', icon: MessageSquare, label: 'Comunicados' },
  { href: '/agenda',         icon: Calendar,      label: 'Agenda' },
  { href: '/forms',          icon: FileText,      label: 'Formulários' },
  { href: '/appointments',   icon: Clock,         label: 'Horários' },
  { href: '/profile',        icon: User,          label: 'Perfil' },
];

function GuardianTabs() {
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
        <Tabs.Screen name="agenda" />
        <Tabs.Screen name="forms" />
        <Tabs.Screen name="appointments" />
        <Tabs.Screen name="profile" />
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

      <AppSidebar isOpen={open} onClose={closeSidebar} items={GUARDIAN_ITEMS} />
    </View>
  );
}

export default function GuardianLayout() {
  return (
    <SidebarProvider>
      <GuardianTabs />
    </SidebarProvider>
  );
}
