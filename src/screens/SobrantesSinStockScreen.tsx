import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Modal, Alert, Image, KeyboardAvoidingView,
  Platform, Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  Tienda, Usuario, Articulo,
  SobranteSinStock, EstadoSobrante,
} from '../constants/data';
import { genId, fCOP, ahora } from '../utils/helpers';
import { BLK, LGR, BRD, MTD } from '../constants/colors';

const BROWN  = '#92400E';
const AMBER  = '#F59E0B';
const GREEN  = '#15803D';
const RED    = '#DC2626';

interface Props {
  tienda:           Tienda;
  usuario:          Usuario;
  catalogo:         Articulo[];
  sobrantes?:       SobranteSinStock[];
  onGuardar:        (s: SobranteSinStock) => void;
  onEliminar?:      (id: string) => void;
  onEditarEstado?:  (id: string, estado: EstadoSobrante) => void;
  onBack:           () => void;
}

export const SobrantesSinStockScreen: React.FC<Props> = ({
  tienda, usuario, catalogo, sobrantes = [], onGuardar, onEliminar, onEditarEstado, onBack,
}) => {
  const [codigo,     setCodigo]   = useState('');
  const [descripcion,setDesc]     = useState('');
  const [ubicacion,  setUbic]     = useState('');
  const [fotoUri,    setFoto]     = useState<string | null>(null);
  const [estado,     setEstado]   = useState<EstadoSobrante | null>(null);
  const [precio,     setPrecio]   = useState('');
  const [cantidad,   setCantidad] = useState('1');
  const [error,      setError]    = useState('');
  const [success,    setSuccess]  = useState(false);
  const [scanModal,  setScan]     = useState(false);
  const [fotoModal,  setFotoModal] = useState<string | null>(null);
  const [perm, askPerm]           = useCameraPermissions();
  const lastCode = useRef<string | null>(null);

  // ── Scanner ───────────────────────────────────────────────────────────────
  const abrirScanner = async () => {
    if (!perm?.granted) {
      const res = await askPerm();
      if (!res.granted) {
        Alert.alert('Permiso requerido', 'StockIQ necesita la cámara para escanear.');
        return;
      }
    }
    lastCode.current = null;
    setScan(true);
  };

  const handleScan = ({ data }: { data: string }) => {
    if (data === lastCode.current) return;
    lastCode.current = data;
    Vibration.vibrate(60);

    const enCatalogo = catalogo.find(a => a.itemId === data);
    setScan(false);

    if (enCatalogo) {
      Alert.alert(
        'Artículo en catálogo',
        `"${data}" existe en el catálogo con stock ${enCatalogo.stock}.\n¿Continuar registrándolo como sobrante sin stock?`,
        [
          { text: 'Cancelar',  style: 'cancel' },
          { text: 'Continuar', onPress: () => { setCodigo(data); setError(''); } },
        ],
      );
    } else {
      setCodigo(data);
      setError('');
    }
  };

  const cerrarScanner = () => {
    setScan(false);
    lastCode.current = null;
    Alert.alert(
      'Código no escaneado',
      'No se pudo leer el código. Puedes ingresarlo manualmente en el campo de texto.',
      [{ text: 'Entendido' }],
    );
  };

  // ── Foto ──────────────────────────────────────────────────────────────────
  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara para tomar fotos.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality:       0.75,
      aspect:        [4, 3],
    });
    if (!res.canceled) { setFoto(res.assets[0].uri); setError(''); }
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const limpiarForm = () => {
    setCodigo(''); setDesc(''); setUbic(''); setFoto(null);
    setEstado(null); setPrecio(''); setCantidad('1'); setError('');
  };

  const guardar = () => {
    setError('');
    if (!codigo.trim())      { setError('El código del artículo es obligatorio.'); return; }
    if (!descripcion.trim()) { setError('La descripción es obligatoria.'); return; }
    if (!ubicacion.trim())   { setError('La ubicación / grupo es obligatoria.'); return; }
    if (!fotoUri)            { setError('Debes tomar una foto del artículo.'); return; }
    if (!estado)             { setError('Selecciona el estado del artículo (CONFIRMADO o PENDIENTE).'); return; }

    const p = parseFloat(precio.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!precio.trim() || isNaN(p) || p <= 0) {
      setError('Ingresa un precio válido mayor a $0.');
      return;
    }

    const cant = parseInt(cantidad, 10);
    if (isNaN(cant) || cant < 1) {
      setError('La cantidad debe ser al menos 1.');
      return;
    }

    onGuardar({
      id:            genId(),
      tiendaId:      tienda.id,
      codigo:        codigo.trim().toUpperCase(),
      descripcion:   descripcion.trim().toUpperCase(),
      ubicacion:     ubicacion.trim().toUpperCase(),
      fotoUri,
      estado,
      precio:        p,
      cantidad:      cant,
      usuarioNombre: usuario.nombre,
      registradoEn:  ahora(),
    });

    setSuccess(true);
    limpiarForm();
    setTimeout(() => setSuccess(false), 2800);
  };

  // ── Preview precio ────────────────────────────────────────────────────────
  const precioNum = parseFloat(precio.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: LGR }}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.headerTag}>REGISTRO ESPECIAL</Text>
          <Text style={s.headerTitle}>Sobrante sin Stock</Text>
          <Text style={s.headerSub}>{tienda.nombre}</Text>
        </View>
        <View style={s.warningChip}>
          <Ionicons name="warning" size={14} color={AMBER} />
          <Text style={s.warningTxt}>Sin stock</Text>
        </View>
      </View>

      {/* ── Banner éxito ── */}
      {success && (
        <View style={s.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.successTxt}>¡Sobrante registrado! Puedes agregar otro.</Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Aviso informativo */}
          <View style={s.infoCard}>
            <Ionicons name="information-circle" size={18} color={BROWN} style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={s.infoTxt}>
              Artículos encontrados físicamente que{' '}
              <Text style={{ fontWeight: '800', color: BROWN }}>no existen o tienen stock 0</Text>{' '}
              en la base de datos. Todos los campos son obligatorios.
            </Text>
          </View>

          {/* ════════════════════════════════════════
              1. CÓDIGO
          ════════════════════════════════════════ */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.numBadge, { backgroundColor: BROWN }]}>
                <Text style={s.numBadgeTxt}>1</Text>
              </View>
              <Text style={s.cardTitle}>Código del artículo</Text>
              <Text style={s.req}> * obligatorio</Text>
            </View>
            <View style={s.codeRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Ej: 7701023894531"
                placeholderTextColor="#A1A1AA"
                value={codigo}
                onChangeText={t => { setCodigo(t); setError(''); }}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[s.scanBtn, { backgroundColor: tienda.color }]}
                onPress={abrirScanner}
                activeOpacity={0.85}
              >
                <Ionicons name="scan-outline" size={22} color="#fff" />
                <Text style={s.scanBtnTxt}>Escanear</Text>
              </TouchableOpacity>
            </View>
            {codigo ? (
              <View style={s.codePreview}>
                <Ionicons name="barcode-outline" size={14} color={tienda.color} style={{ marginRight: 6 }} />
                <Text style={[s.codePreviewTxt, { color: tienda.color }]}>{codigo}</Text>
              </View>
            ) : null}
          </View>

          {/* ════════════════════════════════════════
              2. DESCRIPCIÓN
          ════════════════════════════════════════ */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.numBadge, { backgroundColor: BROWN }]}>
                <Text style={s.numBadgeTxt}>2</Text>
              </View>
              <Text style={s.cardTitle}>Descripción del artículo</Text>
              <Text style={s.req}> * obligatorio</Text>
            </View>
            <TextInput
              style={[s.input, s.inputTall]}
              placeholder="Nombre completo del artículo tal como aparece en el empaque..."
              placeholderTextColor="#A1A1AA"
              value={descripcion}
              onChangeText={t => { setDesc(t); setError(''); }}
              autoCapitalize="characters"
              multiline
            />
          </View>

          {/* ════════════════════════════════════════
              3. UBICACIÓN / GRUPO
          ════════════════════════════════════════ */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.numBadge, { backgroundColor: BROWN }]}>
                <Text style={s.numBadgeTxt}>3</Text>
              </View>
              <Text style={s.cardTitle}>Ubicación / Grupo</Text>
              <Text style={s.req}> * obligatorio</Text>
            </View>
            <TextInput
              style={s.input}
              placeholder="Ej: MANZANAS, LLANTAS, REPUESTOS..."
              placeholderTextColor="#A1A1AA"
              value={ubicacion}
              onChangeText={t => { setUbic(t); setError(''); }}
              autoCapitalize="characters"
            />
          </View>

          {/* ════════════════════════════════════════
              4. FOTO
          ════════════════════════════════════════ */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.numBadge, { backgroundColor: BROWN }]}>
                <Text style={s.numBadgeTxt}>4</Text>
              </View>
              <Text style={s.cardTitle}>Foto del artículo</Text>
              <Text style={s.req}> * obligatorio</Text>
            </View>

            {fotoUri ? (
              <View style={s.photoWrap}>
                <Image source={{ uri: fotoUri }} style={s.photoPreview} resizeMode="cover" />
                <TouchableOpacity style={s.photoOverlay} onPress={tomarFoto} activeOpacity={0.85}>
                  <Ionicons name="camera" size={18} color="#fff" />
                  <Text style={s.photoOverlayTxt}>Cambiar foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.photoBtn} onPress={tomarFoto} activeOpacity={0.85}>
                <View style={s.photoBtnIcon}>
                  <Ionicons name="camera-outline" size={32} color="#A1A1AA" />
                </View>
                <Text style={s.photoBtnTxt}>Tomar fotografía del artículo</Text>
                <Text style={s.photoBtnSub}>Se requiere foto como evidencia del hallazgo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ════════════════════════════════════════
              5. ESTADO
          ════════════════════════════════════════ */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.numBadge, { backgroundColor: BROWN }]}>
                <Text style={s.numBadgeTxt}>5</Text>
              </View>
              <Text style={s.cardTitle}>Estado del artículo</Text>
              <Text style={s.req}> * obligatorio</Text>
            </View>
            <View style={s.estadoRow}>
              <TouchableOpacity
                style={[
                  s.estadoBtn,
                  estado === 'CONFIRMADO' && { backgroundColor: GREEN, borderColor: GREEN },
                ]}
                onPress={() => { setEstado('CONFIRMADO'); setError(''); }}
                activeOpacity={0.85}
              >
                <View style={[s.estadoDot, { backgroundColor: estado === 'CONFIRMADO' ? '#fff' : GREEN }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.estadoTxt, estado === 'CONFIRMADO' && { color: '#fff', fontWeight: '800' }]}>
                    CONFIRMADO
                  </Text>
                  <Text style={[s.estadoSub, estado === 'CONFIRMADO' && { color: 'rgba(255,255,255,0.7)' }]}>
                    Verificado y listo para ingresar
                  </Text>
                </View>
                {estado === 'CONFIRMADO' && (
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.estadoBtn,
                  estado === 'PENDIENTE' && { backgroundColor: AMBER, borderColor: AMBER },
                ]}
                onPress={() => { setEstado('PENDIENTE'); setError(''); }}
                activeOpacity={0.85}
              >
                <View style={[s.estadoDot, { backgroundColor: estado === 'PENDIENTE' ? '#fff' : AMBER }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.estadoTxt, estado === 'PENDIENTE' && { color: '#fff', fontWeight: '800' }]}>
                    PENDIENTE
                  </Text>
                  <Text style={[s.estadoSub, estado === 'PENDIENTE' && { color: 'rgba(255,255,255,0.7)' }]}>
                    Requiere verificación adicional
                  </Text>
                </View>
                {estado === 'PENDIENTE' && (
                  <Ionicons name="time" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ════════════════════════════════════════
              6. PRECIO
          ════════════════════════════════════════ */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.numBadge, { backgroundColor: BROWN }]}>
                <Text style={s.numBadgeTxt}>6</Text>
              </View>
              <Text style={s.cardTitle}>Precio unitario (COP)</Text>
              <Text style={s.req}> * obligatorio</Text>
            </View>
            <View style={s.precioRow}>
              <View style={s.precioPrefix}>
                <Text style={s.precioPrefixTxt}>$</Text>
              </View>
              <TextInput
                style={[s.input, s.precioInput]}
                placeholder="0"
                placeholderTextColor="#A1A1AA"
                value={precio}
                onChangeText={t => { setPrecio(t); setError(''); }}
                keyboardType="numeric"
              />
            </View>
            {precioNum > 0 && (
              <Text style={s.precioHint}>
                {fCOP(precioNum)}
                {parseInt(cantidad, 10) > 1
                  ? `  ·  Total: ${fCOP(precioNum * (parseInt(cantidad, 10) || 1))}`
                  : ''}
              </Text>
            )}
          </View>

          {/* ════════════════════════════════════════
              7. CANTIDAD
          ════════════════════════════════════════ */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.numBadge, { backgroundColor: BROWN }]}>
                <Text style={s.numBadgeTxt}>7</Text>
              </View>
              <Text style={s.cardTitle}>Cantidad encontrada</Text>
              <Text style={s.req}> * obligatorio</Text>
            </View>
            <View style={s.cantRow}>
              <TouchableOpacity
                style={s.cantMinus}
                onPress={() => setCantidad(String(Math.max(1, (parseInt(cantidad, 10) || 1) - 1)))}
              >
                <Ionicons name="remove" size={26} color={RED} />
              </TouchableOpacity>
              <TextInput
                style={s.cantInput}
                value={cantidad}
                onChangeText={setCantidad}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <TouchableOpacity
                style={[s.cantPlus, { backgroundColor: tienda.color }]}
                onPress={() => setCantidad(String((parseInt(cantidad, 10) || 0) + 1))}
              >
                <Ionicons name="add" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error global */}
          {error ? (
            <View style={s.errBox}>
              <Ionicons name="alert-circle" size={16} color={RED} style={{ marginRight: 8 }} />
              <Text style={s.errTxt}>{error}</Text>
            </View>
          ) : null}

          {/* Botón guardar */}
          <TouchableOpacity style={s.guardarBtn} onPress={guardar} activeOpacity={0.88}>
            <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={s.guardarTxt}>Registrar sobrante sin stock</Text>
          </TouchableOpacity>

          <Text style={s.footNote}>Puedes registrar varios artículos sin salir de esta pantalla.</Text>

          {/* ════════════════════════════════════════
              LISTA DE SOBRANTES REGISTRADOS
          ════════════════════════════════════════ */}
          {sobrantes.length > 0 && (
            <>
              <View style={s.listHeader}>
                <View style={s.listHeaderLeft}>
                  <Ionicons name="list" size={18} color={BROWN} style={{ marginRight: 8 }} />
                  <Text style={s.listTitle}>Registrados en esta tienda</Text>
                </View>
                <View style={[s.listCountBadge, { backgroundColor: BROWN }]}>
                  <Text style={s.listCountTxt}>{sobrantes.length}</Text>
                </View>
              </View>

              {sobrantes.map(item => (
                <View key={item.id} style={s.listCard}>
                  {/* Foto + info */}
                  <View style={s.listCardTop}>
                    {item.fotoUri ? (
                      <TouchableOpacity onPress={() => setFotoModal(item.fotoUri!)} activeOpacity={0.85}>
                        <Image source={{ uri: item.fotoUri }} style={s.listThumb} resizeMode="cover" />
                        <View style={s.listThumbOverlay}>
                          <Ionicons name="expand-outline" size={14} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={[s.listThumb, s.listThumbEmpty]}>
                        <Ionicons name="image-outline" size={22} color="#A1A1AA" />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={s.listCodeRow}>
                        <View style={[s.listCodeBadge, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[s.listCodeTxt, { color: BROWN }]}>{item.codigo}</Text>
                        </View>
                        {onEliminar && (
                          <TouchableOpacity
                            onPress={() =>
                              Alert.alert(
                                'Eliminar sobrante',
                                `¿Eliminar "${item.descripcion}"?`,
                                [
                                  { text: 'Cancelar', style: 'cancel' },
                                  { text: 'Eliminar', style: 'destructive', onPress: () => onEliminar(item.id) },
                                ],
                              )
                            }
                            style={s.listDeleteBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={17} color={RED} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={s.listDesc} numberOfLines={2}>{item.descripcion}</Text>
                      <Text style={s.listMeta}>
                        {item.ubicacion} · {item.cantidad} ud · {fCOP(item.precio)}
                      </Text>
                      <Text style={s.listAuditor}>{item.usuarioNombre} · {item.registradoEn}</Text>
                    </View>
                  </View>

                  {/* Estado toggle */}
                  {onEditarEstado && (
                    <View style={s.listEstadoRow}>
                      <TouchableOpacity
                        style={[
                          s.listEstadoBtn,
                          item.estado === 'CONFIRMADO' && { backgroundColor: GREEN, borderColor: GREEN },
                        ]}
                        onPress={() => onEditarEstado(item.id, 'CONFIRMADO')}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={item.estado === 'CONFIRMADO' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                          size={15}
                          color={item.estado === 'CONFIRMADO' ? '#fff' : GREEN}
                        />
                        <Text style={[s.listEstadoTxt, item.estado === 'CONFIRMADO' && { color: '#fff' }]}>
                          CONFIRMADO
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          s.listEstadoBtn,
                          item.estado === 'PENDIENTE' && { backgroundColor: AMBER, borderColor: AMBER },
                        ]}
                        onPress={() => onEditarEstado(item.id, 'PENDIENTE')}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={item.estado === 'PENDIENTE' ? 'time' : 'time-outline'}
                          size={15}
                          color={item.estado === 'PENDIENTE' ? '#fff' : AMBER}
                        />
                        <Text style={[s.listEstadoTxt, item.estado === 'PENDIENTE' && { color: '#fff' }]}>
                          PENDIENTE
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ════════════════════════════════════════
          MODAL FOTO FULLSCREEN
      ════════════════════════════════════════ */}
      <Modal visible={!!fotoModal} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={1}
          onPress={() => setFotoModal(null)}
        >
          {fotoModal && (
            <Image
              source={{ uri: fotoModal }}
              style={{ width: '95%', height: '75%' }}
              resizeMode="contain"
            />
          )}
          <View style={{ position: 'absolute', top: 54, right: 20 }}>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => setFotoModal(null)}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ════════════════════════════════════════
          MODAL ESCÁNER
      ════════════════════════════════════════ */}
      <Modal visible={scanModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {perm?.granted && (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={handleScan}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a'],
              }}
            />
          )}

          {/* Top */}
          <View style={sc.top}>
            <TouchableOpacity style={sc.closeBtn} onPress={cerrarScanner}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={sc.topTxt}>Escanear código</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Marco de escaneo */}
          <View style={sc.frameArea}>
            <View style={sc.frame}>
              <View style={[sc.corner, sc.tl]} />
              <View style={[sc.corner, sc.tr]} />
              <View style={[sc.corner, sc.bl]} />
              <View style={[sc.corner, sc.br]} />
            </View>
            <Text style={sc.hint}>Apunta al código de barras del artículo</Text>
          </View>

          {/* Botón código ilegible */}
          <View style={sc.bottom}>
            <TouchableOpacity style={sc.manualBtn} onPress={cerrarScanner} activeOpacity={0.85}>
              <Ionicons name="warning-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={sc.manualTxt}>Código ilegible — Ingresar manualmente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── ESTILOS PANTALLA ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:         { backgroundColor: BROWN, padding: 20, paddingTop: 54, paddingBottom: 22 },
  backBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTag:      { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle:    { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 2 },
  headerSub:      { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  warningChip:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)', gap: 5 },
  warningTxt:     { fontSize: 11, fontWeight: '700', color: AMBER },

  successBanner:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15803D', padding: 14, paddingHorizontal: 20 },
  successTxt:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll:         { padding: 16, paddingBottom: 48 },

  infoCard:       { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A' },
  infoTxt:        { flex: 1, fontSize: 13, color: BROWN, lineHeight: 19 },

  card:           { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  numBadge:       { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  numBadgeTxt:    { fontSize: 12, fontWeight: '900', color: '#fff' },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: BLK },
  req:            { fontSize: 11, color: '#EF4444', fontWeight: '600' },

  codeRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanBtn:        { flexDirection: 'row', alignItems: 'center', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, gap: 6 },
  scanBtnTxt:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  codePreview:    { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#EDE9FE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  codePreviewTxt: { fontSize: 12, fontWeight: '800' },

  input:          { backgroundColor: '#F8F8F9', borderWidth: 1.5, borderColor: BRD, borderRadius: 13, height: 50, paddingHorizontal: 14, fontSize: 14, color: BLK },
  inputTall:      { height: 80, textAlignVertical: 'top', paddingTop: 14 },

  photoBtn:       { alignItems: 'center', borderWidth: 2, borderColor: BRD, borderStyle: 'dashed', borderRadius: 16, padding: 28, gap: 8 },
  photoBtnIcon:   { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center' },
  photoBtnTxt:    { fontSize: 14, fontWeight: '600', color: MTD },
  photoBtnSub:    { fontSize: 12, color: '#A1A1AA', textAlign: 'center' },
  photoWrap:      { borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoPreview:   { width: '100%', height: 200, borderRadius: 14 },
  photoOverlay:   { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  photoOverlayTxt:{ color: '#fff', fontWeight: '700', fontSize: 13 },

  estadoRow:      { gap: 10 },
  estadoBtn:      { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: BRD, borderRadius: 14, padding: 14, gap: 12 },
  estadoDot:      { width: 14, height: 14, borderRadius: 7 },
  estadoTxt:      { fontSize: 14, fontWeight: '700', color: BLK },
  estadoSub:      { fontSize: 11, color: MTD, marginTop: 2 },

  precioRow:      { flexDirection: 'row', alignItems: 'center' },
  precioPrefix:   { width: 46, height: 50, backgroundColor: '#F8F8F9', borderWidth: 1.5, borderRightWidth: 0, borderColor: BRD, borderTopLeftRadius: 13, borderBottomLeftRadius: 13, alignItems: 'center', justifyContent: 'center' },
  precioPrefixTxt:{ fontSize: 18, fontWeight: '800', color: MTD },
  precioInput:    { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  precioHint:     { marginTop: 8, fontSize: 13, fontWeight: '700', color: '#15803D' },

  cantRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cantMinus:      { width: 56, height: 56, borderRadius: 16, borderWidth: 2, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  cantPlus:       { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cantInput:      { flex: 1, height: 64, borderWidth: 2, borderColor: BRD, borderRadius: 16, textAlign: 'center', fontSize: 34, fontWeight: '900', color: BLK, backgroundColor: '#F8F8F9' },

  errBox:         { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 13, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  errTxt:         { fontSize: 13, color: '#DC2626', fontWeight: '600', flex: 1 },

  guardarBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BROWN, borderRadius: 16, height: 56, marginBottom: 12 },
  guardarTxt:     { color: '#fff', fontWeight: '800', fontSize: 16 },
  footNote:       { textAlign: 'center', fontSize: 12, color: '#A1A1AA', paddingBottom: 8 },

  // ── Lista de sobrantes registrados ─────────────────────────────────────────
  listHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  listHeaderLeft:   { flexDirection: 'row', alignItems: 'center' },
  listTitle:        { fontSize: 15, fontWeight: '800', color: BLK },
  listCountBadge:   { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  listCountTxt:     { fontSize: 12, fontWeight: '800', color: '#fff' },

  listCard:         { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  listCardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  listThumb:        { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  listThumbEmpty:   { backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center' },
  listThumbOverlay: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: 3 },

  listCodeRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  listCodeBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  listCodeTxt:      { fontSize: 11, fontWeight: '800' },
  listDeleteBtn:    { padding: 2 },

  listDesc:         { fontSize: 13, fontWeight: '700', color: BLK, marginBottom: 3, lineHeight: 18 },
  listMeta:         { fontSize: 11, color: MTD, marginBottom: 2 },
  listAuditor:      { fontSize: 10, color: '#A1A1AA' },

  listEstadoRow:    { flexDirection: 'row', gap: 8 },
  listEstadoBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: BRD, borderRadius: 10, paddingVertical: 8, gap: 5 },
  listEstadoTxt:    { fontSize: 11, fontWeight: '800', color: BLK },
});

// ─── ESTILOS MODAL ESCÁNER ────────────────────────────────────────────────────
const sc = StyleSheet.create({
  top:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 54, backgroundColor: 'rgba(0,0,0,0.65)' },
  closeBtn:  { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  topTxt:    { color: '#fff', fontSize: 15, fontWeight: '700' },

  frameArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame:     { width: 260, height: 200, position: 'relative' },
  corner:    { position: 'absolute', width: 32, height: 32, borderColor: '#fff', borderWidth: 3.5 },
  tl:        { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr:        { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl:        { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br:        { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  hint:      { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 20 },

  bottom:    { backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 40, alignItems: 'center' },
  manualBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.25)', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
  manualTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
