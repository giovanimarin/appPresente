/// <reference types="react-native-css-interop/types" />

import 'react-native';

declare module 'react-native' {
  interface ViewProps { className?: string; }
  interface TextProps { className?: string; }
  interface TextInputProps { className?: string; }
  interface ImageProps { className?: string; }
  interface ScrollViewProps { className?: string; contentContainerClassName?: string; }
  interface TouchableOpacityProps { className?: string; }
  interface PressableProps { className?: string; }
  interface FlatListProps<T> { className?: string; contentContainerClassName?: string; }
}

declare module 'react-native-safe-area-context' {
  interface SafeAreaViewProps { className?: string; }
}
