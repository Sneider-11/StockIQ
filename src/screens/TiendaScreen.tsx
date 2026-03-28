import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tienda, Usuario, Registro, Articulo, CLSF, IoniconName } from '../constants/data';
import { Avatar, SecHeader } from '../components/common';
import { LGR, BRD, MTD, BLK } from '../constants/colors';

interface Props {
  tienda: Tienda;
  usuario: Usuario;
  usuarios: Usuario[];
  registros: Registro[];
  catalogos: Record<string, Articulo[]>;
  onBack: () => void;
  onNavScanner: (t: Tienda) => void;
  onNavRegistros: (t: Tienda) => void;
  onNavImportar: (t: Tienda) => void;
  onNavResultados: (t: Tienda) => void;
}

export const TiendaScreen: React.FC<Props> = ({
  tienda, usuario, usuarios, registros, catalogos,
  onBack, onNavScanner, onNavRegistros, onNavImportar, onNavResultados,
}) => {
  const CAT           = catalogos[tienda.id] || [];
  const regTienda     = registros.filter(r => r.tiendaId === tienda.id);
  const esSuperAdmin  = usuario.rol === 'SUPERADMIN';
  const total         = CAT.length || 18;
  const contados      = new Set(regTienda.map(r => r.itemId)).size;
  const pct           = Math.round(contados / total * 100);
  const auditoresActivos = usuarios.filter(u => u.tiendas.includes(tienda.id) && u.rol !== 'SUPERADMIN');

  const acciones: { icon: IoniconName; bg: string; title: string; sub: string; fn: () => void }[] = [
    { icon: 'scan',         bg: tienda.color, title: 'Escanear artículo',  sub: 'Abrir cámara para contar',              fn: () => onNavScanner(tienda) },
    { icon: 'list',         bg: '#27272A',    title: 'Registros',           sub: `${regTienda.length} escaneos totales`,   fn: () => onNavRegistros(tienda) },
    { icon: 'pie-chart',    bg: '#4C1D95',    title: 'Resultados',          sub: 'Análisis y resumen económico',           fn: () => onNavResultados(tienda) },
    ...(esSuperAdmin
      ? [{ icon: 'cloud-upload' as IoniconName, bg: '#09090B', title: 'Cargar Excel', sub: CAT.length > 0 ? `${CAT.length} artículos cargados` : 'Sin catálogo cargado', fn: () => onNavImportar(tienda) }]
      : []),
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: LGR }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header con color de la tienda */}
      <View style={[s.header, { backgroundColor: tienda.color }]}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.tiendaTag}>INVENTARIO</Text>
            <Text style={s.tiendaNombre}>{tienda.nombre}</Text>
          </View>
        </View>

        {/* Progreso */}
        <View style={s.progCard}>
          <View style={s.progTop}>
            <View style={s.liveChip}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>EN VIVO</Text>
            </View>
            <Text style={s.progPct}>{pct}%</Text>
          </View>
          <View style={s.progBg}>
            <View style={[s.progFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.progSub}>{contados} de {total} artículos · {regTienda.length} escaneos registrados</Text>
        </View>
      </View>

      {/* Estadísticas de clasificación */}
      <View style={s.statsRow}>
        {(['SIN_DIF', 'FALTANTE', 'SOBRANTE', 'CERO'] as const).map(k => {
          const cfg = CLSF[k];
          const n   = regTienda.filter(r => r.clasificacion === k).length;
          return (
            <View key={k} style={[s.statCard, { borderTopColor: cfg.dot }]}>
              <Text style={[s.statN, { color: cfg.color }]}>{n}</Text>
              <Text style={s.statLbl}>{cfg.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <SecHeader title="Acciones" />
        {acciones.map(ac => (
          <TouchableOpacity key={ac.title} style={s.actionCard} onPress={ac.fn} activeOpacity={0.88}>
            <View style={[s.actionIcon, { backgroundColor: ac.bg }]}>
              <Ionicons name={ac.icon} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{ac.title}</Text>
              <Text style={s.actionSub}>{ac.sub}</Text>
            </View>
            <View style={s.actionArrow}>
              <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
            </View>
          </TouchableOpacity>
        ))}

        {auditoresActivos.length > 0 && (
          <>
            <SecHeader title="Equipo en esta tienda" />
            {auditoresActivos.map(u => (
              <View key={u.id} style={s.audRow}>
                <Avatar nombre={u.nombre} size={38} bg="#27272A" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.audNombre}>{u.nombre}</Text>
                  <Text style={s.audSub}>{regTienda.filter(r => r.usuarioNombre === u.nombre).length} escaneos</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  header:      { padding: 20, paddingTop: 54, paddingBottom: 24 },
  headerTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tiendaTag:   { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 1.5 },
  tiendaNombre:{ fontSize: 20, fontWeight: '900', color: '#fff' },

  progCard:    { backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  progTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  liveChip:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveTxt:     { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '700', letterSpacing: 1 },
  progPct:     { fontSize: 20, fontWeight: '900', color: '#fff' },
  progBg:      { height: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progFill:    { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  progSub:     { fontSize: 11, color: 'rgba(255,255,255,0.55)' },

  statsRow:    { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  statCard:    { flex: 1, backgroundColor: '#fff', borderRadius: 13, padding: 11, alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: BRD },
  statN:       { fontSize: 22, fontWeight: '900', marginBottom: 3 },
  statLbl:     { fontSize: 9, fontWeight: '600', color: MTD, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  actionCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionIcon:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: BLK, marginBottom: 2 },
  actionSub:   { fontSize: 12, color: MTD },
  actionArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center' },

  audRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 13, padding: 13, marginBottom: 8, borderWidth: 1, borderColor: BRD },
  audNombre:   { fontSize: 13, fontWeight: '700', color: BLK },
  audSub:      { fontSize: 11, color: MTD, marginTop: 2 },
});
