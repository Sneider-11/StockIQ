/**
 * HomeScreen.tsx — Dark Space Edition 2026
 * - Headers con LinearGradient por rol (purple / indigo / teal)
 * - Tarjetas de tienda con acento luminoso y sombra de color
 * - Animación de entrada stagger con translateY
 * - Filas de equipo con avatar de contraste
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Usuario, Registro, Tienda } from '../constants/data';
import { Avatar, SecHeader, RolBadge } from '../components/common';
import { PRP, IND } from '../constants/colors';
import { useThemeColors } from '../hooks/useThemeColors';
import { primerNombre } from '../utils/helpers';

// ── PressCard: spring scale al presionar ──────────────────────────────────────
const PressCard: React.FC<{
  children: React.ReactNode;
  onPress:  () => void;
  style?:   object;
}> = ({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const cfg   = { tension: 280, friction: 10, useNativeDriver: true } as const;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn ={() => Animated.spring(scale, { toValue: 0.955, ...cfg }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,     ...cfg }).start()}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Pills de glass para el header ─────────────────────────────────────────────
const HeaderPills: React.FC<{ items: { icon: string; label: string }[] }> = ({ items }) => {
  const tc = useThemeColors();
  const iconColor = tc.isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)';
  const textColor = tc.isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.65)';
  const pillBg    = tc.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';
  const pillBorder = tc.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)';
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
      {items.map((it, i) => (
        <View key={i} style={[sh.pill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
          <Ionicons name={it.icon as any} size={13} color={iconColor} />
          <Text style={[sh.pillTxt, { color: textColor }]} numberOfLines={1}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
};

// ── Tarjeta de tienda con glow de color ───────────────────────────────────────
const TiendaCard: React.FC<{
  tienda:    Tienda;
  sub:       string;
  onPress:   () => void;
  anim:      Animated.Value;
  index:     number;
}> = ({ tienda, sub, onPress, anim, index }) => {
  const tc = useThemeColors();
  return (
    <Animated.View style={{
      opacity:   anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
      marginBottom: 10,
    }}>
      <PressCard onPress={onPress}>
        <View style={[s.tiendaCard, {
          backgroundColor: tc.card,
          borderColor:     tc.border,
          shadowColor:     tienda.color,
          shadowOpacity:   tc.isDark ? 0.20 : 0.08,
          shadowRadius:    12,
          elevation:       4,
        }]}>
          {/* Acento de color izquierdo */}
          <View style={[s.tiendaAccent, { backgroundColor: tienda.color }]} />

          {/* Ícono con gradiente del color de la tienda */}
          <LinearGradient
            colors={[tienda.color + 'EE', tienda.color + 'AA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.tiendaIcon}
          >
            <Ionicons name={tienda.icono} size={20} color="#fff" />
          </LinearGradient>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.tiendaNombre, { color: tc.text }]} numberOfLines={1}>{tienda.nombre}</Text>
            <Text style={[s.tiendaSub, { color: tc.muted }]} numberOfLines={1}>{sub}</Text>
          </View>
          <View style={[s.chevronWrap, { backgroundColor: tc.btnBg }]}>
            <Ionicons name="chevron-forward" size={16} color={tc.chevron} />
          </View>
        </View>
      </PressCard>
    </Animated.View>
  );
};

// ─── HOME SUPERADMIN ──────────────────────────────────────────────────────────
interface SuperAdminProps {
  usuario:      Usuario;
  usuarios:     Usuario[];
  tiendas:      Tienda[];
  registros:    Registro[];
  onLogout:     () => void;
  onNavTienda:  (t: Tienda) => void;
  onNavEquipo:  () => void;
  onNavTiendas: () => void;
  onNavPerfil:  () => void;
}

