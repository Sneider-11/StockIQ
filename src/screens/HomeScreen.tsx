import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Usuario, Registro, Tienda } from '../constants/data';
import { Avatar, SecHeader, RolBadge } from '../components/common';
import { PRP, BLK, DRK, LGR, BRD, MTD } from '../constants/colors';

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
  const equipo     = usuarios.filter(u => u.rol !== 'SUPERADMIN');
  const admins     = equipo.filter(u => u.rol === 'ADMIN');
  const contadores = equipo.filter(u => u.rol === 'CONTADOR');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: LGR }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header oscuro */}
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

      </View>

      {/* Cuerpo */}
      <View style={s.body}>
        <SecHeader title="Espacios de inventario" />

        {tiendas.map(t => {
          const asignados = equipo.filter(u => u.tiendas.includes(t.id));
          return (
            <TouchableOpacity key={t.id} style={s.tiendaCard} onPress={() => onNavTienda(t)} activeOpacity={0.88}>
              <View style={[s.tiendaIcon, { backgroundColor: t.color }]}>
                <Ionicons name={t.icono} size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.tiendaNombre} numberOfLines={1}>{t.nombre}</Text>
                <Text style={s.tiendaSub} numberOfLines={1}>
                  {asignados.length === 0
                    ? 'Sin personal asignado'
                    : asignados.map(u => u.nombre.split(' ')[0]).join(', ')}
                </Text>
              </View>
              <View style={s.chevronWrap}>
                <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
              </View>
            </TouchableOpacity>
          );
        })}

        <SecHeader title="Administración" />

        <TouchableOpacity style={s.tiendaCard} onPress={onNavEquipo} activeOpacity={0.88}>
          <View style={[s.tiendaIcon, { backgroundColor: PRP }]}>
            <Ionicons name="people" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.tiendaNombre}>Gestión de equipo</Text>
            <Text style={s.tiendaSub} numberOfLines={1}>
              {admins.length} admin{admins.length !== 1 ? 's' : ''} · {contadores.length} contador{contadores.length !== 1 ? 'es' : ''}
            </Text>
          </View>
          <View style={s.chevronWrap}>
            <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.tiendaCard} onPress={onNavTiendas} activeOpacity={0.88}>
          <View style={[s.tiendaIcon, { backgroundColor: '#0369A1' }]}>
            <Ionicons name="storefront" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.tiendaNombre}>Gestión de tiendas</Text>
            <Text style={s.tiendaSub} numberOfLines={1}>
              Crear, editar y configurar tiendas
            </Text>
          </View>
          <View style={s.chevronWrap}>
            <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
          </View>
        </TouchableOpacity>

        {equipo.length > 0 && (
          <>
            <SecHeader title="Equipo activo" />
            {equipo.filter(u => u.activo !== false).map(u => (
              <View key={u.id} style={s.audRow}>
                <Avatar nombre={u.nombre} size={40} bg={DRK} fotoUri={u.fotoUri} />
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <Text style={s.audNombre} numberOfLines={1}>{u.nombre}</Text>
                  <Text style={s.audTiendas} numberOfLines={1}>
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
  const misTiendas    = tiendas.filter(t => usuario.tiendas.includes(t.id));
  const misContadores = usuarios.filter(u =>
    u.rol === 'CONTADOR' &&
    u.tiendas.some(tid => usuario.tiendas.includes(tid))
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: LGR }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
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

      </View>

      <View style={s.body}>
        <SecHeader title="Mis tiendas" />
        {misTiendas.map(t => (
          <TouchableOpacity key={t.id} style={s.tiendaCard} onPress={() => onNavTienda(t)} activeOpacity={0.88}>
            <View style={[s.tiendaIcon, { backgroundColor: t.color }]}>
              <Ionicons name={t.icono} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.tiendaNombre} numberOfLines={1}>{t.nombre}</Text>
              <Text style={s.tiendaSub} numberOfLines={1}>
                Toca para gestionar y escanear
              </Text>
            </View>
            <View style={s.chevronWrap}>
              <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
            </View>
          </TouchableOpacity>
        ))}

        {misContadores.length > 0 && (
          <>
            <SecHeader title="Contadores activos" />
            {misContadores.filter(u => u.activo !== false).map(u => (
              <View key={u.id} style={s.audRow}>
                <Avatar nombre={u.nombre} size={40} bg={DRK} fotoUri={u.fotoUri} />
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <Text style={s.audNombre} numberOfLines={1}>{u.nombre}</Text>
                  <Text style={s.audTiendas} numberOfLines={1}>
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
  const misTiendas = tiendas.filter(t => usuario.tiendas.includes(t.id));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: LGR }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header verde oscuro */}
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

      </View>

      <View style={s.body}>
        <SecHeader title="Mis espacios de inventario" />
        {misTiendas.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 32 }}>
            <Ionicons name="storefront-outline" size={36} color="#A1A1AA" />
            <Text style={{ fontSize: 13, color: MTD, marginTop: 10 }}>
              No tienes tiendas asignadas aún.
            </Text>
          </View>
        )}
        {misTiendas.map(t => (
          <TouchableOpacity key={t.id} style={s.tiendaCard} onPress={() => onNavTienda(t)} activeOpacity={0.88}>
            <View style={[s.tiendaIcon, { backgroundColor: t.color }]}>
              <Ionicons name={t.icono} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.tiendaNombre} numberOfLines={1}>{t.nombre}</Text>
              <Text style={s.tiendaSub} numberOfLines={1}>
                Toca para escanear artículos
              </Text>
            </View>
            <View style={s.chevronWrap}>
              <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

// ─── ESTILOS COMPARTIDOS ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:      { backgroundColor: BLK, padding: 20, paddingTop: 54, paddingBottom: 20 },
  headerTop:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 0 },
  adminTag:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5, marginBottom: 4 },
  nombre:      { fontSize: 22, fontWeight: '900', color: '#fff', flexShrink: 1 },
  logoutBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  statsRow:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statBox:     { flex: 1, alignItems: 'center' },
  statDiv:     { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  statN:       { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 2 },
  statL:       { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textAlign: 'center' },

  body:        { paddingHorizontal: 16 },

  tiendaCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tiendaIcon:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  tiendaNombre:{ fontSize: 15, fontWeight: '700', color: BLK, marginBottom: 3 },
  tiendaSub:   { fontSize: 12, color: MTD },
  chevronWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  audRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BRD },
  audNombre:   { fontSize: 13, fontWeight: '700', color: BLK, marginBottom: 2 },
  audTiendas:  { fontSize: 11, color: MTD },
});
