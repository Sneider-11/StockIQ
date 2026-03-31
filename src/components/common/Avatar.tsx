import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { initials } from '../../utils/helpers';

interface Props {
  nombre: string;
  size?: number;
  bg?: string;
  fotoUri?: string;
}

export const Avatar: React.FC<Props> = ({ nombre, size = 42, bg = '#7C3AED', fotoUri }) => (
  <View
    style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}
    accessibilityElementsHidden={true}
    importantForAccessibility="no-hide-descendants"
  >
    {fotoUri ? (
      <Image
        source={{ uri: fotoUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    ) : (
      <Text style={[s.txt, { fontSize: size * 0.32 }]}>{initials(nombre)}</Text>
    )}
  </View>
);

const s = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  txt:    { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
});
