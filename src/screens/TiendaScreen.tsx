/**
 * TiendaScreen.tsx — Dark Space Edition 2026
 * - Header aurora: LinearGradient oscuro sobre tienda.color
 * - Barra de progreso animada con glow dinámico (verde/ámbar/rojo)
 * - Tarjetas holográficas con shimmer sweep y glow por color de clasificación
 * - Punto "EN VIVO" pulsante
 * - Action cards con ícono LinearGradient
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Tienda, Usuario, Registro, Articulo, CLSF, IoniconName } from '../constants/data';
import { Avatar, SecHeader } from '../components/common';
import { PRP, IND } from '../constants/colors';
import { useThemeColors } from '../hooks/useThemeColors';

interface Props {
  tienda:           Tienda;
  usuario:          Usuario;
  usuarios:         Usuario[];
  registros:        Registro[];
  catalogos:        Record<string, Articulo[]>;
  sobrantesTienda:  number;
  confirmadosCero:  string[];
  onBack:           () => void;
  onNavScanner:     (t: Tienda) => void;
  onNavRegistros:   (t: Tienda) => void;
  onNavMisRegistros?: (t: Tienda) => void;
  onNavImportar:    (t: Tienda) => void;
  onNavResultados:  (t: Tienda) => void;
  onNavSobrantes:   (t: Tienda) => void;
  onNavEquipo?:     () => void;
  onNavReporte?:    () => void;
  onReiniciar?:     () => void;
  onLimpiar?:       () => void;
  onToggleModo?:    (modo: 'ONLINE' | 'OFFLINE') => void;
}

// ── Tarjeta holográfica con shimmer diagonal ──────────────────────────────────
const GlassStatCard: React.FC<{
  children:     React.ReactNode;
  anim:         { opacity: Animated.Value; scale: Animated.Value };
  onPress?:     () => void;
  wide?:        boolean;
  accentColor?: string;
}> = ({ children, anim, onPress, wide, accentColor = PRP }) => {
  const pressScale = useRef(new Animated.Value(1)).current;
  const shimmerX   = useRef(new Animated.Value(-80)).current;
  const cfg = { tension: 220, friction: 10, useNativeDriver: true } as const;

  const onPressIn  = () => Animated.spring(pressScale, { toValue: 0.91, ...cfg }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1,    ...cfg }).start();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2400),
        Animated.timing(shimmerX, { toValue: 180, duration: 680, useNativeDriver: true }),
        Animated.timing(shimmerX, { toValue: -80, duration: 0,   useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        wide ? s.statCardWide : s.statCard,
        {
          opacity:       anim.opacity,
          transform:     [{ scale: Animated.multiply(anim.scale, pressScale) }],
          shadowColor:   accentColor,
          shadowOpacity: 0.30,
          shadowRadius:  12,
          elevation:     6,
        },
      ]}
    >
      <TouchableOpacity
        style={s.statCardInner}
        onPress={onPress}
        onPressIn={onPress  ? onPressIn  : undefined}
        onPressOut={onPress ? onPressOut : undefined}
        activeOpacity={1}
      >
        {children}

        {/* Shimmer sweep diagonal */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ translateX: shimmerX }] }]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.09)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: 56, height: '100%' }}
          />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const TiendaScreen: React.FC<Props> = ({
  tienda, usuario, usuarios, registros, catalogos, sobrantesTienda, confirmadosCero,
  onBack, onNavRegistros, onNavImportar, onNavResultados, onNavSobrantes,
  onNavReporte, onReiniciar, onToggleModo,
}) => {
  const tc = useThemeColors();
  const CAT          = catalogos[tienda.id] || [];
  const regTienda    = registros.filter(r => r.tiendaId === tienda.id);
  const esSuperAdmin = usuario.rol === 'SUPERADMIN';
  const esAdmin      = usuario.rol === 'ADMIN' || esSuperAdmin;
  const total        = CAT.length || 18;
  const modoOffline  = tienda.modoInventario === 'OFFLINE';

  const escaneadosSet  = new Set(regTienda.map(r => r.itemId));
  const confirmadosSet = new Set(confirmadosCero);
  const contados       = new Set([...escaneadosSet, ...confirmadosSet]).size;
  const pct            = Math.min(100, Math.round(contados / total * 100));

  // Color dinámico de progreso
  const progColor = pct >= 80 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#F87171';

  // Barra de progreso animada
  const progWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(progWidth, {
      toValue: pct / 100,
      tension: 35, friction: 9, useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  // Punto EN VIVO pulsante
  const livePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!modoOffline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(livePulse, { toValue: 0.2, duration: 750, useNativeDriver: true }),
          Animated.timing(livePulse, { toValue: 1,   duration: 750, useNativeDriver: true }),
        ])
      ).start();
    } else {
      livePulse.stopAnimation();
      livePulse.setValue(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoOffline]);

  // Animaciones de entrada de tarjetas
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const equipoTienda = usuarios.filter(
    u => u.tiendas.includes(tienda.id) && u.rol !== 'SUPERADMIN' && u.activo !== false
  );

  const acciones: {
    icon: IoniconName;
    gradColors: [string, string];
    title: string;
    sub: string;
    fn: () => void;
    badge?: string;
  }[] = [
    ...(esAdmin ? [{
      icon: 'list' as IoniconName,
      gradColors: ['#3F3F46', '#27272A'] as [string, string],
      title: 'Registros de conteo',
      sub: `${regTienda.length} escaneos totales en la tienda`,
      fn: () => onNavRegistros(tienda),
    }] : []),
    ...(esAdmin ? [{
      icon: 'add-circle' as IoniconName,
      gradColors: ['#B45309', '#78350F'] as [string, string],
      title: 'Sobrantes sin Stock',
      sub: sobrantesTienda > 0 ? `${sobrantesTienda} registrados` : 'Artículos sin existencia en sistema',
      fn: () => onNavSobrantes(tienda),
      badge: sobrantesTienda > 0 ? String(sobrantesTienda) : undefined,
    }] : []),
    ...(esAdmin ? [{
      icon: 'cloud-upload' as IoniconName,
      gradColors: [PRP, IND] as [string, string],
      title: 'Cargar inventario Excel',
      sub: CAT.length > 0 ? `${CAT.length} artículos cargados` : 'Sin inventario cargado',
      fn: () => onNavImportar(tienda),
    }] : []),
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tc.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header aurora ── */}
      <View style={[s.header, { backgroundColor: tienda.color }]}>
        {/* Capa oscura degradada para profundidad */}
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(3,3,5,0.68)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={s.headerTop}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.tiendaTag}>INVENTARIO</Text>
            <Text style={s.tiendaNombre} numberOfLines={1}>{tienda.nombre}</Text>
          </View>
        </View>

        {/* Tarjeta de progreso */}
        <View style={s.progCard}>
          <View style={s.progTop}>
            {modoOffline ? (
              <View style={[s.liveChip, { backgroundColor: 'rgba(220,38,38,0.22)', borderColor: 'rgba(248,113,113,0.30)' }]}>
                <View style={[s.liveDot, { backgroundColor: '#F87171' }]} />
                <Text style={[s.liveTxt, { color: '#FECACA' }]}>OFFLINE</Text>
              </View>
            ) : (
              <View style={s.liveChip}>
                <Animated.View style={[s.liveDot, { opacity: livePulse }]} />
                <Text style={s.liveTxt}>EN VIVO</Text>
              </View>
            )}
            <Text style={[s.progPct, { color: progColor }]}>{pct}%</Text>
          </View>

          <View style={s.progBg}>
            <Animated.View
              style={[
                s.progFill,
                {
                  width: progWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: progColor,
                  shadowColor:     progColor,
                  shadowOpacity:   0.70,
                  shadowRadius:    8,
                  elevation:       4,
                },
              ]}
            />
          </View>
          <Text style={s.progSub}>{contados} de {total} artículos · {regTienda.length} escaneos</Text>
        </View>

        {/* Cuadrícula de estadísticas */}
        <View style={s.statsGrid}>
          <View style={s.statsRow}>
            {(['SIN_DIF', 'FALTANTE'] as const).map((k, idx) => {
              const cfg = CLSF[k];
              const n   = regTienda.filter(r => r.clasificacion === k).length;
              return (
                <GlassStatCard
                  key={k}
                  anim={cardAnims[idx]}
                  onPress={esAdmin ? () => onNavResultados(tienda) : undefined}
                  accentColor={cfg.dot}
                >
                  <View style={[s.statAccent, { backgroundColor: cfg.dot }]} />
                  <Text style={[s.statN, { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit>{n}</Text>
                  <Text style={s.statLbl} numberOfLines={1}>{cfg.label}</Text>
                  {esAdmin && <Text style={s.statHint}>Ver →</Text>}
                </GlassStatCard>
              );
            })}
          </View>
          <View style={s.statsRow}>
            {(['SOBRANTE', 'CERO'] as const).map((k, idx) => {
              const cfg = CLSF[k];
              const n   = regTienda.filter(r => r.clasificacion === k).length;
              return (
                <GlassStatCard
                  key={k}
                  anim={cardAnims[idx + 2]}
                  onPress={esAdmin ? () => onNavResultados(tienda) : undefined}
                  accentColor={cfg.dot}
                >
                  <View style={[s.statAccent, { backgroundColor: cfg.dot }]} />
                  <Text style={[s.statN, { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit>{n}</Text>
                  <Text style={s.statLbl} numberOfLines={1}>{cfg.label}</Text>
                  {esAdmin && <Text style={s.statHint}>Ver →</Text>}
                </GlassStatCard>
              );
            })}
          </View>
          {esAdmin && (
            <GlassStatCard
              anim={cardAnims[4]}
              onPress={() => onNavSobrantes(tienda)}
              wide
              accentColor="#F59E0B"
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
        {acciones.length > 0 && <SecHeader title="Acciones" />}
        {acciones.map(ac => (
          <TouchableOpacity
            key={ac.title}
            style={[s.actionCard, { backgroundColor: tc.card, borderColor: tc.border }]}
            onPress={ac.fn}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={ac.gradColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.actionIcon}
            >
              <Ionicons name={ac.icon} size={22} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[s.actionTitle, { color: tc.text }]} numberOfLines={1}>{ac.title}</Text>
              <Text style={[s.actionSub, { color: tc.muted }]} numberOfLines={1}>{ac.sub}</Text>
            </View>
            {ac.badge && (
              <View style={[s.badgeChip, { backgroundColor: '#92400E' }]}>
                <Text style={s.badgeTxt}>{ac.badge}</Text>
              </View>
            )}
            <View style={[s.actionArrow, { backgroundColor: tc.btnBg }]}>
              <Ionicons name="chevron-forward" size={16} color={tc.chevron} />
            </View>
          </TouchableOpacity>
        ))}

        {equipoTienda.length > 0 && (
          <>
            <SecHeader title="Equipo en esta tienda" />
            {equipoTienda.map(u => (
              <View key={u.id} style={[s.audRow, { backgroundColor: tc.card, borderColor: tc.border }]}>
                <Avatar nombre={u.nombre} size={38} bg="#27272A" />
                <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
                  <Text style={[s.audNombre, { color: tc.text }]} numberOfLines={1}>{u.nombre}</Text>
                  <Text style={[s.audSub, { color: tc.muted }]} numberOfLines={1}>
                    {regTienda.filter(r => r.usuarioNombre === u.nombre).length} escaneos
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {esAdmin && onNavReporte && (
          <>
            <SecHeader title="Informes" />
            <TouchableOpacity
              style={[s.actionCard, { backgroundColor: tc.card, borderColor: tc.border }]}
              onPress={onNavReporte}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#1D4ED8', '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.actionIcon}
              >
                <Ionicons name="bar-chart" size={22} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.actionTitle, { color: tc.text }]} numberOfLines={1}>Reporte de Auditoría</Text>
                <Text style={[s.actionSub, { color: tc.muted }]} numberOfLines={1}>Informe ejecutivo para la administración</Text>
              </View>
              <View style={[s.actionArrow, { backgroundColor: tc.btnBg }]}>
                <Ionicons name="chevron-forward" size={16} color={tc.chevron} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {esAdmin && onToggleModo && (
          <>
            <SecHeader title="Control de acceso" />
            <TouchableOpacity
              style={[
                s.actionCard,
                { backgroundColor: tc.card, borderColor: tc.border },
                modoOffline && {
                  backgroundColor: tc.isDark ? '#2D0A0A' : '#FEF2F2',
                  borderColor:     tc.isDark ? '#7F1D1D' : '#FECACA',
                },
              ]}
              activeOpacity={0.88}
              onPress={() => {
                if (modoOffline) {
                  Alert.alert(
                    'Activar inventario',
                    `¿Volver a poner "${tienda.nombre}" en modo ONLINE? Los auditores podrán ingresar nuevamente.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Activar', style: 'default', onPress: () => onToggleModo?.('ONLINE') },
                    ],
                  );
                } else {
                  Alert.alert(
                    'Cerrar inventario',
                    `¿Pasar "${tienda.nombre}" a modo OFFLINE?\n\nLos auditores activos serán expulsados y no podrán volver a ingresar hasta que lo reactives.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Cerrar inventario', style: 'destructive', onPress: () => onToggleModo?.('OFFLINE') },
                    ],
                  );
                }
              }}
            >
              <LinearGradient
                colors={modoOffline ? ['#DC2626', '#991B1B'] : ['#15803D', '#166534']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.actionIcon}
              >
                <Ionicons name={modoOffline ? 'lock-closed' : 'lock-open'} size={22} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    s.actionTitle,
                    { color: tc.text },
                    modoOffline && { color: tc.isDark ? '#F87171' : '#DC2626' },
                  ]}
                  numberOfLines={1}
                >
                  Inventario {modoOffline ? 'OFFLINE' : 'ONLINE'}
                </Text>
                <Text
                  style={[
                    s.actionSub,
                    { color: tc.muted },
                    modoOffline && { color: tc.isDark ? '#FCA5A5' : '#F87171' },
                  ]}
                  numberOfLines={1}
                >
                  {modoOffline
                    ? `Cerrado por ${tienda.cerradoPor ?? 'administrador'} — toca para reactivar`
                    : 'Toca para cerrar el acceso de auditores'}
                </Text>
              </View>
              <View
                style={[
                  s.actionArrow,
                  { backgroundColor: tc.btnBg },
                  modoOffline && { backgroundColor: tc.isDark ? '#4C1010' : '#FEE2E2' },
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={modoOffline ? (tc.isDark ? '#F87171' : '#DC2626') : tc.chevron}
                />
              </View>
            </TouchableOpacity>
          </>
        )}

        {esAdmin && onReiniciar && (
          <>
            <SecHeader title="Zona de peligro" />
            <TouchableOpacity
              style={[s.dangerCard, { backgroundColor: tc.danger, borderColor: tc.isDark ? '#7F1D1D' : '#FECACA' }]}
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
              <View style={[s.actionArrow, { backgroundColor: tc.btnBg }]}>
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
  header:       { padding: 22, paddingTop: 54, paddingBottom: 26, overflow: 'hidden' },
  headerTop:    { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tiendaTag:    { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 1.5 },
  tiendaNombre: { fontSize: 22, fontWeight: '900', color: '#fff' },

  progCard: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius:    18,
    padding:         16,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.12)',
  },
  progTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  liveChip: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              6,
    backgroundColor:  'rgba(74,222,128,0.16)',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:     20,
    borderWidth:      1,
    borderColor:      'rgba(74,222,128,0.28)',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveTxt: { fontSize: 10, color: 'rgba(255,255,255,0.88)', fontWeight: '700', letterSpacing: 1 },
  progPct: { fontSize: 26, fontWeight: '900' },
  progBg:  { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progFill:{ height: '100%', borderRadius: 4 },
  progSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  statsGrid:     { paddingTop: 14, paddingBottom: 22, gap: 10 },
  statsRow:      { flexDirection: 'row', gap: 10 },
  statCard:      {
    flex: 1, borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  statCardWide: {
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  statCardInner: { padding: 16, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  statAccent:    { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  statN:         { fontSize: 28, fontWeight: '900', marginBottom: 3, marginTop: 4 },
  statLbl:       { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  statHint:      { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 4 },

  actionCard:  {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  actionIcon:  { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  actionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3, flexShrink: 1 },
  actionSub:   { fontSize: 12, flexShrink: 1 },
  actionArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  badgeChip:   { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, marginRight: 8 },
  badgeTxt:    { color: '#fff', fontSize: 12, fontWeight: '800' },

  dangerCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1 },
  dangerIcon:  { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  dangerTitle: { fontSize: 15, fontWeight: '800', color: '#DC2626', marginBottom: 3 },
  dangerSub:   { fontSize: 12, color: '#F87171' },

  audRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  audNombre: { fontSize: 14, fontWeight: '700' },
  audSub:    { fontSize: 12, marginTop: 2 },
});
