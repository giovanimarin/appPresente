import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, Pressable,
  ScrollView, Platform, StatusBar,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { X } from 'lucide-react-native';

const SIDEBAR_WIDTH = 270;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

export type SidebarItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items: SidebarItem[];
  userName?: string;
  userRole?: string;
};

export default function AppSidebar({ isOpen, onClose, items, userName, userRole }: Props) {
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  function navigate(href: string) {
    onClose();
    router.navigate(href as never);
  }

  function isActive(href: string) {
    const segment = href.split('/').filter(Boolean).pop() ?? '';
    return pathname.endsWith('/' + segment) || pathname === href;
  }

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          {
            position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 200,
          },
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sidebar panel */}
      <Animated.View
        style={[
          {
            position: 'absolute', top: 0, bottom: 0, left: 0,
            width: SIDEBAR_WIDTH,
            backgroundColor: '#fff',
            zIndex: 201,
            shadowColor: '#000',
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 16,
          },
          { transform: [{ translateX }] },
        ]}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: STATUS_BAR_HEIGHT + 16,
            paddingBottom: 16,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Presente</Text>
            {userName ? (
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }} numberOfLines={1}>
                {userName}
              </Text>
            ) : null}
            {userRole ? (
              <Text style={{ fontSize: 11, color: '#2563eb', marginTop: 1 }}>{userRole}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <X size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Nav items */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
            {items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.href}
                  onPress={() => navigate(item.href)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    borderRadius: 10,
                    marginBottom: 2,
                    backgroundColor: active ? '#eff6ff' : 'transparent',
                  }}
                >
                  <Icon size={20} color={active ? '#2563eb' : '#6b7280'} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: active ? '600' : '400',
                      color: active ? '#2563eb' : '#374151',
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}
