import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Modal, Alert, ScrollView, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Usuario, TIENDAS, IoniconName } from '../constants/data';
import { Avatar, RolBadge } from '../components/common';
import { PRP, BLK, DRK, LGR, BRD, MTD, GRN } from '../constants/colors';

interface Props {
  usuarios: Usuario[];
  onAgregar: (u: Omit<Usuario, 'id'>) => void;
  onEditar:  (id: string, cambios: Partial<Omit<Usuario, 'id'>>) => void;
  onEliminar: (id: string) => void;
  onVolver: () => void;
}

export const GestionEquipoScreen: React.FC<Props> = ({ usuarios, onAgregar, onEditar, onEliminar, onVolver }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId,   setEditandoId]   = useState<string | null>(null);
  const [nombre,    setNombre]    = useState('');
  const [cedula,    setCedula]    = useState('');
  const [telefono,  setTelefono]  = useState('');
  const [pass,      setPass]      = useState('');
  const [tiendasSel, setTiendasSel] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggleTienda = (id: string) =>
    setTiendasSel(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  /* ── WhatsApp ── */
  const enviarWhatsApp = (u: Usuario) => {
    if (!u.telefono) {
      Alert.alert(
        'Sin número de WhatsApp',
        'Este auditor no tiene número registrado.\nEdítalo para agregar su celular.',
      );
      return;
    }
    const num = u.telefono.replace(/\D/g, '');
    const tel = num.startsWith('57') ? num : `57${num}`;
    const tiendasNombres = TIENDAS.filter(t => u.tiendas.includes(t.id)).map(t => t.nombre).join(', ');
    const msg =
      `Hola ${u.nombre.split(' ')[0]} 👋\n\n` +
      `Te registré en *StockIQ*, el sistema de auditoría de inventarios del Grupo Comercial.\n\n` +
      `📱 *Tus datos de acceso:*\n• Usuario: ${u.cedula}\n• Contraseña: ${u.pass}\n\n` +
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
    setTiendasSel([...u.tiendas]);
    setError('');
    setModalVisible(true);
  };

  /* ── Validación de teléfono colombiano (opcional) ── */
  const telefonoValido = (tel: string): boolean => {
    if (!tel.trim()) return true; // es opcional
    const solo = tel.replace(/\D/g, '');
    return solo.length === 10 && solo.startsWith('3');
  };

  /* ── Agregar ── */
  const handleAgregar = () => {
    setError('');
    if (!nombre.trim())           { setError('Ingresa el nombre completo.'); return; }
    if (!cedula.trim())           { setError('Ingresa el número de cédula.'); return; }
    if (cedula.trim().length < 7) { setError('La cédula debe tener al menos 7 dígitos.'); return; }
    if (!pass.trim())             { setError('Ingresa una contraseña inicial.'); return; }
    if (pass.trim().length < 6)   { setError('La contraseña debe tener mínimo 6 caracteres.'); return; }
    if (tiendasSel.length === 0)  { setError('Asigna al menos una tienda.'); return; }
    if (!telefonoValido(telefono)) { setError('Celular inválido. Debe tener 10 dígitos y empezar en 3 (ej: 3001234567).'); return; }
    if (usuarios.find(u => u.cedula === cedula.trim())) { setError('Ya existe un usuario con esa cédula.'); return; }

    onAgregar({
      cedula:   cedula.trim(),
      nombre:   nombre.trim().toUpperCase(),
      rol:      'AUDITOR',
      tiendas:  tiendasSel,
      pass:     pass.trim(),
      telefono: telefono.trim() || undefined,
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
    if (!telefonoValido(telefono)) { setError('Celular inválido. Debe tener 10 dígitos y empezar en 3 (ej: 3001234567).'); return; }

    onEditar(editandoId!, {
      nombre:   nombre.trim().toUpperCase(),
      tiendas:  tiendasSel,
      pass:     pass.trim(),
      telefono: telefono.trim() || undefined,
    });
    limpiarYCerrar();
  };

  const limpiarYCerrar = () => {
    setModalVisible(false);
    setEditandoId(null);
    setNombre(''); setCedula(''); setTelefono(''); setPass(''); setTiendasSel([]); setError('');
  };

  const confirmarEliminar = (u: Usuario) =>
    Alert.alert('Eliminar usuario', `¿Deseas eliminar a ${u.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onEliminar(u.id) },
    ]);

  const cerrarModal = () => limpiarYCerrar();

  const auditores = usuarios.filter(u => u.rol !== 'SUPERADMIN');

  /* ── Campos del formulario ── */
  const campos: { label: string; icon: IoniconName; value: string; onChange: (t: string) => void; placeholder: string; capitalize: 'characters' | 'none'; keyboard: 'default' | 'numeric' | 'phone-pad'; secure: boolean; optional?: boolean }[] = [
    { label: 'Nombre completo',    icon: 'person-outline',         value: nombre,   onChange: t => { setNombre(t);   setError(''); }, placeholder: 'Ej: PEDRO TARAZONA',               capitalize: 'characters', keyboard: 'default',    secure: false },
    { label: 'Número de cédula',   icon: 'card-outline',           value: cedula,   onChange: t => { setCedula(t);   setError(''); }, placeholder: 'Será el usuario de inicio sesión', capitalize: 'none',       keyboard: 'numeric',    secure: false },
    { label: 'WhatsApp (celular)', icon: 'phone-portrait-outline', value: telefono, onChange: t => { setTelefono(t); setError(''); }, placeholder: 'Ej: 3001234567  (opcional)',       capitalize: 'none',       keyboard: 'phone-pad',  secure: false, optional: true },
    { label: 'Contraseña inicial', icon: 'lock-closed-outline',    value: pass,     onChange: t => { setPass(t);     setError(''); }, placeholder: 'Mínimo 6 caracteres',              capitalize: 'none',       keyboard: 'default',    secure: true  },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: LGR }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onVolver} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={BLK} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Gestión de equipo</Text>
          <Text style={s.sub}>{auditores.length} auditores registrados</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="person-add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={auditores}
        keyExtractor={u => u.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="people-outline" size={36} color="#A1A1AA" />
            </View>
            <Text style={s.emptyTitle}>Sin auditores aún</Text>
            <Text style={s.emptySub}>Toca el botón + para agregar el primer miembro del equipo.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="person-add" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.emptyBtnTxt}>Agregar auditor</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: u }) => {
          const tiendasU = TIENDAS.filter(t => u.tiendas.includes(t.id));
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <Avatar nombre={u.nombre} size={46} bg={DRK} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.cardNombre}>{u.nombre}</Text>
                  <Text style={s.cardCed}>CC {u.cedula}</Text>
                  <View style={{ marginTop: 5 }}><RolBadge rol={u.rol} /></View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
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
                {tiendasU.map(t => (
                  <View key={t.id} style={[s.tiendaChip, { borderColor: t.color + '50', backgroundColor: t.color + '12' }]}>
                    <View style={[s.tiendaDot, { backgroundColor: t.color }]} />
                    <Text style={[s.tiendaChipTxt, { color: t.color }]}>
                      {t.nombre.replace('Tienda ', '').replace('Inventario ', '')}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={s.credRow}>
                <Ionicons name="key-outline" size={12} color="#A1A1AA" style={{ marginRight: 5 }} />
                <Text style={s.credTxt}>Usuario: {u.cedula} · Contraseña: {'•'.repeat(Math.min(u.pass.length, 8))}</Text>
              </View>

              {u.telefono ? (
                <View style={[s.credRow, { marginTop: 4 }]}>
                  <Ionicons name="logo-whatsapp" size={12} color={GRN} style={{ marginRight: 5 }} />
                  <Text style={[s.credTxt, { color: '#15803D' }]}>WhatsApp: {u.telefono}</Text>
                </View>
              ) : (
                <View style={[s.credRow, { marginTop: 4 }]}>
                  <Ionicons name="phone-portrait-outline" size={12} color="#A1A1AA" style={{ marginRight: 5 }} />
                  <Text style={s.credTxt}>Sin número de WhatsApp</Text>
                </View>
              )}

              <TouchableOpacity
                style={[s.waBtn, !u.telefono && { opacity: 0.45 }]}
                onPress={() => enviarWhatsApp(u)}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                <Text style={s.waBtnTxt}>Enviar credenciales por WhatsApp</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Modal agregar auditor */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editandoId ? 'Editar auditor' : 'Nuevo auditor'}</Text>
              <TouchableOpacity onPress={cerrarModal} style={s.modalClose}>
                <Ionicons name="close" size={18} color={MTD} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                        secureTextEntry={f.secure}
                        editable={!bloqueado}
                      />
                    </View>
                  </View>
                );
              })}

              <Text style={s.fieldLabel}>Asignar tiendas</Text>
              <Text style={s.fieldSub}>Selecciona una o más tiendas donde trabajará</Text>

              {TIENDAS.filter(t => t.id !== 'general').map(t => {
                const sel = tiendasSel.includes(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.tiendaRow, sel && { borderColor: t.color, backgroundColor: t.color + '0D' }]}
                    onPress={() => toggleTienda(t.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.tiendaRowDot, { backgroundColor: t.color }]} />
                    <Text style={[s.tiendaRowTxt, sel && { color: t.color, fontWeight: '700' }]}>{t.nombre}</Text>
                    {sel && <Ionicons name="checkmark-circle" size={20} color={t.color} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}

              {/* Inventario general */}
              {(() => {
                const t = TIENDAS.find(t => t.id === 'general')!;
                const sel = tiendasSel.includes('general');
                return (
                  <TouchableOpacity
                    style={[s.tiendaRow, sel && { borderColor: BLK, backgroundColor: 'rgba(9,9,11,0.05)' }]}
                    onPress={() => toggleTienda('general')}
                    activeOpacity={0.8}
                  >
                    <View style={[s.tiendaRowDot, { backgroundColor: BLK }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.tiendaRowTxt, sel && { color: BLK, fontWeight: '700' }]}>Inventario General</Text>
                      <Text style={{ fontSize: 11, color: MTD, marginTop: 2 }}>Espacio colaborativo con todos los auditores</Text>
                    </View>
                    {sel && <Ionicons name="checkmark-circle" size={20} color={BLK} />}
                  </TouchableOpacity>
                );
              })()}

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
                <Text style={s.confirmTxt}>{editandoId ? 'Guardar cambios' : 'Registrar auditor'}</Text>
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
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title:         { fontSize: 18, fontWeight: '800', color: BLK },
  sub:           { fontSize: 12, color: MTD, marginTop: 2 },
  addBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: PRP, alignItems: 'center', justifyContent: 'center' },

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

  sectionLbl:    { fontSize: 10, fontWeight: '700', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  tiendasRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tiendaChip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, gap: 5 },
  tiendaDot:     { width: 6, height: 6, borderRadius: 3 },
  tiendaChipTxt: { fontSize: 11, fontWeight: '600' },

  credRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: LGR, borderRadius: 8, padding: 9, marginBottom: 2 },
  credTxt:       { fontSize: 11, color: MTD },

  waBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: GRN, borderRadius: 13, padding: 12, gap: 8, marginTop: 10 },
  waBtnTxt:      { color: '#fff', fontWeight: '700', fontSize: 13 },

  /* Modal */
  modalBg:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 44, maxHeight: '93%' },
  modalHandle:   { width: 40, height: 4, backgroundColor: BRD, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle:    { fontSize: 19, fontWeight: '800', color: BLK },
  modalClose:    { width: 32, height: 32, borderRadius: 16, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center' },

  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  fieldLabel:    { fontSize: 11, fontWeight: '700', color: '#52525B', textTransform: 'uppercase', letterSpacing: 0.6 },
  optionalTag:   { fontSize: 10, fontWeight: '600', color: '#A1A1AA', backgroundColor: LGR, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  fieldSub:      { fontSize: 12, color: MTD, marginTop: -4, marginBottom: 10 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BRD, borderRadius: 13, backgroundColor: LGR, overflow: 'hidden' },
  inputIconWrap: { width: 44, alignItems: 'center', justifyContent: 'center', height: 50, borderRightWidth: 1, borderRightColor: BRD },
  input:         { flex: 1, height: 50, paddingHorizontal: 14, fontSize: 15, color: BLK },

  tiendaRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BRD, borderRadius: 13, padding: 14, marginBottom: 8, gap: 10 },
  tiendaRowDot:  { width: 10, height: 10, borderRadius: 5 },
  tiendaRowTxt:  { fontSize: 14, color: '#52525B' },

  errorBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 11, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  errorTxt:      { fontSize: 12, color: '#DC2626', fontWeight: '600', flex: 1 },

  confirmBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRP, borderRadius: 14, height: 54, marginTop: 8 },
  confirmTxt:    { color: '#fff', fontSize: 15, fontWeight: '800' },
});
