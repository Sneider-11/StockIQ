import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Usuario, Registro, Tienda } from '../constants/data';
import { Avatar, SecHeader, RolBadge } from '../components/common';
import { PRP, BLK, DRK, LGR, BRD, MTD } from '../constants/colors';
import { useThemeColors } from '../hooks/useThemeColors';

// ── PressCard: wrapper con spring scale al presionar ──────────────────────────
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

// ── Glass pills que van en el header ─────────────────────────────────────────
const HeaderPills: React.FC<{ items: { icon: string; label: string }[] }> = ({ items }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
    {items.map((it, i) => (
      <View key={i} style={sh.pill}>
        <Ionicons name={it.icon as any} size={13} color="rgba(255,255,255,0.75)" />
        <Text style={sh.pillTxt} numberOfLines={1}>{it.label}</Text>
      </View>
    ))}
  </View>
);

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
    Animated.stagger(60, cardAnims.map(a =>
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
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.adminTag}>SUPER ADMINISTRADOR</Text>
            <Text style={s.nombre} numberOfLines={1}>
              {usuario.nombre.split(' ')[0]}{usuario.nombre.split(' ')[1] ? ` ${usuario.nombre.split(' ')[1]}` : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
            <TouchableOpacity onPress={onNavPerfil} style={s.logoutBtn}>
              <Ionicons name="person-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={s.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        </View>
        <HeaderPills items={[
          { icon: 'storefront-outline', label: `${tiendas.length} tiendas`    },
          { icon: 'people-outline',     label: `${admins.length} admins`      },
          { icon: 'person-outline',     label: `${contadores.length} contadores` },
          { icon: 'calendar-outline',   label: fecha                           },
        ]} />
      </View>

      <View style={s.body}>
        <SecHeader title="Espacios de inventario" />
        {tiendas.map((t, idx) => {
          const asignados = equipo.filter(u => u.tiendas.includes(t.id));
          const anim      = cardAnims[idx] ?? new Animated.Value(1);
          return (
            <Animated.View key={t.id} style={{
              opacity:   anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
            }}>
              <PressCard onPress={() => onNavTienda(t)} style={{ marginBottom: 10 }}>
                <View style={[s.tiendaCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
                  <View style={[s.tiendaAccent, { backgroundColor: t.color }]} />
                  <View style={[s.tiendaIcon, { backgroundColor: t.color }]}>
                    <Ionicons name={t.icono} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.tiendaNombre, { color: tc.text }]} numberOfLines={1}>{t.nombre}</Text>
                    <Text style={[s.tiendaSub, { color: tc.muted }]} numberOfLines={1}>
                      {asignados.length === 0
                        ? 'Sin personal asignado'
                        : asignados.map(u => u.nombre.split(' ')[0]).join(', ')}
                    </Text>
                  </View>
                  <View style={[s.chevronWrap, { backgroundColor: tc.btnBg }]}>
                    <Ionicons name="chevron-forward" size={16} color={tc.chevron} />
                  </View>
                </View>
              </PressCard>
            </Animated.View>
          );
        })}

        <SecHeader title="Administración" />
        <PressCard onPress={onNavEquipo} style={{ marginBottom: 10 }}>
          <View style={[s.tiendaCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <View style={[s.tiendaAccent, { backgroundColor: PRP }]} />
            <View style={[s.tiendaIcon, { backgroundColor: PRP }]}>
              <Ionicons name="people" size={20} color="#fff" />
            </View>
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
          <View style={[s.tiendaCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <View style={[s.tiendaAccent, { backgroundColor: '#0369A1' }]} />
            <View style={[s.tiendaIcon, { backgroundColor: '#0369A1' }]}>
              <Ionicons name="storefront" size={20} color="#fff" />
            </View>
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
                <Avatar nombre={u.nombre} size={40} bg={DRK} fotoUri={u.fotoUri} />
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
    Animated.stagger(60, cardAnims.map(a =>
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
      <View style={[s.header, { backgroundColor: '#0369A1' }]}>
        <View style={s.headerTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.adminTag}>ADMIN DE TIENDA</Text>
            <Text style={s.nombre} numberOfLines={1}>
              Hola, {usuario.nombre.split(' ')[0]} 👋
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
            <TouchableOpacity onPress={onNavPerfil} style={s.logoutBtn}>
              <Ionicons name="person-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={s.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>
        <HeaderPills items={[
          { icon: 'storefront-outline', label: `${misTiendas.length} tiendas`     },
          { icon: 'person-outline',     label: `${misContadores.length} contadores` },
          { icon: 'calendar-outline',   label: fecha                                },
        ]} />
      </View>

      <View style={s.body}>
        <SecHeader title="Mis tiendas" />
        {misTiendas.map((t, idx) => {
          const anim = cardAnims[idx] ?? new Animated.Value(1);
          return (
            <Animated.View key={t.id} style={{
              opacity:   anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
            }}>
              <PressCard onPress={() => onNavTienda(t)} style={{ marginBottom: 10 }}>
                <View style={[s.tiendaCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
                  <View style={[s.tiendaAccent, { backgroundColor: t.color }]} />
                  <View style={[s.tiendaIcon, { backgroundColor: t.color }]}>
                    <Ionicons name={t.icono} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.tiendaNombre, { color: tc.text }]} numberOfLines={1}>{t.nombre}</Text>
                    <Text style={[s.tiendaSub, { color: tc.muted }]} numberOfLines={1}>
                      Toca para gestionar y escanear
                    </Text>
                  </View>
                  <View style={[s.chevronWrap, { backgroundColor: tc.btnBg }]}>
                    <Ionicons name="chevron-forward" size={16} color={tc.chevron} />
                  </View>
                </View>
              </PressCard>
            </Animated.View>
          );
        })}

        {misContadores.length > 0 && (
          <>
            <SecHeader title="Contadores activos" />
            {misContadores.filter(u => u.activo !== false).map(u => (
              <View key={u.id} style={[s.audRow, { backgroundColor: tc.card, borderColor: tc.border }]}>
                <Avatar nombre={u.nombre} size={40} bg={DRK} fotoUri={u.fotoUri} />
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
    Animated.stagger(60, cardAnims.map(a =>
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
      <View style={[s.header, { backgroundColor: '#047857' }]}>
        <View style={s.headerTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.adminTag}>CONTADOR</Text>
            <Text style={s.nombre} numberOfLines={1}>
              Hola, {usuario.nombre.split(' ')[0]} 👋
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
            <TouchableOpacity onPress={onNavPerfil} style={s.logoutBtn}>
              <Ionicons name="person-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={s.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>
        <HeaderPills items={[
          { icon: 'storefront-outline', label: `${misTiendas.length} tiendas asignadas` },
          { icon: 'calendar-outline',   label: fecha                                      },
        ]} />
      </View>

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
          const anim = cardAnims[idx] ?? new Animated.Value(1);
          return (
            <Animated.View key={t.id} style={{
              opacity:   anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
            }}>
              <PressCard onPress={() => onNavTienda(t)} style={{ marginBottom: 10 }}>
                <View style={[s.tiendaCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
                  <View style={[s.tiendaAccent, { backgroundColor: t.color }]} />
                  <View style={[s.tiendaIcon, { backgroundColor: t.color }]}>
                    <Ionicons name={t.icono} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.tiendaNombre, { color: tc.text }]} numberOfLines={1}>{t.nombre}</Text>
                    <Text style={[s.tiendaSub, { color: tc.muted }]} numberOfLines={1}>
                      Toca para escanear artículos
                    </Text>
                  </View>
                  <View style={[s.chevronWrap, { backgroundColor: tc.btnBg }]}>
                    <Ionicons name="chevron-forward" size={16} color={tc.chevron} />
                  </View>
                </View>
              </PressCard>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
};

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:      { backgroundColor: BLK, padding: 20, paddingTop: 54, paddingBottom: 22 },
  headerTop:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  adminTag:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5, marginBottom: 4 },
  nombre:      { fontSize: 22, fontWeight: '900', color: '#fff', flexShrink: 1 },
  logoutBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  body:        { paddingHorizontal: 16 },

  tiendaCard:  {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  tiendaAccent:{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  tiendaIcon:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14, marginLeft: 8, flexShrink: 0 },
  tiendaNombre:{ fontSize: 15, fontWeight: '700', marginBottom: 3 },
  tiendaSub:   { fontSize: 12 },
  chevronWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  audRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1 },
  audNombre:   { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  audTiendas:  { fontSize: 11 },
});

// Glass pill styles (shared by HeaderPills)
const sh = StyleSheet.create({
  pill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius:    20,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.18)',
  },
  pillTxt: {
    fontSize:   11,
    fontWeight: '600',
    color:      'rgba(255,255,255,0.88)',
  },
});
