import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tienda, Usuario, Registro, CLSF } from '../constants/data';
import { fCOP } from '../utils/helpers';
import { Badge, Avatar } from '../components/common';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';

interface Props {
  usuario: Usuario;
  tienda: Tienda;
  registros: Registro[];
  esAdmin: boolean;
  onVolver: () => void;
}

export const MisRegistrosScreen: React.FC<Props> = ({ usuario, tienda, registros, esAdmin, onVolver }) => {
  const [filtro, setFiltro] = useState('TODOS');
  const base      = registros.filter(r => r.tiendaId === tienda.id);
  const mis       = esAdmin ? base : base.filter(r => r.usuarioNombre === usuario.nombre);
  const filtrados = filtro === 'TODOS' ? mis : mis.filter(r => r.clasificacion === filtro);
  const totalCosto = mis.reduce((a, r) => a + r.costoUnitario * r.cantidad, 0);
  const FILTROS = ['TODOS', 'SIN_DIF', 'FALTANTE', 'SOBRANTE', 'CERO'];

  return (
    <View style={{ flex: 1, backgroundColor: LGR }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onVolver} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={BLK} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{esAdmin ? 'Todos los registros' : 'Mis registros'}</Text>
          <Text style={s.sub}>{mis.length} artículos · {fCOP(totalCosto)}</Text>
        </View>
      </View>

      {/* Filtros horizontales */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterBar}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
      >
        {FILTROS.map(f => {
          const isAll = f === 'TODOS';
          const cfg   = isAll ? { label: 'Todos', dot: '#A1A1AA' } : CLSF[f as keyof typeof CLSF];
          const cnt   = isAll ? mis.length : mis.filter(r => r.clasificacion === f).length;
          const act   = filtro === f;
          return (
            <TouchableOpacity
              key={f}
              style={[s.chip, act && { backgroundColor: PRP, borderColor: PRP }]}
              onPress={() => setFiltro(f)}
            >
              {!isAll && <View style={[s.chipDot, { backgroundColor: act ? 'rgba(255,255,255,0.7)' : cfg.dot }]} />}
              <Text style={[s.chipTxt, act && { color: '#fff', fontWeight: '700' }]}>
                {cfg.label} {cnt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista de registros */}
      <FlatList
        data={filtrados}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 48 }}>
            <View style={s.emptyIcon}>
              <Ionicons name="cube-outline" size={32} color="#A1A1AA" />
            </View>
            <Text style={s.emptyTxt}>Sin artículos con este filtro</Text>
          </View>
        }
        renderItem={({ item: r }) => {
          const cfg   = CLSF[r.clasificacion];
          const delta = r.cantidad - r.stockSistema;
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.codeTag}><Text style={s.codeTxt}>{r.itemId}</Text></View>
                <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />
              </View>
              <Text style={s.descTxt}>{r.descripcion}</Text>
              <Text style={s.ubicTxt}>{r.ubicacion}</Text>
              <View style={s.qtyRow}>
                {[
                  { l: 'Sistema',    v: r.stockSistema,                                             c: MTD },
                  { l: 'Contado',    v: r.cantidad,                                                 c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                  { l: 'Diferencia', v: (delta > 0 ? '+' : '') + delta,                            c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                  { l: 'Impacto',    v: delta !== 0 ? fCOP(Math.abs(r.costoUnitario * delta)) : '-', c: MTD },
                ].map(q => (
                  <View key={q.l} style={s.qtyBox}>
                    <Text style={s.qtyLbl}>{q.l}</Text>
                    <Text style={[s.qtyVal, { color: q.c }]}>{q.v}</Text>
                  </View>
                ))}
              </View>
              {r.nota ? (
                <View style={s.notaRow}>
                  <Ionicons name="chatbubble-outline" size={12} color={MTD} style={{ marginRight: 5 }} />
                  <Text style={s.notaTxt}>{r.nota}</Text>
                </View>
              ) : null}
              {r.fotoUri ? (
                <View style={s.notaRow}>
                  <Ionicons name="camera-outline" size={12} color="#15803D" style={{ marginRight: 5 }} />
                  <Text style={[s.notaTxt, { color: '#15803D' }]}>Foto adjunta</Text>
                </View>
              ) : null}
              <View style={s.metaRow}>
                {esAdmin && (
                  <>
                    <Avatar nombre={r.usuarioNombre} size={18} bg="#27272A" />
                    <Text style={s.metaTxt}> {r.usuarioNombre} · </Text>
                  </>
                )}
                <Ionicons name="time-outline" size={11} color={BRD} />
                <Text style={s.metaTxt}> {r.escaneadoEn}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const s = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 54, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  backBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title:     { fontSize: 18, fontWeight: '800', color: BLK },
  sub:       { fontSize: 12, color: MTD, marginTop: 2 },

  filterBar: { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  chip:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: LGR, borderWidth: 1, borderColor: BRD, gap: 6 },
  chipDot:   { width: 7, height: 7, borderRadius: 4 },
  chipTxt:   { fontSize: 12, color: MTD, fontWeight: '500' },

  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', borderWidth: 1, borderColor: BRD, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTxt:  { fontSize: 13, color: '#A1A1AA' },

  card:      { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  codeTag:   { backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  codeTxt:   { fontSize: 11, fontWeight: '800', color: PRP },
  descTxt:   { fontSize: 14, fontWeight: '700', color: BLK, marginBottom: 2 },
  ubicTxt:   { fontSize: 11, fontWeight: '600', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },

  qtyRow:    { flexDirection: 'row', backgroundColor: LGR, borderRadius: 10, padding: 10, marginBottom: 8 },
  qtyBox:    { flex: 1, alignItems: 'center' },
  qtyLbl:    { fontSize: 9, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  qtyVal:    { fontSize: 14, fontWeight: '800', color: BLK },

  notaRow:   { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 8, padding: 9, marginBottom: 6 },
  notaTxt:   { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 17 },

  metaRow:   { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: LGR, gap: 4 },
  metaTxt:   { fontSize: 11, color: BRD },
});
