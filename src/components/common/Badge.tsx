import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clasificacion, CLSF } from '../../constants/data';

interface BadgeProps {
  label: string;
  color: string;
  bg: string;
  accessibilityLabel?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, color, bg, accessibilityLabel }) => (
  <View
    style={[s.badge, { backgroundColor: bg }]}
    accessible={true}
    accessibilityRole="text"
    accessibilityLabel={accessibilityLabel ?? label}
  >
    <Text style={[s.txt, { color }]}>{label}</Text>
  </View>
);

interface RolBadgeProps {
  rol: string;
}

export const RolBadge: React.FC<RolBadgeProps> = ({ rol }) => {
  const cfg =
    rol === 'SUPERADMIN' ? { label: 'Super Admin',   color: '#6D28D9', bg: '#EDE9FE' } :
    rol === 'ADMIN'      ? { label: 'Admin Tienda',   color: '#0369A1', bg: '#E0F2FE' } :
    rol === 'CONTADOR'   ? { label: 'Contador',       color: '#374151', bg: '#F3F4F6' } :
                           { label: rol,              color: '#374151', bg: '#F3F4F6' };
  return <Badge {...cfg} />;
};

interface ClasifBadgeProps {
  clasificacion: Clasificacion;
}

export const ClasifBadge: React.FC<ClasifBadgeProps> = ({ clasificacion }) => {
  const cfg = CLSF[clasificacion];
  return (
    <Badge
      label={cfg.label}
      color={cfg.color}
      bg={cfg.bg}
      accessibilityLabel={`Clasificación: ${cfg.label}`}
    />
  );
};

const s = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  txt:   { fontSize: 11, fontWeight: '700' },
});
