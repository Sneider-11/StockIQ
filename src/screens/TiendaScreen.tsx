import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated } from 'react-native';
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
  confirmadosCero: string[];
  onBack: () => void;
  onNavScanner: (t: Tienda) => void;
  onNavRegistros: (t: Tienda) => void;
  onNavMisRegistros?: (t: Tienda) => void;
  onNavImportar: (t: Tienda) => void;
  onNavResultados: (t: Tienda) => void;
  onNavSobrantes: (t: Tienda) => void;
  onNavEquipo?: () => void;
  onNavReporte?: () => void;
  onReiniciar?: () => void;
  onLimpiar?: () => void;
  /** Cambia el modo de acceso de la tienda: ONLINE o OFFLINE */
  onToggleModo?: (modo: 'ONLINE' | 'OFFLINE') => void;
}

// ── Tarjetas de estadísticas con glassmorphism + animaciones ─────────────────
const GlassStatCard: React.FC<{
  children: React.ReactNode;
  anim: { opacity: Animated.Value; scale: Animated.Value };
  onPress?: () => void;
  wide?: boolean;
}> = ({ children, anim, onPress, wide }) => {
  const pressScale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(pressScale, { toValue: 0.91, useNativeDriver: true, tension: 220, friction: 10 }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, tension: 220, friction: 10 }).start();

  return (
    <Animated.View style={[
      wide ? s.statCardWide : s.statCard,
      { opacity: anim.opacity, transform: [{ scale: Animated.multiply(anim.scale, pressScale) }] }
    ]}>
      <TouchableOpacity
        style={s.statCardInner}
        onPress={onPress}
        onPressIn={onPress ? onPressIn  : undefined}
        onPressOut={onPress ? onPressOut : undefined}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const TiendaScreen: React.FC<Props> = ({
  tienda, usuario, usuarios, registros, catalogos, sobrantesTienda, confirmadosCero,
  onBack, onNavScanner, onNavRegistros, onNavMisRegistros, onNavImportar, onNavResultados, onNavSobrantes,
  onNavEquipo, onNavReporte, onReiniciar, onLimpiar, onToggleModo,
}) => {
  const CAT            = catalogos[tienda.id] || [];
  const regTienda      = registros.filter(r => r.tiendaId === tienda.id);
  const esSuperAdmin   = usuario.rol === 'SUPERADMIN';
  const esAdmin        = usuario.rol === 'ADMIN' || esSuperAdmin;
  const esContador     = usuario.rol === 'CONTADOR';
  const total          = CAT.length || 18;
  const modoOffline    = tienda.modoInventario === 'OFFLINE';

  // ── Animaciones de las tarjetas de estadísticas ────────────────────────────
  const NCARDS = esAdmin ? 5 : 4;
  const cardAnims = useRef(
    Array(NCARDS).fill(null).map(() => ({
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0.78),
    }))
  ).current;

  useEffect(() => {
    Animated.stagger(70,
      cardAnims.map(a =>
        Animated.parallel([
          Animated.spring(a.scale,   { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
          Animated.timing(a.opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        ])
      )
    ).start();
  }, []);

  // Porcentaje considera escaneados + confirmados cero (sin doble contar)
  const escaneadosSet   = new Set(regTienda.map(r => r.itemId));
  const confirmadosSet  = new Set(confirmadosCero);
  const contadosTotal   = new Set([...escaneadosSet, ...confirmadosSet]).size;
  const contados        = contadosTotal;
  const pct             = Math.min(100, Math.round(contados / total * 100));

  const equipoTienda   = usuarios.filter(u => u.tiendas.includes(tienda.id) && u.rol !== 'SUPERADMIN' && u.activo !== false);

  // Acciones visibles según rol
  // CONTADOR: solo escanear + registros
  // ADMIN: + resultados + sobrantes
  // SUPERADMIN: + importar + limpiar
  const misEscaneos = regTienda.filter(r => r.usuarioNombre === usuario.nombre).length;

  const acciones: { icon: IoniconName; bg: string; title: string; sub: string; fn: () => void; badge?: string }[] = [
    { icon: 'scan',        bg: tienda.color, title: 'Escanear artículo',    sub: 'Abrir cámara para contar',                                   fn: () => onNavScanner(tienda) },
    { icon: 'list',        bg: '#27272A',    title: 'Registros de conteo',  sub: `${regTienda.length} escaneos totales en la tienda`,          fn: () => onNavRegistros(tienda) },
    ...(esAdmin && onNavMisRegistros ? [
      { icon: 'person-circle' as IoniconName, bg: '#6D28D9', title: 'Mis registros', sub: misEscaneos > 0 ? `${misEscaneos} escaneos propios` : 'Ver y editar mis propios conteos', fn: () => onNavMisRegistros(tienda) },
    ] : []),
    ...(esAdmin ? [
      { icon: 'add-circle' as IoniconName, bg: '#92400E', title: 'Sobrantes sin Stock', sub: sobrantesTienda > 0 ? `${sobrantesTienda} registrados` : 'Artículos sin existencia en sistema', fn: () => onNavSobrantes(tienda), badge: sobrantesTienda > 0 ? String(sobrantesTienda) : undefined },
    ] : []),
    ...(esAdmin ? [
      { icon: 'pie-chart'    as IoniconName, bg: '#4C1D95', title: 'Resultados',             sub: 'Análisis, artículos y resumen económico',   fn: () => onNavResultados(tienda) },
      { icon: 'people'       as IoniconName, bg: '#0369A1', title: 'Gestionar equipo',        sub: `${equipoTienda.length} persona${equipoTienda.length !== 1 ? 's' : ''} asignada${equipoTienda.length !== 1 ? 's' : ''}`, fn: () => onNavEquipo?.() },
    ] : []),
    ...(esSuperAdmin
      ? [{ icon: 'cloud-upload' as IoniconName, bg: '#09090B', title: 'Cargar inventario Excel', sub: CAT.length > 0 ? `${CAT.length} artículos cargados` : 'Sin inventario cargado', fn: () => onNavImportar(tienda) }]
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
            <Text style={s.tiendaNombre} numberOfLines={1}>{tienda.nombre}</Text>
          </View>
        </View>

        {/* Progreso */}
        <View style={s.progCard}>
          <View style={s.progTop}>
            {modoOffline ? (
              <View style={[s.liveChip, { backgroundColor: 'rgba(220,38,38,0.25)' }]}>
                <View style={[s.liveDot, { backgroundColor: '#F87171' }]} />
                <Text style={[s.liveTxt, { color: '#FECACA' }]}>OFFLINE</Text>
              </View>
            ) : (
              <View style={s.liveChip}>
                <View style={s.liveDot} />
                <Text style={s.liveTxt}>EN VIVO</Text>
              </View>
            )}
            <Text style={s.progPct}>{pct}%</Text>
          </View>
          <View style={s.progBg}>
            <View style={[s.progFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.progSub} numberOfLines={1}>{contados} de {total} artículos · {regTienda.length} escaneos</Text>
        </View>

        {/* Estadísticas — glassmorphism sobre el fondo coloreado del header */}
        <View style={s.statsGrid}>
          {(['SIN_DIF', 'FALTANTE', 'SOBRANTE', 'CERO'] as const).map((k, idx) => {
            const cfg = CLSF[k];
            const n   = regTienda.filter(r => r.clasificacion === k).length;
            return (
              <GlassStatCard
                key={k}
                anim={cardAnims[idx]}
                onPress={esAdmin ? () => onNavResultados(tienda) : undefined}
              >
                <View style={[s.statAccent, { backgroundColor: cfg.dot }]} />
                <Text style={[s.statN, { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit>{n}</Text>
                <Text style={s.statLbl} numberOfLines={1}>{cfg.label}</Text>
                {esAdmin && <Text style={s.statHint}>Ver →</Text>}
              </GlassStatCard>
            );
          })}
          {esAdmin && (
            <GlassStatCard
              anim={cardAnims[4]}
              onPress={() => onNavSobrantes(tienda)}
              wide
            >
              <View style={[s.statAccent, { backgroundColor: '#F59E0B', width: '28%' }]} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={[s.statN, { color: '#FCD34D' }]} numberOfLines={1}>{sobrantesTienda}</Text>
                <View>
                  <Text style={[s.statLbl, { color: 'rgba(255,255,255,0.85)' }]}>Sobrantes sin stock</Text>
                  <Text style={[s.statHint, { marginTop: 2 }]}>Toca para gestionar →</Text>
                </View>
              </View>
            </GlassStatCard>
          )}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <SecHeader title="Acciones" />
        {acciones.map(ac => (
          <TouchableOpacity key={ac.title} style={s.actionCard} onPress={ac.fn} activeOpacity={0.88}>
            <View style={[s.actionIcon, { backgroundColor: ac.bg }]}>
              <Ionicons name={ac.icon} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle} numberOfLines={1}>{ac.title}</Text>
              <Text style={s.actionSub} numberOfLines={1}>{ac.sub}</Text>
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

        {equipoTienda.length > 0 && (
          <>
            <SecHeader title="Equipo en esta tienda" />
            {equipoTienda.map(u => (
              <View key={u.id} style={s.audRow}>
                <Avatar nombre={u.nombre} size={38} bg="#27272A" />
                <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
                  <Text style={s.audNombre} numberOfLines={1}>{u.nombre}</Text>
                  <Text style={s.audSub} numberOfLines={1}>{regTienda.filter(r => r.usuarioNombre === u.nombre).length} escaneos</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {esAdmin && onNavReporte && (
          <>
            <SecHeader title="Informes" />
            <TouchableOpacity style={s.actionCard} onPress={onNavReporte} activeOpacity={0.88}>
              <View style={[s.actionIcon, { backgroundColor: '#1D4ED8' }]}>
                <Ionicons name="bar-chart" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionTitle} numberOfLines={1}>Reporte de Auditoría</Text>
                <Text style={s.actionSub} numberOfLines={1}>Informe ejecutivo para la administración</Text>
              </View>
              <View style={s.actionArrow}>
                <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* ── Control de acceso (solo Admin/SuperAdmin) ── */}
        {esAdmin && onToggleModo && (
          <>
            <SecHeader title="Control de acceso" />
            <TouchableOpacity
              style={[s.actionCard, modoOffline && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
              activeOpacity={0.88}
              onPress={() => {
                if (modoOffline) {
                  Alert.alert(
                    'Activar inventario',
                    `¿Volver a poner "${tienda.nombre}" en modo ONLINE? Los auditores podrán ingresar nuevamente.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Activar', style: 'default', onPress: () => onToggleModo('ONLINE') },
                    ],
                  );
                } else {
                  Alert.alert(
                    'Cerrar inventario',
                    `¿Pasar "${tienda.nombre}" a modo OFFLINE?\n\nLos auditores activos serán expulsados y no podrán volver a ingresar hasta que lo reactives.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Cerrar inventario', style: 'destructive', onPress: () => onToggleModo('OFFLINE') },
                    ],
                  );
                }
              }}
            >
              <View style={[s.actionIcon, { backgroundColor: modoOffline ? '#DC2626' : '#15803D' }]}>
                <Ionicons name={modoOffline ? 'lock-closed' : 'lock-open'} size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.actionTitle, modoOffline && { color: '#DC2626' }]} numberOfLines={1}>
                  Inventario {modoOffline ? 'OFFLINE' : 'ONLINE'}
                </Text>
                <Text style={[s.actionSub, modoOffline && { color: '#F87171' }]} numberOfLines={1}>
                  {modoOffline
                    ? `Cerrado por ${tienda.cerradoPor ?? 'administrador'} — toca para reactivar`
                    : 'Toca para cerrar el acceso de auditores'}
                </Text>
              </View>
              <View style={[s.actionArrow, modoOffline && { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="chevron-forward" size={16} color={modoOffline ? '#DC2626' : '#A1A1AA'} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {esAdmin && onReiniciar && (
          <>
            <SecHeader title="Zona de peligro" />
            <TouchableOpacity
              style={s.dangerCard}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert(
                  'Reiniciar inventario',
                  `¿Eliminar TODOS los escaneos, sobrantes y conteos cero de "${tienda.nombre}"? Esta acción no se puede deshacer.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Reiniciar', style: 'destructive', onPress: onReiniciar },
                  ],
                )
              }
            >
              <View style={s.dangerIcon}>
                <Ionicons name="refresh-circle-outline" size={22} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.dangerTitle}>Reiniciar inventario</Text>
                <Text style={s.dangerSub}>Borra todos los datos para comenzar de cero</Text>
              </View>
              <View style={s.actionArrow}>
                <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
              </View>
            </TouchableOpacity>
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

  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 14, paddingBottom: 22, gap: 10 },
  statCard:      { width: '47%', borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 4 },
  statCardWide:  { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 4 },
  statCardInner: { padding: 16, alignItems: 'center', position: 'relative' },
  statAccent:    { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  statN:         { fontSize: 28, fontWeight: '900', marginBottom: 3, marginTop: 4 },
  statLbl:       { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  statHint:      { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 4 },

  actionCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  actionIcon:  { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  actionTitle: { fontSize: 15, fontWeight: '800', color: BLK, marginBottom: 3, flexShrink: 1 },
  actionSub:   { fontSize: 12, color: MTD, flexShrink: 1 },
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
