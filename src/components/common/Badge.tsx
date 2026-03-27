import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clasificacion, CLSF } from '../../constants/data';

interface BadgeProps {
  label: string;
  color: string;
  bg: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, color, bg }) => (
  <View style={[s.badge, { backgroundColor: bg }]}>
    <Text style={[s.txt, { color }]}>{label}</Text>
  </View>
);

interface RolBadgeProps {
  rol: string;
}

export const RolBadge: React.FC<RolBadgeProps> = ({ rol }) => {
  const cfg = rol === 'SUPERADMIN'
    ? { label: 'Super Admin', color: '#6D28D9', bg: '#EDE9FE' }
    : { label: 'Auditor',     color: '#374151', bg: '#F3F4F6' };
  return <Badge {...cfg} />;
};

interface ClasifBadgeProps {
  clasificacion: Clasificacion;
}

export const ClasifBadge: React.FC<ClasifBadgeProps> = ({ clasificacion }) => {
  const cfg = CLSF[clasificacion];
  return <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />;
};

const s = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  txt:   { fontSize: 11, fontWeight: '700' },
});
