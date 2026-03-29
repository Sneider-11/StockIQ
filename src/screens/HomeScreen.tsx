import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Usuario, Registro, Tienda, TIENDAS } from '../constants/data';
import { Avatar, SecHeader, RolBadge } from '../components/common';
import { PRP, BLK, DRK, LGR, BRD, MTD } from '../constants/colors';

// ─── HOME SUPERADMIN ──────────────────────────────────────────────────────────
interface SuperAdminProps {
  usuario: Usuario;
  usuarios: Usuario[];
  registros: Registro[];
  onLogout: () => void;
  onNavTienda: (t: Tienda) => void;
  onNavEquipo: () => void;
  onNavPerfil: () => void;
}

export const HomeSuperAdminScreen: React.FC<SuperAdminProps> = ({
  usuario, usuarios, registros, onLogout, onNavTienda, onNavEquipo, onNavPerfil,
}) => {
  const auditores     = usuarios.filter(u => u.rol !== 'SUPERADMIN');
  const totalEscaneos = registros.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: LGR }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header oscuro */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.adminTag}>SUPER ADMINISTRADOR</Text>
            <Text style={s.nombre}>{usuario.nombre.split(' ')[0]} {usuario.nombre.split(' ')[1] ?? ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={onNavPerfil} style={s.logoutBtn}>
              <Ionicons name="person-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={s.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statN}>{auditores.length}</Text>
            <Text style={s.statL}>Auditores</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.statBox}>
            <Text style={s.statN}>{TIENDAS.length}</Text>
            <Text style={s.statL}>Tiendas</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.statBox}>
            <Text style={s.statN}>{totalEscaneos}</Text>
            <Text style={s.statL}>Escaneos</Text>
          </View>
        </View>
      </View>

      {/* Cuerpo */}
      <View style={s.body}>
        <SecHeader title="Espacios de inventario" />

        {TIENDAS.map(t => {
          const asignados = auditores.filter(u => u.tiendas.includes(t.id));
          return (
            <TouchableOpacity key={t.id} style={s.tiendaCard} onPress={() => onNavTienda(t)} activeOpacity={0.88}>
              <View style={[s.tiendaIcon, { backgroundColor: t.color }]}>
                <Ionicons name={t.icono} size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tiendaNombre}>{t.nombre}</Text>
                <Text style={s.tiendaSub}>
                  {t.id === 'general'
                    ? `${auditores.length} auditores con acceso`
                    : asignados.length === 0
                      ? 'Sin auditores asignados'
                      : asignados.map(u => u.nombre.split(' ')[0]).join(', ')}
                  {registros.filter(r => r.tiendaId === t.id).length > 0 &&
                    ` · ${registros.filter(r => r.tiendaId === t.id).length} escaneos`}
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
          <View style={{ flex: 1 }}>
            <Text style={s.tiendaNombre}>Gestión de equipo</Text>
            <Text style={s.tiendaSub}>Registrar, editar y asignar auditores</Text>
          </View>
          <View style={s.chevronWrap}>
            <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
          </View>
        </TouchableOpacity>

        {auditores.length > 0 && (
          <>
            <SecHeader title="Equipo activo" />
            {auditores.map(u => (
              <View key={u.id} style={s.audRow}>
                <Avatar nombre={u.nombre} size={40} bg={DRK} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.audNombre}>{u.nombre}</Text>
                  <Text style={s.audTiendas}>
                    {TIENDAS.filter(t => u.tiendas.includes(t.id)).map(t => t.nombre.replace('Tienda ', '').replace('Inventario ', '')).join(' · ')}
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

// ─── HOME AUDITOR ─────────────────────────────────────────────────────────────
interface AuditorProps {
  usuario: Usuario;
  registros: Registro[];
  onLogout: () => void;
  onNavTienda: (t: Tienda) => void;
  onNavPerfil: () => void;
}

export const HomeAuditorScreen: React.FC<AuditorProps> = ({ usuario, registros, onLogout, onNavTienda, onNavPerfil }) => {
  const mistiendas = TIENDAS.filter(t => usuario.tiendas.includes(t.id));
  const misEscaneos = registros.filter(r => r.usuarioNombre === usuario.nombre).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: LGR }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header púrpura */}
      <View style={[s.header, { backgroundColor: PRP }]}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[s.adminTag, { color: 'rgba(255,255,255,0.65)' }]}>AUDITOR</Text>
            <Text style={s.nombre}>Hola, {usuario.nombre.split(' ')[0]} 👋</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={onNavPerfil} style={s.logoutBtn}>
              <Ionicons name="person-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={s.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statN}>{mistiendas.length}</Text>
            <Text style={s.statL}>Tiendas</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.statBox}>
            <Text style={s.statN}>{misEscaneos}</Text>
            <Text style={s.statL}>Escaneos</Text>
          </View>
        </View>
      </View>

      <View style={s.body}>
        <SecHeader title="Tus espacios de inventario" />
        {mistiendas.map(t => (
          <TouchableOpacity key={t.id} style={s.tiendaCard} onPress={() => onNavTienda(t)} activeOpacity={0.88}>
            <View style={[s.tiendaIcon, { backgroundColor: t.color }]}>
              <Ionicons name={t.icono} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.tiendaNombre}>{t.nombre}</Text>
              <Text style={s.tiendaSub}>
                {registros.filter(r => r.tiendaId === t.id && r.usuarioNombre === usuario.nombre).length} escaneos tuyos
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

const s = StyleSheet.create({
  header:      { backgroundColor: BLK, padding: 20, paddingTop: 54, paddingBottom: 24 },
  headerTop:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  adminTag:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5, marginBottom: 4 },
  nombre:      { fontSize: 22, fontWeight: '900', color: '#fff' },
  logoutBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  statsRow:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statBox:     { flex: 1, alignItems: 'center' },
  statDiv:     { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  statN:       { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 2 },
  statL:       { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  body:        { paddingHorizontal: 16 },

  tiendaCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tiendaIcon:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  tiendaNombre:{ fontSize: 15, fontWeight: '700', color: BLK, marginBottom: 3 },
  tiendaSub:   { fontSize: 12, color: MTD },
  chevronWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center' },

  audRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BRD },
  audNombre:   { fontSize: 13, fontWeight: '700', color: BLK, marginBottom: 2 },
  audTiendas:  { fontSize: 11, color: MTD },
});
