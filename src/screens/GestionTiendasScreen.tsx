import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tienda, IoniconName, PALETA_COLORES } from '../constants/data';
import { genId } from '../utils/helpers';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';

interface Props {
  tiendas:     Tienda[];
  onAgregar:   (t: Omit<Tienda, 'id'>) => void;
  onEditar:    (id: string, cambios: Partial<Omit<Tienda, 'id'>>) => void;
  onEliminar:  (id: string) => void;
  onVolver:    () => void;
}

const ICONO_DEFAULT: IoniconName = 'storefront';
const COLOR_DEFAULT = '#09090B';

export const GestionTiendasScreen: React.FC<Props> = ({
  tiendas, onAgregar, onEditar, onEliminar, onVolver,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId,   setEditandoId]   = useState<string | null>(null);
  const [nombre,  setNombre]  = useState('');
  const [nit,     setNit]     = useState('');
  const [color,   setColor]   = useState(COLOR_DEFAULT);
  const [error,   setError]   = useState('');

  const abrirNueva = () => {
    setEditandoId(null);
    setNombre('');
    setNit('');
    setColor(COLOR_DEFAULT);
    setError('');
    setModalVisible(true);
  };

  const abrirEdicion = (t: Tienda) => {
    setEditandoId(t.id);
    setNombre(t.nombre);
    setNit(t.nit ?? '');
    setColor(t.color);
    setError('');
    setModalVisible(true);
  };

  const handleGuardar = () => {
    setError('');
    if (!nombre.trim()) { setError('Ingresa el nombre de la tienda.'); return; }
    if (nombre.trim().length < 3) { setError('El nombre debe tener al menos 3 caracteres.'); return; }

    if (editandoId) {
      onEditar(editandoId, {
        nombre: nombre.trim(),
        nit:    nit.trim() || undefined,
        color,
      });
    } else {
      // Verificar nombre único
      if (tiendas.find(t => t.nombre.toLowerCase() === nombre.trim().toLowerCase())) {
        setError('Ya existe una tienda con ese nombre.');
        return;
      }
      onAgregar({
        nombre: nombre.trim(),
        icono:  ICONO_DEFAULT,
        color,
        nit:    nit.trim() || undefined,
      });
    }
    setModalVisible(false);
  };

  const confirmarEliminar = (t: Tienda) => {
    Alert.alert(
      'Eliminar tienda',
      `¿Deseas eliminar "${t.nombre}"?\n\nLos registros e inventario de esta tienda seguirán existiendo pero no podrás acceder a ellos desde el menú principal.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onEliminar(t.id) },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: LGR }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onVolver} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={BLK} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title}>Gestión de tiendas</Text>
          <Text style={s.sub}>{tiendas.length} tiendas registradas</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={abrirNueva}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={tiendas}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="storefront-outline" size={36} color="#A1A1AA" />
            </View>
            <Text style={s.emptyTitle}>Sin tiendas registradas</Text>
            <Text style={s.emptySub}>Toca el botón + para agregar la primera tienda.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={abrirNueva}>
              <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.emptyBtnTxt}>Agregar tienda</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: t }) => (
          <View style={s.card}>
            <View style={[s.colorDot, { backgroundColor: t.color }]}>
              <Ionicons name={t.icono} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
              <Text style={s.cardNombre} numberOfLines={1}>{t.nombre}</Text>
              {t.nit ? (
                <Text style={s.cardNit} numberOfLines={1}>NIT: {t.nit}</Text>
              ) : (
                <Text style={s.cardNit}>Sin NIT registrado</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
              <TouchableOpacity onPress={() => abrirEdicion(t)} style={s.editBtn}>
                <Ionicons name="pencil-outline" size={17} color={PRP} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmarEliminar(t)} style={s.deleteBtn}>
                <Ionicons name="trash-outline" size={17} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal Agregar / Editar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editandoId ? 'Editar tienda' : 'Nueva tienda'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.modalClose}>
                <Ionicons name="close" size={18} color={MTD} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Preview */}
              <View style={s.previewRow}>
                <View style={[s.previewIcon, { backgroundColor: color }]}>
                  <Ionicons name={ICONO_DEFAULT} size={28} color="#fff" />
                </View>
                <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
                  <Text style={s.previewNombre} numberOfLines={1}>
                    {nombre.trim() || 'Nombre de tienda'}
                  </Text>
                  {nit.trim() ? (
                    <Text style={s.previewNit} numberOfLines={1}>NIT: {nit.trim()}</Text>
                  ) : (
                    <Text style={s.previewNit}>Sin NIT</Text>
                  )}
                </View>
              </View>

              {/* Campo nombre */}
              <Text style={s.fieldLabel}>Nombre de la tienda</Text>
              <View style={s.inputWrap}>
                <View style={s.inputIconWrap}>
                  <Ionicons name="storefront-outline" size={16} color={MTD} />
                </View>
                <TextInput
                  style={s.input}
                  placeholder="Ej: Tienda Norte"
                  placeholderTextColor="#A1A1AA"
                  value={nombre}
                  onChangeText={t => { setNombre(t); setError(''); }}
                  autoCapitalize="words"
                />
              </View>

              {/* Campo NIT */}
              <Text style={[s.fieldLabel, { marginTop: 14 }]}>
                NIT  <Text style={s.optionalTag}>Opcional</Text>
              </Text>
              <View style={s.inputWrap}>
                <View style={s.inputIconWrap}>
                  <Ionicons name="card-outline" size={16} color={MTD} />
                </View>
                <TextInput
                  style={s.input}
                  placeholder="Ej: 900.123.456-7"
                  placeholderTextColor="#A1A1AA"
                  value={nit}
                  onChangeText={t => { setNit(t); setError(''); }}
                  keyboardType="default"
                />
              </View>

              {/* Paleta de colores */}
              <Text style={[s.fieldLabel, { marginTop: 14 }]}>Color de la tienda</Text>
              <Text style={s.fieldSub}>Toca un color para seleccionarlo</Text>
              <View style={s.paleta}>
                {PALETA_COLORES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      s.colorCircle,
                      { backgroundColor: c },
                      color === c && s.colorCircleSelected,
                    ]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.8}
                  >
                    {color === c && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {error ? (
                <View style={s.errorBox}>
                  <Ionicons name="warning" size={14} color="#DC2626" />
                  <Text style={s.errorTxt}> {error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={s.confirmBtn}
                onPress={handleGuardar}
                activeOpacity={0.88}
              >
                <Ionicons
                  name={editandoId ? 'checkmark-circle' : 'add-circle'}
                  size={18}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={s.confirmTxt}>
                  {editandoId ? 'Guardar cambios' : 'Crear tienda'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 54, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  backBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  title:     { fontSize: 18, fontWeight: '800', color: BLK },
  sub:       { fontSize: 12, color: MTD, marginTop: 2 },
  addBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: PRP, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  emptyWrap:     { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', borderWidth: 1, borderColor: BRD, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:    { fontSize: 17, fontWeight: '800', color: BLK, marginBottom: 8 },
  emptySub:      { fontSize: 13, color: MTD, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: PRP, borderRadius: 13, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnTxt:   { color: '#fff', fontWeight: '700', fontSize: 14 },

  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  colorDot:  { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardNombre:{ fontSize: 15, fontWeight: '800', color: BLK, marginBottom: 3 },
  cardNit:   { fontSize: 12, color: MTD },
  editBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },

  /* Modal */
  modalBg:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 44, maxHeight: '95%' },
  modalHandle:{ width: 40, height: 4, backgroundColor: BRD, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: BLK },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center' },

  previewRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: LGR, borderRadius: 16, padding: 14, marginBottom: 20 },
  previewIcon:   { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  previewNombre: { fontSize: 16, fontWeight: '800', color: BLK, marginBottom: 4 },
  previewNit:    { fontSize: 12, color: MTD },

  fieldLabel:    { fontSize: 11, fontWeight: '700', color: '#52525B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  optionalTag:   { fontSize: 10, fontWeight: '600', color: '#A1A1AA', textTransform: 'none' },
  fieldSub:      { fontSize: 12, color: MTD, marginTop: -4, marginBottom: 10 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BRD, borderRadius: 13, backgroundColor: LGR, overflow: 'hidden' },
  inputIconWrap: { width: 44, alignItems: 'center', justifyContent: 'center', height: 50, borderRightWidth: 1, borderRightColor: BRD },
  input:         { flex: 1, height: 50, paddingHorizontal: 14, fontSize: 15, color: BLK },

  paleta:            { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 20, marginTop: 4 },
  colorCircle:         { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'transparent' },
  colorCircleSelected: { borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6, transform: [{ scale: 1.18 }] },

  errorBox:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 11, marginVertical: 8, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  errorTxt:  { fontSize: 12, color: '#DC2626', fontWeight: '600', flex: 1 },

  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRP, borderRadius: 14, height: 54, marginTop: 8 },
  confirmTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
