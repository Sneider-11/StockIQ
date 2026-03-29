import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
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
  sobrantesTienda: number;
  onBack: () => void;
  onNavScanner: (t: Tienda) => void;
  onNavRegistros: (t: Tienda) => void;
  onNavImportar: (t: Tienda) => void;
  onNavResultados: (t: Tienda) => void;
  onNavSobrantes: (t: Tienda) => void;
  onLimpiar?: () => void;
}

export const TiendaScreen: React.FC<Props> = ({
  tienda, usuario, usuarios, registros, catalogos, sobrantesTienda,
  onBack, onNavScanner, onNavRegistros, onNavImportar, onNavResultados, onNavSobrantes,
  onLimpiar,
}) => {
  const CAT           = catalogos[tienda.id] || [];
  const regTienda     = registros.filter(r => r.tiendaId === tienda.id);
  const esSuperAdmin  = usuario.rol === 'SUPERADMIN';
  const total         = CAT.length || 18;
  const contados      = new Set(regTienda.map(r => r.itemId)).size;
  const pct           = Math.round(contados / total * 100);
  const auditoresActivos = usuarios.filter(u => u.tiendas.includes(tienda.id) && u.rol !== 'SUPERADMIN');

  const acciones: { icon: IoniconName; bg: string; title: string; sub: string; fn: () => void; badge?: string }[] = [
    { icon: 'scan',           bg: tienda.color, title: 'Escanear artículo',       sub: 'Abrir cámara para contar',                           fn: () => onNavScanner(tienda) },
    { icon: 'list',           bg: '#27272A',    title: 'Registros de conteo',      sub: `${regTienda.length} escaneos totales`,                fn: () => onNavRegistros(tienda) },
    { icon: 'pie-chart',      bg: '#4C1D95',    title: 'Resultados',               sub: 'Análisis y resumen económico',                        fn: () => onNavResultados(tienda) },
    { icon: 'add-circle',     bg: '#92400E',    title: 'Sobrantes sin Stock',      sub: sobrantesTienda > 0 ? `${sobrantesTienda} registrados` : 'Artículos sin existencia en sistema', fn: () => onNavSobrantes(tienda), badge: sobrantesTienda > 0 ? String(sobrantesTienda) : undefined },
    ...(esSuperAdmin
      ? [{ icon: 'cloud-upload' as IoniconName, bg: '#09090B', title: 'Cargar catálogo Excel', sub: CAT.length > 0 ? `${CAT.length} artículos cargados` : 'Sin catálogo cargado', fn: () => onNavImportar(tienda) }]
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
      <View style={s.statsGrid}>
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

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <SecHeader title="Acciones" />
        {acciones.map(ac => (
          <TouchableOpacity key={ac.title} style={s.actionCard} onPress={ac.fn} activeOpacity={0.88}>
            <View style={[s.actionIcon, { backgroundColor: ac.bg }]}>
              <Ionicons name={ac.icon} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{ac.title}</Text>
              <Text style={s.actionSub}>{ac.sub}</Text>
            </View>
            {ac.badge && (
              <View style={[s.badgeChip, { backgroundColor: '#92400E' }]}>
                <Text style={s.badgeTxt}>{ac.badge}</Text>
              </View>
            )}
            <View style={s.actionArrow}>
              <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
            </View>
          </TouchableOpacity>
        ))}

        {esSuperAdmin && onLimpiar && regTienda.length > 0 && (
          <>
            <SecHeader title="Zona de peligro" />
            <TouchableOpacity
              style={s.dangerCard}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert(
                  'Limpiar inventario',
                  `¿Eliminar los ${regTienda.length} escaneos de "${tienda.nombre}"? Esta acción no se puede deshacer.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Limpiar', style: 'destructive', onPress: onLimpiar },
                  ],
                )
              }
            >
              <View style={s.dangerIcon}>
                <Ionicons name="trash-outline" size={22} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.dangerTitle}>Limpiar inventario</Text>
                <Text style={s.dangerSub}>Eliminar los {regTienda.length} escaneos de esta tienda</Text>
              </View>
              <View style={s.actionArrow}>
                <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
              </View>
            </TouchableOpacity>
          </>
        )}

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
  header:      { padding: 22, paddingTop: 54, paddingBottom: 26 },
  headerTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tiendaTag:   { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 1.5 },
  tiendaNombre:{ fontSize: 22, fontWeight: '900', color: '#fff' },

  progCard:    { backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  progTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  liveChip:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveTxt:     { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '700', letterSpacing: 1 },
  progPct:     { fontSize: 24, fontWeight: '900', color: '#fff' },
  progBg:      { height: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progFill:    { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  progSub:     { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 18, gap: 10 },
  statCard:    { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderTopWidth: 4, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  statN:       { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  statLbl:     { fontSize: 10, fontWeight: '700', color: MTD, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  actionCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  actionIcon:  { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  actionTitle: { fontSize: 15, fontWeight: '800', color: BLK, marginBottom: 3 },
  actionSub:   { fontSize: 12, color: MTD },
  actionArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  badgeChip:   { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, marginRight: 8 },
  badgeTxt:    { color: '#fff', fontSize: 12, fontWeight: '800' },

  dangerCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' },
  dangerIcon:  { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  dangerTitle: { fontSize: 15, fontWeight: '800', color: '#DC2626', marginBottom: 3 },
  dangerSub:   { fontSize: 12, color: '#F87171' },

  audRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRD },
  audNombre:   { fontSize: 14, fontWeight: '700', color: BLK },
  audSub:      { fontSize: 12, color: MTD, marginTop: 2 },
});
