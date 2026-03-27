import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
}

export const SecHeader: React.FC<Props> = ({ title }) => (
  <View style={s.wrap}>
    <Text style={s.title}>{title}</Text>
    <View style={s.line} />
  </View>
);

const s = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  title: { fontSize: 11, fontWeight: '800', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1.2, marginRight: 10 },
  line:  { flex: 1, height: 1, backgroundColor: '#E4E4E7' },
});
