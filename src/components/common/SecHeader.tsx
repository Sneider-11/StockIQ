import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  title: string;
}

export const SecHeader: React.FC<Props> = ({ title }) => {
  const tc = useThemeColors();
  return (
    <View style={s.wrap}>
      <Text style={[s.title, { color: tc.muted }]} accessibilityRole="header">{title}</Text>
      <View style={[s.line, { backgroundColor: tc.border }]} accessibilityElementsHidden={true} />
    </View>
  );
};

const s = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  title: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginRight: 10 },
  line:  { flex: 1, height: 1 },
});
