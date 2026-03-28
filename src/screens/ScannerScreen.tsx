import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Alert, FlatList, ScrollView, Vibration, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Tienda, Usuario, Registro, Articulo, CLSF, CATALOGO_BASE } from '../constants/data';
import { clasificar, fCOP, genId, ahora } from '../utils/helpers';
import { Badge } from '../components/common';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';

interface Props {
  usuario: Usuario;
  tienda: Tienda;
  registros: Registro[];
  catalogo: Articulo[];
  onGuardar: (r: Registro) => void;
  onBack: () => void;
}

export const ScannerScreen: React.FC<Props> = ({ usuario, tienda, registros, catalogo, onGuardar, onBack }) => {
  const CAT = catalogo.length > 0 ? catalogo : CATALOGO_BASE;
  const [perm, askPerm]          = useCameraPermissions();
  const [pausado, setPausado]    = useState(false);
  const [modal, setModal]        = useState(false);
  const [modalSearch, setSearch] = useState(false);
  const [busq, setBusq]          = useState('');
  const [item, setItem]          = useState<Articulo | null>(null);
  const [cantidad, setCantidad]  = useState('1');
  const [nota, setNota]          = useState('');
  const [foto, setFoto]          = useState<string | null>(null);
  const [flash, setFlash]        = useState(false);
  const last = useRef<string | null>(null);

  const abrirItem = (it: Articulo) => { setItem(it); setCantidad('1'); setNota(''); setFoto(null); setModal(true); setPausado(true); };
  const cerrar    = () => { setModal(false); setFoto(null); setTimeout(() => { last.current = null; setPausado(false); }, 250); };
  const cerrarB   = () => { setSearch(false); setBusq(''); setTimeout(() => { last.current = null; setPausado(false); }, 250); };

  const handleCode = ({ data }: { data: string }) => {
    if (pausado || data === last.current) return;
    last.current = data;
    const found = CAT.find(c => c.itemId === data);
    if (found) { Vibration.vibrate(60); abrirItem(found); }
    else {
      Vibration.vibrate([0, 60, 60, 60]);
      Alert.alert('Código no encontrado', `"${data}" no está en el catálogo.`, [
        { text: 'Buscar manual', onPress: () => { setSearch(true); setPausado(true); } },
        { text: 'Continuar',     onPress: () => { last.current = null; } },
      ]);
    }
  };

  const simular = () => {
    const disp = CAT.filter(c => !registros.some(r => r.itemId === c.itemId));
    if (!disp.length) { Alert.alert('¡Todo contado!', 'Ya escaneaste todos los artículos del catálogo.'); return; }
    Vibration.vibrate(60);
    abrirItem(disp[Math.floor(Math.random() * disp.length)]);
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const guardar = () => {
    if (!item) return;
    const cant = parseInt(cantidad, 10);
    if (isNaN(cant) || cant < 0) { Alert.alert('Cantidad inválida'); return; }
    onGuardar({
      id: genId(), tiendaId: tienda.id, itemId: item.itemId, descripcion: item.descripcion,
      ubicacion: item.ubicacion, stockSistema: item.stock, costoUnitario: item.costo,
      cantidad: cant, nota, fotoUri: foto, usuarioNombre: usuario.nombre,
      escaneadoEn: ahora(), clasificacion: clasificar(item.stock, cant),
    });
    setModal(false); setFoto(null);
    setTimeout(() => { last.current = null; setPausado(false); }, 250);
  };

  const resultados = busq.length === 0 ? CAT
    : CAT.filter(c =>
        c.itemId.slice(-6).includes(busq) ||
        c.itemId.toLowerCase().includes(busq.toLowerCase()) ||
        c.descripcion.toLowerCase().includes(busq.toLowerCase())
      ).slice(0, 12);

  if (!perm) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!perm.granted) return (
    <View style={s.permWrap}>
      <View style={s.permIcon}>
        <Ionicons name="videocam-off" size={36} color="#A1A1AA" />
      </View>
      <Text style={s.permTitle}>Permiso de cámara requerido</Text>
      <Text style={s.permSub}>StockIQ necesita la cámara para escanear artículos del inventario.</Text>
      <TouchableOpacity style={s.permBtn} onPress={askPerm}>
        <Text style={s.permBtnTxt}>Conceder permiso</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.permBtnAlt} onPress={simular}>
        <Ionicons name="flash" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={s.permBtnTxt}>Simular escaneo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.permBtnGhost} onPress={onBack}>
        <Text style={s.permBtnGhostTxt}>Volver</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        enableTorch={flash}
        onBarcodeScanned={pausado ? undefined : handleCode}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a'] }}
      />

      {/* Barra superior */}
      <View style={s.top}>
        <TouchableOpacity style={s.iconBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.topTitle}>{tienda.nombre}</Text>
          <Text style={s.topSub}>{registros.filter(r => r.usuarioNombre === usuario.nombre).length} escaneados</Text>
        </View>
        <TouchableOpacity style={[s.iconBtn, flash && { backgroundColor: '#F59E0B' }]} onPress={() => setFlash(!flash)}>
          <Ionicons name={flash ? 'flash' : 'flash-outline'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Marco de escaneo */}
      <View style={s.frameArea}>
        <View style={s.frame}>
          <View style={[s.corner, s.tl]} /><View style={[s.corner, s.tr]} />
          <View style={[s.corner, s.bl]} /><View style={[s.corner, s.br]} />
          <View style={s.frameCenter}>
            <View style={[s.frameLine, { backgroundColor: tienda.color + 'CC' }]} />
          </View>
        </View>
        <Text style={s.frameHint}>Apunta al código QR o de barras</Text>
      </View>

      {/* Barra inferior */}
      <View style={s.bottom}>
        <TouchableOpacity style={s.searchPill} onPress={() => { setSearch(true); setPausado(true); }}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={s.searchPillTxt}>Buscar por código o descripción</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.simBtn, { backgroundColor: tienda.color }]} onPress={simular}>
          <Ionicons name="flash" size={15} color="#fff" style={{ marginRight: 6 }} />
          <Text style={s.simBtnTxt}>Simular escaneo</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal: artículo detectado ── */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={m.bg}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.header}>
              <View>
                <Text style={m.headerLbl}>Artículo detectado</Text>
                {item && <Text style={[m.headerCode, { color: tienda.color }]}>{item.itemId}</Text>}
              </View>
              <TouchableOpacity onPress={cerrar} style={m.closeBtn}>
                <Ionicons name="close" size={18} color={MTD} />
              </TouchableOpacity>
            </View>

            {item && (() => {
              const cant  = parseInt(cantidad, 10) || 0;
              const clsf  = clasificar(item.stock, cant);
              const cfg   = CLSF[clsf];
              const delta = cant - item.stock;
              return (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Info card */}
                  <View style={m.infoCard}>
                    <View style={m.infoRow}>
                      <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                      <Text style={m.infoUbic}>{item.ubicacion}</Text>
                    </View>
                    <Text style={m.infoDesc}>{item.descripcion}</Text>
                    <View style={m.infoStats}>
                      <View style={m.infoStat}><Text style={m.infoStatLbl}>Stock sistema</Text><Text style={m.infoStatVal}>{item.stock}</Text></View>
                      <View style={m.infoStatDiv} />
                      <View style={m.infoStat}><Text style={m.infoStatLbl}>Costo unitario</Text><Text style={m.infoStatVal}>{fCOP(item.costo)}</Text></View>
                    </View>
                  </View>

                  {/* Cantidad */}
                  <Text style={m.fieldLbl}>Cantidad contada</Text>
                  <View style={m.cantWrap}>
                    <TouchableOpacity style={m.cantMinus} onPress={() => setCantidad(String(Math.max(0, (parseInt(cantidad, 10) || 0) - 1)))}>
                      <Ionicons name="remove" size={24} color="#DC2626" />
                    </TouchableOpacity>
                    <TextInput
                      style={m.cantInput}
                      value={cantidad}
                      onChangeText={setCantidad}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={[m.cantPlus, { backgroundColor: tienda.color }]} onPress={() => setCantidad(String((parseInt(cantidad, 10) || 0) + 1))}>
                      <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Delta */}
                  <View style={[m.deltaBox, { backgroundColor: delta === 0 ? LGR : cfg.bg, borderColor: delta === 0 ? BRD : cfg.color + '50' }]}>
                    <Ionicons
                      name={delta > 0 ? 'trending-up' : delta < 0 ? 'trending-down' : 'checkmark-circle'}
                      size={16}
                      color={delta === 0 ? '#A1A1AA' : cfg.color}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[m.deltaTxt, { color: delta === 0 ? '#A1A1AA' : cfg.color }]}>
                      {delta === 0
                        ? 'Sin diferencia con el sistema'
                        : `${delta > 0 ? '+' : ''}${delta} ud${Math.abs(delta) !== 1 ? 's' : ''} · impacto ${fCOP(Math.abs(item.costo * delta))}`}
                    </Text>
                  </View>

                  {/* Foto */}
                  <Text style={[m.fieldLbl, { marginTop: 14 }]}>Foto (opcional)</Text>
                  <TouchableOpacity style={m.fotoBtn} onPress={tomarFoto} activeOpacity={0.85}>
                    {foto
                      ? <><Ionicons name="checkmark-circle" size={18} color="#15803D" style={{ marginRight: 8 }} /><Text style={[m.fotoBtnTxt, { color: '#15803D' }]}>Foto tomada · Toca para cambiar</Text></>
                      : <><Ionicons name="camera-outline" size={18} color={MTD} style={{ marginRight: 8 }} /><Text style={m.fotoBtnTxt}>Tomar fotografía del artículo</Text></>
                    }
                  </TouchableOpacity>

                  {/* Nota */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 10 }}>
                    <Text style={m.fieldLbl}>Nota (opcional)</Text>
                    <Text style={{ fontSize: 10, color: nota.length > 180 ? '#F97316' : '#A1A1AA', marginLeft: 'auto' }}>
                      {nota.length}/200
                    </Text>
                  </View>
                  <TextInput
                    style={m.notaInput}
                    placeholder="Ej: Encontradas en bodega secundaria..."
                    placeholderTextColor="#A1A1AA"
                    value={nota}
                    onChangeText={t => setNota(t.slice(0, 200))}
                    maxLength={200}
                    multiline
                  />

                  <TouchableOpacity style={[m.guardarBtn, { backgroundColor: tienda.color }]} onPress={guardar} activeOpacity={0.88}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={m.guardarTxt}>Guardar y continuar</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Modal: búsqueda manual ── */}
      <Modal visible={modalSearch} animationType="slide" transparent>
        <KeyboardAvoidingView style={m.bg} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[m.sheet, { maxHeight: '88%' }]}>
            <View style={m.handle} />
            <View style={m.header}>
              <Text style={m.headerLbl}>Buscar artículo</Text>
              <TouchableOpacity onPress={cerrarB} style={m.closeBtn}>
                <Ionicons name="close" size={18} color={MTD} />
              </TouchableOpacity>
            </View>
            <View style={m.searchRow}>
              <Ionicons name="search" size={16} color="#A1A1AA" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: BLK }}
                placeholder="Últimos 6 dígitos o descripción..."
                placeholderTextColor="#A1A1AA"
                value={busq}
                onChangeText={setBusq}
                autoFocus
              />
              {busq ? (
                <TouchableOpacity onPress={() => setBusq('')}>
                  <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={m.searchHint}>Si la etiqueta está dañada, escribe los últimos 6 dígitos del código</Text>
            <FlatList
              data={resultados}
              keyExtractor={i => i.itemId}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: it }) => (
                <TouchableOpacity style={m.searchItem} onPress={() => { setSearch(false); setBusq(''); abrirItem(it); }}>
                  <View style={[m.searchDot, { backgroundColor: tienda.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[m.searchCode, { color: tienda.color }]}>{it.itemId}</Text>
                    <Text style={m.searchDesc}>{it.descripcion}</Text>
                    <Text style={m.searchMeta}>{it.ubicacion} · Stock: {it.stock} · {fCOP(it.costo)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={BRD} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Ionicons name="search-circle-outline" size={36} color={BRD} />
                  <Text style={{ color: '#A1A1AA', marginTop: 8, fontSize: 13 }}>Sin resultados</Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  permWrap:    { flex: 1, backgroundColor: '#09090B', alignItems: 'center', justifyContent: 'center', padding: 32 },
  permIcon:    { width: 80, height: 80, borderRadius: 22, backgroundColor: '#18181B', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  permTitle:   { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  permSub:     { fontSize: 13, color: '#71717A', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  permBtn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: PRP, borderRadius: 13, paddingHorizontal: 24, paddingVertical: 13, marginTop: 4 },
  permBtnAlt:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272A', borderRadius: 13, paddingHorizontal: 24, paddingVertical: 13, marginTop: 10 },
  permBtnGhost:{ paddingHorizontal: 24, paddingVertical: 13, marginTop: 6 },
  permBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  permBtnGhostTxt: { color: '#71717A', fontWeight: '600', fontSize: 14 },

  top:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 54, backgroundColor: 'rgba(0,0,0,0.65)' },
  iconBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  topTitle:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  topSub:      { color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center', marginTop: 2 },

  frameArea:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame:       { width: 256, height: 220, position: 'relative' },
  corner:      { position: 'absolute', width: 30, height: 30, borderColor: '#fff', borderWidth: 3.5 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  frameCenter: { position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center' },
  frameLine:   { width: '80%', height: 2, borderRadius: 1 },
  frameHint:   { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 18 },

  bottom:      { backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 36, alignItems: 'center', gap: 12 },
  searchPill:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', gap: 8, width: '100%' },
  searchPillTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  simBtn:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 },
  simBtnTxt:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});

const m = StyleSheet.create({
  bg:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 },
  handle:      { width: 40, height: 4, backgroundColor: BRD, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  headerLbl:   { fontSize: 12, fontWeight: '700', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  headerCode:  { fontSize: 16, fontWeight: '800' },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center' },

  infoCard:    { backgroundColor: LGR, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: BRD },
  infoRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  infoUbic:    { fontSize: 11, fontWeight: '600', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoDesc:    { fontSize: 15, fontWeight: '700', color: BLK, marginBottom: 12, lineHeight: 20 },
  infoStats:   { flexDirection: 'row', alignItems: 'center' },
  infoStat:    { flex: 1, alignItems: 'center' },
  infoStatLbl: { fontSize: 10, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  infoStatVal: { fontSize: 16, fontWeight: '800', color: BLK },
  infoStatDiv: { width: 1, height: 36, backgroundColor: BRD },

  fieldLbl:    { fontSize: 11, fontWeight: '700', color: '#52525B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  cantWrap:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cantMinus:   { width: 52, height: 52, borderRadius: 14, borderWidth: 2, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  cantPlus:    { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cantInput:   { flex: 1, height: 60, borderWidth: 2, borderColor: BRD, borderRadius: 14, textAlign: 'center', fontSize: 32, fontWeight: '900', color: BLK, backgroundColor: LGR },

  deltaBox:    { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 11, marginBottom: 6, borderWidth: 1 },
  deltaTxt:    { fontSize: 13, fontWeight: '600' },

  fotoBtn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: LGR, borderWidth: 1.5, borderColor: BRD, borderRadius: 13, padding: 14, marginBottom: 4 },
  fotoBtnTxt:  { fontSize: 13, color: MTD, fontWeight: '500' },
  notaInput:   { borderWidth: 1.5, borderColor: BRD, borderRadius: 13, padding: 13, fontSize: 13, color: BLK, backgroundColor: LGR, minHeight: 60, marginBottom: 18 },
  guardarBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 15, height: 56 },
  guardarTxt:  { color: '#fff', fontWeight: '800', fontSize: 16 },

  searchRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BRD, borderRadius: 13, padding: 12, marginBottom: 8, backgroundColor: LGR },
  searchHint:  { fontSize: 11, color: '#A1A1AA', marginBottom: 12, lineHeight: 16 },
  searchItem:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: LGR },
  searchDot:   { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  searchCode:  { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  searchDesc:  { fontSize: 13, fontWeight: '600', color: BLK, marginBottom: 2 },
  searchMeta:  { fontSize: 11, color: '#A1A1AA' },
});
