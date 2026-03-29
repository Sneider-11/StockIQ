import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Modal, Alert, ScrollView, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Usuario, Tienda, IoniconName, Rol } from '../constants/data';
import { Avatar, RolBadge } from '../components/common';
import { PRP, BLK, DRK, LGR, BRD, MTD, GRN } from '../constants/colors';

interface Props {
  usuarioActual: Usuario;
  usuarios:      Usuario[];
  tiendas:       Tienda[];
  onAgregar:     (u: Omit<Usuario, 'id'>) => void;
  onEditar:      (id: string, cambios: Partial<Omit<Usuario, 'id'>>) => void;
  onEliminar:    (id: string) => void;
  onVolver:      () => void;
}

export const GestionEquipoScreen: React.FC<Props> = ({
  usuarioActual, usuarios, tiendas, onAgregar, onEditar, onEliminar, onVolver,
}) => {
  const esSuperAdmin = usuarioActual.rol === 'SUPERADMIN';

  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId,   setEditandoId]   = useState<string | null>(null);
  const [nombre,     setNombre]     = useState('');
  const [cedula,     setCedula]     = useState('');
  const [telefono,   setTelefono]   = useState('');
  const [pass,       setPass]       = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [rolSel,     setRolSel]     = useState<'ADMIN' | 'CONTADOR'>('CONTADOR');
  const [tiendasSel, setTiendasSel] = useState<string[]>([]);
  const [activoSel,  setActivoSel]  = useState(true);
  const [error,      setError]      = useState('');

  // SUPERADMIN ve a todos (excepto él mismo), ADMIN ve solo los CONTADOR de sus tiendas
  const listaVisible = esSuperAdmin
    ? usuarios.filter(u => u.rol !== 'SUPERADMIN')
    : usuarios.filter(u =>
        u.rol === 'CONTADOR' &&
        u.tiendas.some(tid => usuarioActual.tiendas.includes(tid))
      );

  // Tiendas que puede asignar el ADMIN actual
  const tiendasDisponibles = esSuperAdmin
    ? tiendas
    : tiendas.filter(t => usuarioActual.tiendas.includes(t.id));

  const toggleTienda = (id: string) =>
    setTiendasSel(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  /* ── WhatsApp ── */
  const enviarWhatsApp = (u: Usuario) => {
    if (!u.telefono) {
      Alert.alert('Sin número', 'Este usuario no tiene número registrado. Edítalo para agregar su celular.');
      return;
    }
    const num = u.telefono.replace(/\D/g, '');
    const tel = num.startsWith('57') ? num : `57${num}`;
    const tiendasNombres = tiendas.filter(t => u.tiendas.includes(t.id)).map(t => t.nombre).join(', ');
    const rolLabel = u.rol === 'ADMIN' ? 'Admin de Tienda' : 'Contador';
    const msg =
      `Hola ${u.nombre.split(' ')[0]} 👋\n\n` +
      `Te registré en *StockIQ*, el sistema de auditoría de inventarios del Grupo Comercial.\n\n` +
      `📱 *Tus datos de acceso:*\n• Usuario: ${u.cedula}\n• Contraseña: ${u.pass}\n• Cargo: ${rolLabel}\n\n` +
      `🏪 *Tiendas asignadas:*\n${tiendasNombres}\n\n` +
      `Ingresa con tu cédula y contraseña. ¡Cualquier duda me avisas!`;
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'No se pudo abrir WhatsApp. Verifica que esté instalado.'),
    );
  };

  /* ── Abrir en modo edición ── */
  const abrirEdicion = (u: Usuario) => {
    setEditandoId(u.id);
    setNombre(u.nombre);
    setCedula(u.cedula);
    setTelefono(u.telefono ?? '');
    setPass(u.pass);
    setRolSel(u.rol === 'ADMIN' ? 'ADMIN' : 'CONTADOR');
    setTiendasSel([...u.tiendas]);
    setActivoSel(u.activo !== false);
    setError('');
    setModalVisible(true);
  };

  /* ── Validación de teléfono colombiano (opcional) ── */
  const telefonoValido = (tel: string): boolean => {
    if (!tel.trim()) return true;
    const solo = tel.replace(/\D/g, '');
    return solo.length === 10 && solo.startsWith('3');
  };

  /* ── Agregar ── */
  const handleAgregar = () => {
    setError('');
    if (!nombre.trim())            { setError('Ingresa el nombre completo.'); return; }
    if (!cedula.trim())            { setError('Ingresa el número de cédula.'); return; }
    if (cedula.trim().length < 7)  { setError('La cédula debe tener al menos 7 dígitos.'); return; }
    if (!pass.trim())              { setError('Ingresa una contraseña inicial.'); return; }
    if (pass.trim().length < 6)    { setError('La contraseña debe tener mínimo 6 caracteres.'); return; }
    if (tiendasSel.length === 0)   { setError('Asigna al menos una tienda.'); return; }
    if (!telefonoValido(telefono)) { setError('Celular inválido. Debe tener 10 dígitos y empezar en 3.'); return; }
    if (usuarios.find(u => u.cedula === cedula.trim())) { setError('Ya existe un usuario con esa cédula.'); return; }

    onAgregar({
      cedula:    cedula.trim(),
      nombre:    nombre.trim().toUpperCase(),
      rol:       esSuperAdmin ? rolSel : 'CONTADOR',
      tiendas:   tiendasSel,
      pass:      pass.trim(),
      telefono:  telefono.trim() || undefined,
      activo:    true,
      creadoPor: esSuperAdmin ? undefined : usuarioActual.id,
    });
    limpiarYCerrar();
  };

  /* ── Guardar edición ── */
  const handleEditar = () => {
    setError('');
    if (!nombre.trim())            { setError('Ingresa el nombre completo.'); return; }
    if (!pass.trim())              { setError('Ingresa la contraseña.'); return; }
    if (pass.trim().length < 6)    { setError('La contraseña debe tener mínimo 6 caracteres.'); return; }
    if (tiendasSel.length === 0)   { setError('Asigna al menos una tienda.'); return; }
    if (!telefonoValido(telefono)) { setError('Celular inválido. Debe tener 10 dígitos y empezar en 3.'); return; }

    onEditar(editandoId!, {
      nombre:   nombre.trim().toUpperCase(),
      rol:      esSuperAdmin ? rolSel : undefined,
      tiendas:  tiendasSel,
      pass:     pass.trim(),
      telefono: telefono.trim() || undefined,
      activo:   activoSel,
    });
    limpiarYCerrar();
  };

  const limpiarYCerrar = () => {
    setModalVisible(false);
    setEditandoId(null);
    setNombre(''); setCedula(''); setTelefono(''); setPass('');
    setShowPass(false); setTiendasSel([]); setActivoSel(true);
    setRolSel('CONTADOR'); setError('');
  };

  const confirmarEliminar = (u: Usuario) =>
    Alert.alert('Eliminar usuario', `¿Deseas eliminar a ${u.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onEliminar(u.id) },
    ]);

  const toggleActivo = (u: Usuario) => {
    const nuevoEstado = u.activo === false ? true : false;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    Alert.alert(
      `${nuevoEstado ? 'Activar' : 'Desactivar'} usuario`,
      `¿Deseas ${accion} a ${u.nombre}? ${!nuevoEstado ? 'No podrá iniciar sesión mientras esté inactivo.' : ''}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: nuevoEstado ? 'Activar' : 'Desactivar', onPress: () => onEditar(u.id, { activo: nuevoEstado }) },
      ],
    );
  };

  /* ── Campos del formulario ── */
  type Campo = { label: string; icon: IoniconName; value: string; onChange: (t: string) => void; placeholder: string; capitalize: 'characters' | 'none'; keyboard: 'default' | 'numeric' | 'phone-pad'; secure: boolean; optional?: boolean };

  const campos: Campo[] = [
    { label: 'Nombre completo',    icon: 'person-outline',         value: nombre,   onChange: t => { setNombre(t);   setError(''); }, placeholder: 'Ej: PEDRO TARAZONA', capitalize: 'characters', keyboard: 'default',   secure: false },
    { label: 'Número de cédula',   icon: 'card-outline',           value: cedula,   onChange: t => { setCedula(t);   setError(''); }, placeholder: 'Será el usuario de inicio sesión', capitalize: 'none', keyboard: 'numeric', secure: false },
    { label: 'WhatsApp (celular)', icon: 'phone-portrait-outline', value: telefono, onChange: t => { setTelefono(t); setError(''); }, placeholder: 'Ej: 3001234567  (opcional)', capitalize: 'none', keyboard: 'phone-pad', secure: false, optional: true },
    { label: 'Contraseña inicial', icon: 'lock-closed-outline',    value: pass,     onChange: t => { setPass(t);     setError(''); }, placeholder: 'Mínimo 6 caracteres', capitalize: 'none', keyboard: 'default', secure: true  },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: LGR }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onVolver} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={BLK} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title}>{esSuperAdmin ? 'Gestión de equipo' : 'Mi equipo'}</Text>
          <Text style={s.sub} numberOfLines={1}>{listaVisible.length} usuarios en tu equipo</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="person-add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={listaVisible}
        keyExtractor={u => u.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="people-outline" size={36} color="#A1A1AA" />
            </View>
            <Text style={s.emptyTitle}>Sin usuarios aún</Text>
            <Text style={s.emptySub}>Toca el botón + para agregar el primer miembro del equipo.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="person-add" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.emptyBtnTxt}>Agregar {esSuperAdmin ? 'usuario' : 'contador'}</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: u }) => {
          const tiendasU    = tiendas.filter(t => u.tiendas.includes(t.id));
          const inactivo    = u.activo === false;
          return (
            <View style={[s.card, inactivo && { opacity: 0.6 }]}>
              <View style={s.cardTop}>
                <Avatar nombre={u.nombre} size={46} bg={inactivo ? '#A1A1AA' : DRK} />
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <Text style={s.cardNombre} numberOfLines={1}>{u.nombre}</Text>
                  <Text style={s.cardCed}>CC {u.cedula}</Text>
                  <View style={{ marginTop: 5, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <RolBadge rol={u.rol} />
                    {inactivo && (
                      <View style={s.inactivoBadge}>
                        <Text style={s.inactivoTxt}>INACTIVO</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
                  <TouchableOpacity onPress={() => abrirEdicion(u)} style={s.editBtn}>
                    <Ionicons name="pencil-outline" size={17} color={PRP} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmarEliminar(u)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={17} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={s.sectionLbl}>Tiendas asignadas</Text>
              <View style={s.tiendasRow}>
                {tiendasU.length === 0
                  ? <Text style={s.sinTiendas}>Sin tiendas asignadas</Text>
                  : tiendasU.map(t => (
                    <View key={t.id} style={[s.tiendaChip, { borderColor: t.color + '50', backgroundColor: t.color + '12' }]}>
                      <View style={[s.tiendaDot, { backgroundColor: t.color }]} />
                      <Text style={[s.tiendaChipTxt, { color: t.color }]} numberOfLines={1}>
                        {t.nombre.replace('Tienda ', '').replace('Inventario ', '')}
                      </Text>
                    </View>
                  ))
                }
              </View>

              <View style={s.credRow}>
                <Ionicons name="key-outline" size={12} color="#A1A1AA" style={{ marginRight: 5 }} />
                <Text style={s.credTxt} numberOfLines={1}>
                  Usuario: {u.cedula} · Pass: {'•'.repeat(Math.min(u.pass.length, 8))}
                </Text>
              </View>

              {u.telefono ? (
                <View style={[s.credRow, { marginTop: 4 }]}>
                  <Ionicons name="logo-whatsapp" size={12} color={GRN} style={{ marginRight: 5 }} />
                  <Text style={[s.credTxt, { color: '#15803D' }]} numberOfLines={1}>WhatsApp: {u.telefono}</Text>
                </View>
              ) : (
                <View style={[s.credRow, { marginTop: 4 }]}>
                  <Ionicons name="phone-portrait-outline" size={12} color="#A1A1AA" style={{ marginRight: 5 }} />
                  <Text style={s.credTxt}>Sin número de WhatsApp</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[s.waBtn, !u.telefono && { opacity: 0.45 }]}
                  onPress={() => enviarWhatsApp(u)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={15} color="#fff" />
                  <Text style={s.waBtnTxt}>Enviar credenciales</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, inactivo ? s.activarBtn : s.desactivarBtn]}
                  onPress={() => toggleActivo(u)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={inactivo ? 'checkmark-circle-outline' : 'pause-circle-outline'} size={15} color="#fff" />
                  <Text style={s.waBtnTxt}>{inactivo ? 'Activar' : 'Desactivar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Modal agregar/editar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editandoId ? 'Editar usuario' : `Nuevo ${esSuperAdmin ? 'usuario' : 'contador'}`}</Text>
              <TouchableOpacity onPress={limpiarYCerrar} style={s.modalClose}>
                <Ionicons name="close" size={18} color={MTD} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Selector de rol (solo SUPERADMIN y solo al crear) */}
              {esSuperAdmin && !editandoId && (
                <>
                  <Text style={s.fieldLabel}>Cargo / Rol</Text>
                  <View style={s.rolRow}>
                    {(['ADMIN', 'CONTADOR'] as const).map(r => {
                      const cfg = r === 'ADMIN'
                        ? { label: 'Admin de Tienda', desc: 'Gestiona equipo, ve resultados', icon: 'shield-checkmark-outline' as IoniconName, color: '#0369A1', bg: '#E0F2FE' }
                        : { label: 'Contador',         desc: 'Solo escanea y ve sus registros',  icon: 'scan-outline' as IoniconName,            color: '#374151', bg: '#F3F4F6' };
                      const sel = rolSel === r;
                      return (
                        <TouchableOpacity
                          key={r}
                          style={[s.rolCard, sel && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                          onPress={() => setRolSel(r)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={cfg.icon} size={20} color={sel ? cfg.color : MTD} style={{ marginBottom: 6 }} />
                          <Text style={[s.rolCardLabel, sel && { color: cfg.color, fontWeight: '800' }]}>{cfg.label}</Text>
                          <Text style={s.rolCardDesc} numberOfLines={2}>{cfg.desc}</Text>
                          {sel && <Ionicons name="checkmark-circle" size={18} color={cfg.color} style={{ marginTop: 6 }} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Campos del formulario */}
              {campos.map(f => {
                const bloqueado = editandoId !== null && f.label === 'Número de cédula';
                return (
                  <View key={f.label} style={{ marginBottom: 14 }}>
                    <View style={s.fieldLabelRow}>
                      <Text style={s.fieldLabel}>{f.label}</Text>
                      {f.optional && <Text style={s.optionalTag}>Opcional</Text>}
                      {bloqueado  && <Text style={s.optionalTag}>No editable</Text>}
                    </View>
                    <View style={[s.inputWrap, bloqueado && { opacity: 0.5 }]}>
                      <View style={s.inputIconWrap}>
                        <Ionicons name={f.icon} size={16} color={MTD} />
                      </View>
                      <TextInput
                        style={s.input}
                        placeholder={f.placeholder}
                        placeholderTextColor="#A1A1AA"
                        value={f.value}
                        onChangeText={f.onChange}
                        autoCapitalize={f.capitalize}
                        keyboardType={f.keyboard}
                        secureTextEntry={f.secure && !showPass}
                        editable={!bloqueado}
                      />
                      {f.secure && (
                        <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ paddingHorizontal: 14, height: 50, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={MTD} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Activo/Inactivo (solo al editar) */}
              {editandoId && (
                <TouchableOpacity
                  style={[s.activoRow, activoSel ? s.activoRowOn : s.activoRowOff]}
                  onPress={() => setActivoSel(!activoSel)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={activoSel ? 'checkmark-circle' : 'pause-circle'}
                    size={20}
                    color={activoSel ? '#15803D' : '#DC2626'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[s.activoTxt, { color: activoSel ? '#15803D' : '#DC2626' }]}>
                    {activoSel ? 'Usuario activo — puede iniciar sesión' : 'Usuario inactivo — no puede iniciar sesión'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Asignar tiendas */}
              <Text style={s.fieldLabel}>Asignar tiendas</Text>
              <Text style={s.fieldSub}>Selecciona una o más tiendas donde trabajará</Text>

              {tiendasDisponibles.map(t => {
                const sel = tiendasSel.includes(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.tiendaRow, sel && { borderColor: t.color, backgroundColor: t.color + '0D' }]}
                    onPress={() => toggleTienda(t.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.tiendaRowDot, { backgroundColor: t.color }]} />
                    <Text style={[s.tiendaRowTxt, sel && { color: t.color, fontWeight: '700' }]} numberOfLines={1}>{t.nombre}</Text>
                    {sel && <Ionicons name="checkmark-circle" size={20} color={t.color} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}

              {error ? (
                <View style={s.errorBox}>
                  <Ionicons name="warning" size={14} color="#DC2626" />
                  <Text style={s.errorTxt}> {error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={s.confirmBtn}
                onPress={editandoId ? handleEditar : handleAgregar}
                activeOpacity={0.88}
              >
                <Ionicons name={editandoId ? 'checkmark-circle' : 'person-add'} size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.confirmTxt}>{editandoId ? 'Guardar cambios' : 'Registrar usuario'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 54, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  title:         { fontSize: 18, fontWeight: '800', color: BLK },
  sub:           { fontSize: 12, color: MTD, marginTop: 2 },
  addBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: PRP, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  emptyWrap:     { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', borderWidth: 1, borderColor: BRD, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:    { fontSize: 17, fontWeight: '800', color: BLK, marginBottom: 8 },
  emptySub:      { fontSize: 13, color: MTD, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: PRP, borderRadius: 13, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnTxt:   { color: '#fff', fontWeight: '700', fontSize: 14 },

  card:          { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardNombre:    { fontSize: 14, fontWeight: '800', color: BLK, marginBottom: 2 },
  cardCed:       { fontSize: 12, color: MTD },
  editBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  deleteBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },

  inactivoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: '#FEF2F2' },
  inactivoTxt:   { fontSize: 10, fontWeight: '700', color: '#DC2626' },

  sectionLbl:    { fontSize: 10, fontWeight: '700', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  tiendasRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tiendaChip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, gap: 5, maxWidth: '48%' },
  tiendaDot:     { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  tiendaChipTxt: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  sinTiendas:    { fontSize: 11, color: MTD, fontStyle: 'italic' },

  credRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: LGR, borderRadius: 8, padding: 9, marginBottom: 2 },
  credTxt:       { fontSize: 11, color: MTD, flexShrink: 1 },

  waBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: GRN, borderRadius: 13, padding: 11, gap: 6 },
  toggleBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 13, padding: 11, gap: 6 },
  activarBtn:    { backgroundColor: '#15803D' },
  desactivarBtn: { backgroundColor: '#DC2626' },
  waBtnTxt:      { color: '#fff', fontWeight: '700', fontSize: 12 },

  /* Modal */
  modalBg:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 44, maxHeight: '95%' },
  modalHandle:   { width: 40, height: 4, backgroundColor: BRD, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle:    { fontSize: 19, fontWeight: '800', color: BLK },
  modalClose:    { width: 32, height: 32, borderRadius: 16, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center' },

  rolRow:        { flexDirection: 'row', gap: 10, marginBottom: 18 },
  rolCard:       { flex: 1, borderWidth: 1.5, borderColor: BRD, borderRadius: 16, padding: 14, alignItems: 'center' },
  rolCardLabel:  { fontSize: 13, fontWeight: '700', color: BLK, marginBottom: 4, textAlign: 'center' },
  rolCardDesc:   { fontSize: 11, color: MTD, textAlign: 'center', lineHeight: 15 },

  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  fieldLabel:    { fontSize: 11, fontWeight: '700', color: '#52525B', textTransform: 'uppercase', letterSpacing: 0.6 },
  optionalTag:   { fontSize: 10, fontWeight: '600', color: '#A1A1AA', backgroundColor: LGR, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  fieldSub:      { fontSize: 12, color: MTD, marginTop: -4, marginBottom: 10 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BRD, borderRadius: 13, backgroundColor: LGR, overflow: 'hidden' },
  inputIconWrap: { width: 44, alignItems: 'center', justifyContent: 'center', height: 50, borderRightWidth: 1, borderRightColor: BRD },
  input:         { flex: 1, height: 50, paddingHorizontal: 14, fontSize: 15, color: BLK },

  activoRow:     { flexDirection: 'row', alignItems: 'center', borderRadius: 13, padding: 14, marginBottom: 14, borderWidth: 1.5 },
  activoRowOn:   { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  activoRowOff:  { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  activoTxt:     { fontSize: 13, fontWeight: '600', flex: 1 },

  tiendaRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BRD, borderRadius: 13, padding: 14, marginBottom: 8, gap: 10 },
  tiendaRowDot:  { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  tiendaRowTxt:  { fontSize: 14, color: '#52525B', flex: 1 },

  errorBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 11, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  errorTxt:      { fontSize: 12, color: '#DC2626', fontWeight: '600', flex: 1 },

  confirmBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRP, borderRadius: 14, height: 54, marginTop: 8 },
  confirmTxt:    { color: '#fff', fontSize: 15, fontWeight: '800' },
});