export const HomeSuperAdminScreen: React.FC<SuperAdminProps> = ({
  usuario, usuarios, tiendas, onLogout, onNavTienda, onNavEquipo, onNavTiendas, onNavPerfil,
}) => {
  const tc         = useThemeColors();
  const equipo     = usuarios.filter(u => u.rol !== 'SUPERADMIN');
  const admins     = equipo.filter(u => u.rol === 'ADMIN');
  const contadores = equipo.filter(u => u.rol === 'CONTADOR');

  const cardAnims = useRef(tiendas.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(65, cardAnims.map(a =>
      Animated.spring(a, { toValue: 1, tension: 75, friction: 11, useNativeDriver: true })
    )).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tc.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={tc.isDark ? ['#10071E', '#080510', '#030305'] : ['#EDE9FE', '#F4F0FF', '#F8F6FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.adminTag, { color: tc.isDark ? 'rgba(167,139,250,0.65)' : 'rgba(109,40,217,0.60)' }]}>
              SUPER ADMINISTRADOR
            </Text>
            <Text style={[s.nombre, { color: tc.isDark ? '#fff' : '#1C0A3B' }]} numberOfLines={1}>
              {usuario.nombre.split(' ').filter(w => w.length > 0).slice(0, 2).join(' ')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
            <TouchableOpacity onPress={onNavPerfil} style={s.headerBtn}>
              <Ionicons name="person-circle-outline" size={20} color={tc.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(88,28,200,0.7)'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={s.headerBtn}>
              <Ionicons name="log-out-outline" size={20} color={tc.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(88,28,200,0.45)'} />
            </TouchableOpacity>
          </View>
        </View>
        <HeaderPills items={[
          { icon: 'storefront-outline', label: `${tiendas.length} tiendas`       },
          { icon: 'people-outline',     label: `${admins.length} admins`         },
          { icon: 'person-outline',     label: `${contadores.length} contadores` },
          { icon: 'calendar-outline',   label: fecha                              },
        ]} />
      </LinearGradient>

      <View style={s.body}>
        <SecHeader title="Espacios de inventario" />
        {tiendas.map((t, idx) => {
          const asignados = equipo.filter(u => u.tiendas.includes(t.id));
          const anim      = cardAnims[idx] ?? cardAnims[cardAnims.length - 1];
          return (
            <TiendaCard
              key={t.id}
              tienda={t}
              sub={asignados.length === 0
                ? 'Sin personal asignado'
                : asignados.map(u => primerNombre(u.nombre)).join(', ')}
              onPress={() => onNavTienda(t)}
              anim={anim}
              index={idx}
            />
          );
        })}

        <SecHeader title="Administración" />
        <PressCard onPress={onNavEquipo} style={{ marginBottom: 10 }}>
          <View style={[s.tiendaCard, { backgroundColor: tc.card, borderColor: tc.border, shadowColor: PRP, shadowOpacity: tc.isDark ? 0.18 : 0.06, shadowRadius: 12, elevation: 4 }]}>
            <View style={[s.tiendaAccent, { backgroundColor: PRP }]} />
            <LinearGradient
              colors={[PRP + 'EE', IND + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.tiendaIcon}
            >
              <Ionicons name="people" size={20} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.tiendaNombre, { color: tc.text }]}>Gestión de equipo</Text>
              <Text style={[s.tiendaSub, { color: tc.muted }]} numberOfLines={1}>
                {admins.length} admin{admins.length !== 1 ? 's' : ''} · {contadores.length} contador{contadores.length !== 1 ? 'es' : ''}
              </Text>
            </View>
            <View style={[s.chevronWrap, { backgroundColor: tc.btnBg }]}>
              <Ionicons name="chevron-forward" size={16} color={tc.chevron} />
            </View>
          </View>
        </PressCard>

        <PressCard onPress={onNavTiendas} style={{ marginBottom: 10 }}>
          <View style={[s.tiendaCard, { backgroundColor: tc.card, borderColor: tc.border, shadowColor: '#0369A1', shadowOpacity: tc.isDark ? 0.18 : 0.06, shadowRadius: 12, elevation: 4 }]}>
            <View style={[s.tiendaAccent, { backgroundColor: '#0369A1' }]} />
            <LinearGradient
              colors={['#0369A1EE', '#075985CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.tiendaIcon}
            >
              <Ionicons name="storefront" size={20} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.tiendaNombre, { color: tc.text }]}>Gestión de tiendas</Text>
              <Text style={[s.tiendaSub, { color: tc.muted }]} numberOfLines={1}>
                Crear, editar y configurar tiendas
              </Text>
            </View>
            <View style={[s.chevronWrap, { backgroundColor: tc.btnBg }]}>
              <Ionicons name="chevron-forward" size={16} color={tc.chevron} />
            </View>
          </View>
        </PressCard>

        {equipo.length > 0 && (
          <>
            <SecHeader title="Equipo activo" />
            {equipo.filter(u => u.activo !== false).map(u => (
              <View key={u.id} style={[s.audRow, { backgroundColor: tc.card, borderColor: tc.border }]}>
                <Avatar nombre={u.nombre} size={40} bg={tc.isDark ? '#18181B' : '#E4E4E7'} fotoUri={u.fotoUri} />
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <Text style={[s.audNombre, { color: tc.text }]} numberOfLines={1}>{u.nombre}</Text>
                  <Text style={[s.audTiendas, { color: tc.muted }]} numberOfLines={1}>
                    {tiendas.filter(t => u.tiendas.includes(t.id)).map(t =>
                      t.nombre.replace('Tienda ', '').replace('Inventario ', '')
                    ).join(' · ') || 'Sin tiendas asignadas'}
                  </Text>
                </View>
                <RolBadge rol={u.rol} />
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
};

// ─── HOME ADMIN ───────────────────────────────────────────────────────────────
interface AdminProps {
  usuario:     Usuario;
  usuarios:    Usuario[];
  tiendas:     Tienda[];
  registros:   Registro[];
  onLogout:    () => void;
  onNavTienda: (t: Tienda) => void;
  onNavPerfil: () => void;
}

export const HomeAdminScreen: React.FC<AdminProps> = ({
  usuario, usuarios, tiendas, onLogout, onNavTienda, onNavPerfil,
}) => {
  const tc            = useThemeColors();
  const misTiendas    = tiendas.filter(t => usuario.tiendas.includes(t.id));
  const misContadores = usuarios.filter(u =>
    u.rol === 'CONTADOR' && u.tiendas.some(tid => usuario.tiendas.includes(tid))
  );

  const cardAnims = useRef(misTiendas.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(65, cardAnims.map(a =>
      Animated.spring(a, { toValue: 1, tension: 75, friction: 11, useNativeDriver: true })
    )).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tc.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={tc.isDark ? ['#040D1C', '#050A14', '#030305'] : ['#DBEAFE', '#EFF6FF', '#F8FAFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.adminTag, { color: tc.isDark ? 'rgba(147,197,253,0.65)' : 'rgba(3,105,161,0.60)' }]}>
              ADMIN DE TIENDA
            </Text>
            <Text style={[s.nombre, { color: tc.isDark ? '#fff' : '#0C2A42' }]} numberOfLines={1}>
              Hola, {primerNombre(usuario.nombre)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
            <TouchableOpacity onPress={onNavPerfil} style={s.headerBtn}>
              <Ionicons name="person-circle-outline" size={20} color={tc.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(3,105,161,0.7)'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={s.headerBtn}>
              <Ionicons name="log-out-outline" size={20} color={tc.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(3,105,161,0.45)'} />
            </TouchableOpacity>
          </View>
        </View>
        <HeaderPills items={[
          { icon: 'storefront-outline', label: `${misTiendas.length} tiendas`      },
          { icon: 'person-outline',     label: `${misContadores.length} contadores` },
          { icon: 'calendar-outline',   label: fecha                                 },
        ]} />
      </LinearGradient>

      <View style={s.body}>
        <SecHeader title="Mis tiendas" />
        {misTiendas.map((t, idx) => {
          const anim = cardAnims[idx] ?? cardAnims[cardAnims.length - 1];
          return (
            <TiendaCard
              key={t.id}
              tienda={t}
              sub="Toca para gestionar y escanear"
              onPress={() => onNavTienda(t)}
              anim={anim}
              index={idx}
            />
          );
        })}

        {misContadores.length > 0 && (
          <>
            <SecHeader title="Contadores activos" />
            {misContadores.filter(u => u.activo !== false).map(u => (
              <View key={u.id} style={[s.audRow, { backgroundColor: tc.card, borderColor: tc.border }]}>
                <Avatar nombre={u.nombre} size={40} bg={tc.isDark ? '#18181B' : '#E4E4E7'} fotoUri={u.fotoUri} />
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <Text style={[s.audNombre, { color: tc.text }]} numberOfLines={1}>{u.nombre}</Text>
                  <Text style={[s.audTiendas, { color: tc.muted }]} numberOfLines={1}>
                    {tiendas.filter(t => u.tiendas.includes(t.id) && usuario.tiendas.includes(t.id))
                      .map(t => t.nombre.replace('Tienda ', '').replace('Inventario ', ''))
                      .join(' · ') || 'Sin tiendas'}
                  </Text>
                </View>
                <RolBadge rol={u.rol} />
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
};

// ─── HOME CONTADOR ────────────────────────────────────────────────────────────
interface ContadorProps {
  usuario:     Usuario;
  tiendas:     Tienda[];
  registros:   Registro[];
  onLogout:    () => void;
  onNavTienda: (t: Tienda) => void;
  onNavPerfil: () => void;
}

export const HomeContadorScreen: React.FC<ContadorProps> = ({
  usuario, tiendas, onLogout, onNavTienda, onNavPerfil,
}) => {
  const tc         = useThemeColors();
  const misTiendas = tiendas.filter(t => usuario.tiendas.includes(t.id));

  const cardAnims = useRef(misTiendas.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(65, cardAnims.map(a =>
      Animated.spring(a, { toValue: 1, tension: 75, friction: 11, useNativeDriver: true })
    )).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tc.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={tc.isDark ? ['#041210', '#030D0A', '#030305'] : ['#D1FAE5', '#ECFDF5', '#F4FFF9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.adminTag, { color: tc.isDark ? 'rgba(110,231,183,0.65)' : 'rgba(4,120,87,0.60)' }]}>
              CONTADOR
            </Text>
            <Text style={[s.nombre, { color: tc.isDark ? '#fff' : '#063020' }]} numberOfLines={1}>
              Hola, {primerNombre(usuario.nombre)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
            <TouchableOpacity onPress={onNavPerfil} style={s.headerBtn}>
              <Ionicons name="person-circle-outline" size={20} color={tc.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(4,120,87,0.7)'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={s.headerBtn}>
              <Ionicons name="log-out-outline" size={20} color={tc.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(4,120,87,0.45)'} />
            </TouchableOpacity>
          </View>
        </View>
        <HeaderPills items={[
          { icon: 'storefront-outline', label: `${misTiendas.length} tiendas asignadas` },
          { icon: 'calendar-outline',   label: fecha                                      },
        ]} />
      </LinearGradient>

      <View style={s.body}>
        <SecHeader title="Mis espacios de inventario" />
        {misTiendas.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 32 }}>
            <Ionicons name="storefront-outline" size={36} color="#A1A1AA" />
            <Text style={{ fontSize: 13, color: tc.muted, marginTop: 10 }}>
              No tienes tiendas asignadas aún.
            </Text>
          </View>
        )}
        {misTiendas.map((t, idx) => {
          const anim = cardAnims[idx] ?? cardAnims[cardAnims.length - 1];
          return (
            <TiendaCard
              key={t.id}
              tienda={t}
              sub="Toca para escanear artículos"
              onPress={() => onNavTienda(t)}
              anim={anim}
              index={idx}
            />
          );
        })}
      </View>
    </ScrollView>
  );
};

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:    { padding: 20, paddingTop: 54, paddingBottom: 22 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  adminTag:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  nombre:    { fontSize: 22, fontWeight: '900', flexShrink: 1 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },

  body: { paddingHorizontal: 16 },

  tiendaCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
  },
  tiendaAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3,
    borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
  },
  tiendaIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, marginLeft: 8, flexShrink: 0,
  },
  tiendaNombre: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  tiendaSub:    { fontSize: 12 },
  chevronWrap:  { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  audRow:     { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1 },
  audNombre:  { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  audTiendas: { fontSize: 11 },
});

// Glass pill styles
const sh = StyleSheet.create({
  pill: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              6,
    backgroundColor:  'rgba(255,255,255,0.12)',
    borderRadius:     20,
    paddingVertical:  6,
    paddingHorizontal: 11,
    borderWidth:      1,
    borderColor:      'rgba(255,255,255,0.18)',
  },
  pillTxt: {
    fontSize:   11,
    fontWeight: '600',
    color:      'rgba(255,255,255,0.88)',
  },
});
