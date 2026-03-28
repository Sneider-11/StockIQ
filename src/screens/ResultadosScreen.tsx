import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tienda, Registro, Articulo, CATALOGO_BASE } from '../constants/data';
import { fCOP } from '../utils/helpers';
import { Avatar } from '../components/common';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';

interface Props {
  registros: Registro[];
  tienda: Tienda;
  catalogo: Articulo[];
  onBack: () => void;
}

export const ResultadosScreen: React.FC<Props> = ({ registros, tienda, catalogo, onBack }) => {
  const [tab, setTab] = useState('resultados');
  const CAT      = catalogo.length > 0 ? catalogo : CATALOGO_BASE;
  const regT     = registros.filter(r => r.tiendaId === tienda.id);
  const total    = CAT.length || 1;
  const contados = new Set(regT.map(r => r.itemId)).size;
  const pct      = Math.round(contados / total * 100);
  const byK      = (k: string) => regT.filter(r => r.clasificacion === k).length;
  const sinDif   = byK('SIN_DIF');
  const falt     = byK('FALTANTE');
  const sobr     = byK('SOBRANTE');
  const cero     = byK('CERO');
  const totalReg  = regT.length || 1;
  const costoPerd = regT.filter(r => r.clasificacion === 'FALTANTE').reduce((a, r) => a + r.costoUnitario * Math.abs(r.cantidad - r.stockSistema), 0);
  const costoSobr = regT.filter(r => r.clasificacion === 'SOBRANTE').reduce((a, r) => a + r.costoUnitario * Math.abs(r.cantidad - r.stockSistema), 0);
  const auditores = [...new Set(regT.map(r => r.usuarioNombre))].map(nombre => ({
    nombre,
    n:   regT.filter(r => r.usuarioNombre === nombre).length,
    pct: Math.round(regT.filter(r => r.usuarioNombre === nombre).length / total * 100),
  })).sort((a, b) => b.n - a.n);

  const TABS = [
    { k: 'resultados', label: 'Resultados' },
    { k: 'gestion',    label: 'Gestión' },
    { k: 'resumen',    label: 'Resumen' },
  ];

  const segmentos = [
    { k: 'SIN_DIF',  n: sinDif, c: PRP,      label: 'Sin diferencia' },
    { k: 'FALTANTE', n: falt,   c: '#F97316', label: 'Faltante' },
    { k: 'SOBRANTE', n: sobr,   c: '#22C55E', label: 'Sobrante' },
    { k: 'CERO',     n: cero,   c: '#EF4444', label: 'Conteo cero' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: LGR }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={BLK} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Resultados</Text>
          <Text style={s.headerSub}>{tienda.nombre} · {contados}/{total} artículos · {pct}%</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.k}
            style={[s.tab, tab === t.k && s.tabActive]}
            onPress={() => setTab(t.k)}
          >
            <Text style={[s.tabTxt, tab === t.k && { color: tienda.color, fontWeight: '700' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Resultados ── */}
        {tab === 'resultados' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Distribución del conteo</Text>
            {regT.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Ionicons name="cube-outline" size={40} color={BRD} />
                <Text style={{ color: '#A1A1AA', marginTop: 8, fontSize: 13 }}>Sin escaneos aún</Text>
              </View>
            ) : (
              <>
                {/* Barra de distribución */}
                <View style={s.distBar}>
                  {segmentos.filter(sg => sg.n > 0).map(sg => (
                    <View key={sg.k} style={[s.distSeg, { flex: sg.n, backgroundColor: sg.c }]} />
                  ))}
                </View>

                {/* Leyenda */}
                <View style={s.leyenda}>
                  {segmentos.map(sg => (
                    <View key={sg.k} style={s.leyendaItem}>
                      <View style={[s.leyendaDot, { backgroundColor: sg.c }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.leyendaLabel}>{sg.label}</Text>
                        <Text style={[s.leyendaN, { color: sg.c }]}>
                          {sg.n} · {Math.round(sg.n / totalReg * 100)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Progreso general */}
                <View style={[s.progRow, { marginTop: 16 }]}>
                  <View style={s.progBg}>
                    <View style={[s.progFill, { width: `${pct}%`, backgroundColor: tienda.color }]} />
                  </View>
                  <Text style={[s.progPct, { color: tienda.color }]}>{pct}%</Text>
                </View>
                <Text style={s.progSub}>{contados} de {total} artículos contados</Text>
              </>
            )}
          </View>
        )}

        {/* ── Gestión ── */}
        {tab === 'gestion' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Conteo por auditor</Text>
            {auditores.length === 0 ? (
              <Text style={{ color: '#A1A1AA', textAlign: 'center', padding: 24 }}>Sin registros aún</Text>
            ) : auditores.map((a, i) => {
              const barColors = [PRP, '#4C1D95', '#6D28D9', '#8B5CF6', '#A78BFA'];
              return (
                <View key={a.nombre} style={s.audRow}>
                  <View style={[s.audRank, { backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7C2F' : LGR }]}>
                    <Text style={[s.audRankTxt, { color: i < 3 ? '#fff' : '#A1A1AA' }]}>{i + 1}</Text>
                  </View>
                  <Avatar nombre={a.nombre} size={38} bg="#27272A" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={s.audNombre}>{a.nombre}</Text>
                      <Text style={s.audPct}>{a.n} · {a.pct}%</Text>
                    </View>
                    <View style={s.audBarBg}>
                      <View style={[s.audBarFill, { width: `${a.pct}%`, backgroundColor: barColors[i % barColors.length] }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Resumen económico ── */}
        {tab === 'resumen' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Impacto económico</Text>
            <View style={s.impactoGrid}>
              <View style={[s.impactoCard, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                <Ionicons name="trending-down" size={22} color="#C2410C" />
                <Text style={[s.impactoNum, { color: '#C2410C' }]}>-{fCOP(costoPerd)}</Text>
                <Text style={s.impactoLbl}>Pérdida faltantes</Text>
              </View>
              <View style={[s.impactoCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Ionicons name="trending-up" size={22} color="#15803D" />
                <Text style={[s.impactoNum, { color: '#15803D' }]}>+{fCOP(costoSobr)}</Text>
                <Text style={s.impactoLbl}>Valor sobrantes</Text>
              </View>
            </View>
            <View style={[s.balanceBox, {
              backgroundColor: costoSobr - costoPerd >= 0 ? '#F0FDF4' : '#FEF2F2',
              borderColor: costoSobr - costoPerd >= 0 ? '#BBF7D0' : '#FECACA',
            }]}>
              <Text style={s.balanceLbl}>Balance general</Text>
              <Text style={[s.balanceNum, { color: costoSobr - costoPerd >= 0 ? '#15803D' : '#DC2626' }]}>
                {costoSobr - costoPerd >= 0 ? '+' : ''}{fCOP(costoSobr - costoPerd)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 54, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: BLK },
  headerSub:   { fontSize: 12, color: MTD, marginTop: 2 },

  tabs:        { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD, paddingHorizontal: 16 },
  tab:         { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:   { borderBottomColor: PRP },
  tabTxt:      { fontSize: 13, fontWeight: '500', color: '#A1A1AA' },

  card:        { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: BLK, marginBottom: 16 },

  distBar:     { flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', marginBottom: 16, gap: 2 },
  distSeg:     { height: '100%' },
  leyenda:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '45%', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: BRD, gap: 8 },
  leyendaDot:  { width: 10, height: 10, borderRadius: 5 },
  leyendaLabel:{ fontSize: 11, color: MTD, fontWeight: '500' },
  leyendaN:    { fontSize: 13, fontWeight: '700' },

  progRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  progBg:      { flex: 1, height: 10, backgroundColor: LGR, borderRadius: 5, overflow: 'hidden' },
  progFill:    { height: '100%', borderRadius: 5 },
  progPct:     { fontSize: 14, fontWeight: '800', minWidth: 36, textAlign: 'right' },
  progSub:     { fontSize: 12, color: MTD },

  audRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  audRank:     { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  audRankTxt:  { fontSize: 11, fontWeight: '800' },
  audNombre:   { fontSize: 13, fontWeight: '600', color: BLK },
  audPct:      { fontSize: 12, color: MTD },
  audBarBg:    { height: 6, backgroundColor: LGR, borderRadius: 3, overflow: 'hidden' },
  audBarFill:  { height: '100%', borderRadius: 3 },

  impactoGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  impactoCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
  impactoNum:  { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  impactoLbl:  { fontSize: 11, color: MTD, textAlign: 'center' },
  balanceBox:  { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  balanceLbl:  { fontSize: 13, fontWeight: '600', color: MTD },
  balanceNum:  { fontSize: 18, fontWeight: '900' },
});
