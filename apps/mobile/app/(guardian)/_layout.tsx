import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { MessageSquare, Calendar, User, Home, FileText, Clock, Menu } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import AppSidebar from '@/components/AppSidebar';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';
import { registerPushToken } from '@/lib/notifications';

const STATUS_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const HEADER_HEIGHT = STATUS_TOP + 52;

const GUARDIAN_ITEMS = [
  { href: '/home',           icon: Home,          label: 'Início' },
  { href: '/communications', icon: MessageSquare, label: 'Comunicados' },
  { href: '/agenda',         icon: Calendar,      label: 'Agenda' },
  { href: '/forms',          icon: FileText,       label: 'Formulários' },
  { href: '/appointments',   icon: Clock,         label: 'Horários' },
  { href: '/profile',        icon: User,          label: 'Perfil' },
];

function GuardianTabs() {
  const { open, openSidebar, closeSidebar } = useSidebar();
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Registra push token assim que o responsável está logado
    registerPushToken();

    // Notificação recebida com app aberto: só mostra (handler global cuida disso)
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] Recebida:', notification.request.content.title);
    });

    // Usuário tocou na notificação: navega para o comunicado
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data?.type === 'COMMUNICATION' && data?.communicationId) {
        router.push(`/communications/${data.communicationId}` as never);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {/* Barra de header fixa */}
      <View
        style={{
          height: HEADER_HEIGHT,
          paddingTop: STATUS_TOP,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={openSidebar}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
          }}
        >
          <Menu size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Presente</Text>
      </View>

      {/* Conteúdo das telas */}
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
      </View>

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
