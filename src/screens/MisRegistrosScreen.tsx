import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, Image, Modal, Alert, TextInput,
  Animated, Easing, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tienda, Usuario, Registro, SobranteSinStock, CLSF } from '../constants/data';
import { fCOP, clasificar } from '../utils/helpers';
import { Badge, Avatar } from '../components/common';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';
import { useThemeColors } from '../hooks/useThemeColors';

interface Props {
  usuario:               Usuario;
  tienda:                Tienda;
  registros:             Registro[];
  sobrantes:             SobranteSinStock[];
  esAdmin:               boolean;
  /** Fuerza mostrar solo los registros propios aunque esAdmin sea true */
  forzarSoloMios?:       boolean;
  onVolver:              () => void;
  onEliminar?:           (id: string) => void;
  onEliminarSobrante?:   (id: string) => void;
  onEditarRegistro?:     (id: string, cambios: Partial<Pick<Registro, 'cantidad' | 'nota'>>) => void;
}

export const MisRegistrosScreen: React.FC<Props> = ({
  usuario, tienda, registros, sobrantes, esAdmin, forzarSoloMios = false,
  onVolver, onEliminar, onEliminarSobrante, onEditarRegistro,
}) => {
  // ── Filtros de la lista ────────────────────────────────────────────────────
  const [filtro,    setFiltro]    = useState('TODOS');
  const [busqueda,  setBusqueda]  = useState('');
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<'escaneos' | 'sobrantes'>('escaneos');

  // ── Estado del modal de detalle de artículo ───────────────────────────────
  const [detalleReg,   setDetalleReg]   = useState<Registro | null>(null);
  const [editRegId,    setEditRegId]    = useState<string | null>(null);
  const [editCantidad, setEditCantidad] = useState('');

  // ── Animaciones del bottom-sheet ──────────────────────────────────────────
  const sheetY      = useRef(new Animated.Value(700)).current;
  const bgOpacity   = useRef(new Animated.Value(0)).current;
  const editOpacity = useRef(new Animated.Value(0)).current;
  // Desplazamiento del pan gesture (swipe-down para cerrar)
  const panDy       = useRef(new Animated.Value(0)).current;

  const SPRING = { tension: 70, friction: 13, useNativeDriver: true } as const;
  const FADE   = { duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true } as const;

  useEffect(() => {
    if (detalleReg) {
      sheetY.setValue(700);
      bgOpacity.setValue(0);
      panDy.setValue(0);
      Animated.parallel([
        Animated.timing(bgOpacity, { ...FADE, toValue: 1 }),
        Animated.spring(sheetY,    { ...SPRING, toValue: 0 }),
      ]).start();
    }
  }, [detalleReg]);

  useEffect(() => {
    if (editRegId) {
      editOpacity.setValue(0);
      Animated.timing(editOpacity, { duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true, toValue: 1 }).start();
    }
  }, [editRegId]);

  const cerrarDetalle = () => {
    if (editRegId) { setEditRegId(null); return; }
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sheetY,    { toValue: 700, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => { panDy.setValue(0); setDetalleReg(null); });
  };

  // ── Pan responder: deslizar el handle hacia abajo cierra el sheet ─────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:       () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 6 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove:          (_, gs) => { if (gs.dy > 0) panDy.setValue(gs.dy); },
      onPanResponderRelease:       (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.4) {
          panDy.setValue(0);
          cerrarDetalle();
        } else {
          Animated.spring(panDy, { toValue: 0, useNativeDriver: true, tension: 120, friction: 15 }).start();
        }
      },
    })
  ).current;

  // ── Permisos de edición ────────────────────────────────────────────────────
  /**
   * Un usuario puede editar un registro si:
   * 1. Es su propio registro, O
   * 2. Es admin en modo "Todos los registros" (esAdmin && !forzarSoloMios)
   *
   * Regla de seguridad: ningún auditor/contador puede editar el conteo de otro.
   */
  const puedeEditar = (reg: Registro): boolean => {
    if (reg.usuarioNombre === usuario.nombre) return true;
    if (esAdmin && !forzarSoloMios) return true;
    return false;
  };

  const guardarEdicion = () => {
    if (!editRegId) return;
    const cant = parseInt(editCantidad, 10);
    if (isNaN(cant) || cant < 0) { Alert.alert('Cantidad inválida', 'Ingresa un número igual o mayor a cero.'); return; }
    onEditarRegistro?.(editRegId, { cantidad: cant });
    setEditRegId(null);
  };

  // ── Filtrado de la lista principal ────────────────────────────────────────
  const base      = registros.filter(r => r.tiendaId === tienda.id);
  const mis       = (esAdmin && !forzarSoloMios)
    ? base
    : base.filter(r => r.usuarioNombre === usuario.nombre);
  const bq        = busqueda.toLowerCase();
  const filtrados = (filtro === 'TODOS' ? mis : mis.filter(r => r.clasificacion === filtro))
    .filter(r =>
      bq === '' ||
      r.itemId.toLowerCase().includes(bq) ||
      r.descripcion.toLowerCase().includes(bq) ||
      r.ubicacion.toLowerCase().includes(bq) ||
      r.usuarioNombre.toLowerCase().includes(bq),
    );
  const totalCosto = mis.reduce((a, r) => a + r.costoUnitario * r.cantidad, 0);

  const misSobrantes = (esAdmin && !forzarSoloMios)
    ? sobrantes.filter(s => s.tiendaId === tienda.id)
    : sobrantes.filter(s => s.tiendaId === tienda.id && s.usuarioNombre === usuario.nombre);

  const FILTROS = ['TODOS', 'SIN_DIF', 'FALTANTE', 'SOBRANTE', 'CERO'];

  const confirmarEliminar = (r: Registro) => {
    Alert.alert(
      'Eliminar registro',
      `¿Eliminar el escaneo de "${r.descripcion}" (${r.itemId})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onEliminar?.(r.id) },
      ],
    );
  };

  const confirmarEliminarSobrante = (sb: SobranteSinStock) => {
    Alert.alert(
      'Eliminar sobrante',
      `¿Eliminar "${sb.descripcion}" (${sb.codigo})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onEliminarSobrante?.(sb.id) },
      ],
    );
  };

  // ── Datos del modal ────────────────────────────────────────────────────────
  // Todos los conteos para el artículo que se seleccionó (de TODA la tienda)
  const hermanos = detalleReg ? base.filter(r => r.itemId === detalleReg.itemId) : [];
  const totalContado = hermanos.reduce((s, r) => s + r.cantidad, 0);
  const delta        = detalleReg ? totalContado - detalleReg.stockSistema : 0;
  const clsfArticulo = detalleReg ? clasificar(detalleReg.stockSistema, totalContado) : 'CERO';
  const cfgArticulo  = (CLSF as any)[clsfArticulo] ?? { label: clsfArticulo, color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: LGR }}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onVolver} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={BLK} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title} numberOfLines={1}>
            {forzarSoloMios ? 'Mis registros' : esAdmin ? 'Todos los registros' : 'Mis registros'}
          </Text>
          <Text style={s.sub} numberOfLines={1}>
            {tienda.nombre} · {mis.length} escaneos · {misSobrantes.length} sobrantes
          </Text>
        </View>
      </View>

      {/* Búsqueda */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={MTD} style={{ marginLeft: 12 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por código, descripción o usuario..."
          placeholderTextColor="#A1A1AA"
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
        />
        {busqueda !== '' && (
          <TouchableOpacity onPress={() => setBusqueda('')} style={{ paddingHorizontal: 12 }}>
            <Ionicons name="close-circle" size={16} color={MTD} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs: Escaneos / Sobrantes */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tabActiva === 'escaneos' && s.tabActiva]}
          onPress={() => setTabActiva('escaneos')}
        >
          <Ionicons name="scan-outline" size={14} color={tabActiva === 'escaneos' ? PRP : MTD} style={{ marginRight: 5 }} />
          <Text style={[s.tabTxt, tabActiva === 'escaneos' && s.tabTxtActiva]}>
            Escaneos · {mis.length}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tabActiva === 'sobrantes' && s.tabActiva]}
          onPress={() => setTabActiva('sobrantes')}
        >
          <Ionicons name="add-circle-outline" size={14} color={tabActiva === 'sobrantes' ? '#92400E' : MTD} style={{ marginRight: 5 }} />
          <Text style={[s.tabTxt, tabActiva === 'sobrantes' && { color: '#92400E', fontWeight: '700' }]}>
            Sobrantes sin Stock · {misSobrantes.length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab: Escaneos ── */}
      {tabActiva === 'escaneos' && (
        <>
          {/* Chips de filtro */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.filterBar}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
          >
            {FILTROS.map(f => {
              const isAll = f === 'TODOS';
              const cfg   = isAll ? { label: 'Todos', dot: '#A1A1AA', color: MTD } : CLSF[f as keyof typeof CLSF];
              const cnt   = isAll ? mis.length : mis.filter(r => r.clasificacion === f).length;
              const act   = filtro === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[s.chip, act && { backgroundColor: PRP, borderColor: PRP }]}
                  onPress={() => setFiltro(f)}
                >
                  {!isAll && <View style={[s.chipDot, { backgroundColor: act ? 'rgba(255,255,255,0.7)' : cfg.dot }]} />}
                  <Text style={[s.chipTxt, act && { color: '#fff', fontWeight: '700' }]}>
                    {cfg.label} · {cnt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Lista de escaneos — cada card es tappable */}
          <FlatList
            data={filtrados}
            keyExtractor={r => r.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 56 }}>
                <View style={s.emptyIcon}>
                  <Ionicons name="cube-outline" size={32} color="#A1A1AA" />
                </View>
                <Text style={s.emptyTxt}>Sin artículos con este filtro</Text>
              </View>
            }
            renderItem={({ item: r }) => {
              const cfg   = CLSF[r.clasificacion];
              const delta = r.cantidad - r.stockSistema;
              return (
                /* ── Cada card abre el detalle del artículo ── */
                <TouchableOpacity
                  style={s.card}
                  onPress={() => setDetalleReg(r)}
                  activeOpacity={0.88}
                >
                  <View style={s.cardTop}>
                    <View style={[s.codeTag, { borderLeftColor: cfg.dot }]}>
                      <Text style={[s.codeTxt, { color: tienda.color }]} numberOfLines={1}>{r.itemId}</Text>
                    </View>
                    <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                    {(esAdmin && !forzarSoloMios) && onEliminar && (
                      <TouchableOpacity
                        style={s.deleteBtn}
                        onPress={() => confirmarEliminar(r)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={s.descTxt} numberOfLines={2}>{r.descripcion}</Text>
                  <Text style={s.ubicTxt} numberOfLines={1}>{r.ubicacion}</Text>

                  <View style={s.qtyRow}>
                    {[
                      { l: 'Sistema',    v: String(r.stockSistema), c: MTD },
                      { l: 'Contado',    v: String(r.cantidad),     c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                      { l: 'Diferencia', v: (delta > 0 ? '+' : '') + delta, c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                      { l: 'Impacto',    v: delta !== 0 ? fCOP(Math.abs(r.costoUnitario * delta)) : '—', c: MTD },
                    ].map(q => (
                      <View key={q.l} style={s.qtyBox}>
                        <Text style={s.qtyLbl}>{q.l}</Text>
                        <Text style={[s.qtyVal, { color: q.c }]} numberOfLines={1}>{q.v}</Text>
                      </View>
                    ))}
                  </View>

                  {r.nota ? (
                    <View style={s.notaRow}>
                      <Ionicons name="chatbubble-outline" size={12} color="#92400E" style={{ marginRight: 6 }} />
                      <Text style={s.notaTxt}>{r.nota}</Text>
                    </View>
                  ) : null}

                  {r.fotoUri ? (
                    <TouchableOpacity
                      style={s.fotoWrap}
                      onPress={() => setFotoModal(r.fotoUri!)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: r.fotoUri }} style={s.fotoThumb} resizeMode="cover" />
                      <View style={s.fotoOverlay}>
                        <Ionicons name="expand-outline" size={14} color="#fff" />
                        <Text style={s.fotoOverlayTxt}>Ver foto</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  <View style={s.metaRow}>
                    {(esAdmin && !forzarSoloMios) && (
                      <>
                        <Avatar nombre={r.usuarioNombre} size={18} bg="#27272A" />
                        <Text style={s.metaTxt} numberOfLines={1}> {r.usuarioNombre} · </Text>
                      </>
                    )}
                    <Ionicons name="time-outline" size={11} color="#D4D4D8" />
                    <Text style={s.metaTxt} numberOfLines={1}> {r.escaneadoEn}</Text>
                    <Ionicons name="chevron-forward" size={12} color="#D4D4D8" style={{ marginLeft: 'auto' as any }} />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

      {/* ── Tab: Sobrantes sin Stock ── */}
      {tabActiva === 'sobrantes' && (
        <FlatList
          data={misSobrantes}
          keyExtractor={sb => sb.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
          ListHeaderComponent={
            misSobrantes.length > 0 ? (
              <View style={s.sobrantesHeader}>
                <Ionicons name="information-circle-outline" size={14} color="#92400E" style={{ marginRight: 6 }} />
                <Text style={s.sobrantesHeaderTxt}>
                  Artículos hallados que no están en el catálogo de inventario
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 56 }}>
              <View style={s.emptyIcon}>
                <Ionicons name="add-circle-outline" size={32} color="#A1A1AA" />
              </View>
              <Text style={s.emptyTxt}>Sin sobrantes registrados en esta tienda</Text>
            </View>
          }
          renderItem={({ item: sb }) => (
            <View style={s.sobranteCard}>
              <View style={s.cardTop}>
                <View style={[s.codeTag, { borderLeftColor: '#B45309' }]}>
                  <Text style={[s.codeTxt, { color: '#92400E' }]} numberOfLines={1}>{sb.codigo}</Text>
                </View>
                <View style={[s.estadoBadge, sb.estado === 'CONFIRMADO'
                  ? { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }
                  : { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }
                ]}>
                  <View style={[s.estadoDot, { backgroundColor: sb.estado === 'CONFIRMADO' ? '#22C55E' : '#F59E0B' }]} />
                  <Text style={[s.estadoTxt, { color: sb.estado === 'CONFIRMADO' ? '#15803D' : '#92400E' }]}>
                    {sb.estado}
                  </Text>
                </View>
                {(esAdmin && !forzarSoloMios) && onEliminarSobrante && (
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => confirmarEliminarSobrante(sb)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={s.descTxt} numberOfLines={2}>{sb.descripcion}</Text>
              <Text style={s.ubicTxt} numberOfLines={1}>{sb.ubicacion}</Text>

              <View style={s.qtyRow}>
                {[
                  { l: 'Precio unit.', v: fCOP(sb.precio),              c: BLK },
                  { l: 'Cantidad',     v: String(sb.cantidad),           c: BLK },
                  { l: 'Total',        v: fCOP(sb.precio * sb.cantidad), c: '#15803D' },
                ].map(q => (
                  <View key={q.l} style={s.qtyBox}>
                    <Text style={s.qtyLbl}>{q.l}</Text>
                    <Text style={[s.qtyVal, { color: q.c }]} numberOfLines={1}>{q.v}</Text>
                  </View>
                ))}
              </View>

              {sb.fotoUri ? (
                <TouchableOpacity style={s.fotoWrap} onPress={() => setFotoModal(sb.fotoUri)} activeOpacity={0.85}>
                  <Image source={{ uri: sb.fotoUri }} style={s.fotoThumb} resizeMode="cover" />
                  <View style={s.fotoOverlay}>
                    <Ionicons name="expand-outline" size={14} color="#fff" />
                    <Text style={s.fotoOverlayTxt}>Ver foto</Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              <View style={s.metaRow}>
                {(esAdmin && !forzarSoloMios) && (
                  <>
                    <Avatar nombre={sb.usuarioNombre} size={18} bg="#27272A" />
                    <Text style={s.metaTxt} numberOfLines={1}> {sb.usuarioNombre} · </Text>
                  </>
                )}
                <Ionicons name="time-outline" size={11} color="#D4D4D8" />
                <Text style={s.metaTxt} numberOfLines={1}> {sb.registradoEn}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* ══ MODAL: FOTO FULLSCREEN ══════════════════════════════════════════════ */}
      <Modal visible={!!fotoModal} transparent animationType="fade" onRequestClose={() => setFotoModal(null)}>
        <TouchableOpacity style={s.fotoBg} activeOpacity={1} onPress={() => setFotoModal(null)}>
          <View style={s.fotoClose}>
            <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.8)" />
          </View>
          {fotoModal && (
            <Image source={{ uri: fotoModal }} style={s.fotoFullImg} resizeMode="contain" />
          )}
          <Text style={s.fotoHint}>Toca en cualquier lugar para cerrar</Text>
        </TouchableOpacity>
      </Modal>

      {/* ══ MODAL: DETALLE DEL ARTÍCULO ════════════════════════════════════════ */}
      <Modal
        visible={!!detalleReg}
        animationType="none"
        transparent
        onRequestClose={cerrarDetalle}
      >
        <View style={s.detalleModalBg}>

          {/* Fondo oscuro animado — solo visual, no bloquea toques */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: bgOpacity }]}
            pointerEvents="none"
          />

          {/* Tap en el fondo cierra el modal */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={cerrarDetalle}
          />

          <Animated.View style={[s.detalleSheet, { transform: [{ translateY: sheetY }, { translateY: panDy }] }]}>
            {/* Handle — área de agarre para deslizar hacia abajo */}
            <View {...panResponder.panHandlers} style={s.handleArea}>
              <View style={s.modalHandle} />
            </View>

            {detalleReg && (
              <>
                {/* Header con color del artículo */}
                <View style={[s.detalleHeader, { backgroundColor: cfgArticulo.bg }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.detalleEstado, { color: cfgArticulo.color }]}>{cfgArticulo.label}</Text>
                    <Text style={s.detalleRef} numberOfLines={1}>{detalleReg.itemId}</Text>
                  </View>
                  <TouchableOpacity onPress={cerrarDetalle} style={s.detalleClose}>
                    <Ionicons name="close" size={20} color={BLK} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Descripción y ubicación */}
                  <Text style={s.detalleDesc}>{detalleReg.descripcion}</Text>
                  <Text style={s.detalleUbic}>{detalleReg.ubicacion}</Text>

                  {/* Grid de datos del artículo (suma de todos los conteos) */}
                  <View style={s.detalleGrid}>
                    {[
                      { l: 'Stock sistema',   v: String(detalleReg.stockSistema), c: MTD },
                      { l: 'Total contado',   v: String(totalContado),            c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                      { l: 'Diferencia',      v: (delta > 0 ? '+' : '') + delta,  c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                      { l: 'Valor unitario',  v: fCOP(detalleReg.costoUnitario),  c: MTD },
                      { l: 'Impacto total',   v: delta !== 0 ? (delta > 0 ? '+' : '') + fCOP(Math.abs(delta * detalleReg.costoUnitario)) : '—', c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                    ].map(q => (
                      <View key={q.l} style={s.detalleGridBox}>
                        <Text style={s.detalleGridLbl}>{q.l}</Text>
                        <Text style={[s.detalleGridVal, { color: q.c }]} numberOfLines={1} adjustsFontSizeToFit>{q.v}</Text>
                      </View>
                    ))}
                  </View>

                  {/* ── Lista de TODOS los conteos de este artículo ── */}
                  <Text style={[s.secTitle, { marginTop: 16, marginBottom: 10 }]}>
                    Conteos de este artículo ({hermanos.length})
                  </Text>

                  {hermanos.length === 0 ? (
                    <View style={{ padding: 20, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BRD, alignItems: 'center' }}>
                      <Ionicons name="cube-outline" size={28} color="#A1A1AA" />
                      <Text style={{ color: '#A1A1AA', fontSize: 13, marginTop: 8 }}>Sin conteos registrados</Text>
                    </View>
                  ) : hermanos.map((reg, idx) => {
                    const esPropio  = reg.usuarioNombre === usuario.nombre;
                    const puedEdit  = puedeEditar(reg);
                    const cfgReg    = CLSF[reg.clasificacion];
                    return (
                      <View key={reg.id} style={[s.regRow, esPropio && { borderLeftColor: tienda.color, borderLeftWidth: 3 }]}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Avatar nombre={reg.usuarioNombre} size={26} bg={esPropio ? tienda.color : '#27272A'} />
                              <View>
                                <Text style={s.regUsuario} numberOfLines={1}>
                                  {reg.usuarioNombre}
                                  {esPropio && <Text style={{ color: tienda.color }}> (tú)</Text>}
                                </Text>
                                <Text style={s.regFecha} numberOfLines={1}>{reg.escaneadoEn}</Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={[s.regBadge, { backgroundColor: cfgReg.bg }]}>
                                <Text style={[s.regBadgeTxt, { color: cfgReg.color }]}>{reg.cantidad} und.</Text>
                              </View>
                              {puedEdit && onEditarRegistro ? (
                                <TouchableOpacity
                                  style={s.editBtn}
                                  onPress={() => { setEditRegId(reg.id); setEditCantidad(String(reg.cantidad)); }}
                                >
                                  <Ionicons name="pencil-outline" size={15} color={PRP} />
                                </TouchableOpacity>
                              ) : (
                                /* Candado visual para registros ajenos — solo lectura */
                                <View style={s.lockBtn}>
                                  <Ionicons name="lock-closed-outline" size={13} color="#A1A1AA" />
                                </View>
                              )}
                            </View>
                          </View>
                          {reg.nota ? (
                            <Text style={s.regNota} numberOfLines={2}>"{reg.nota}"</Text>
                          ) : null}
                          {!esPropio && (
                            <Text style={s.readOnlyHint}>Solo lectura — conteo de otro auditor</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* ── Overlay: editar cantidad ── */}
            {editRegId && (
              <Animated.View style={[StyleSheet.absoluteFillObject, s.editOverlayBg, { opacity: editOpacity }]}>
                <View style={s.editCard} onStartShouldSetResponder={() => true}>
                  <Text style={s.editTitle}>Editar cantidad</Text>
                  <Text style={s.editSub}>
                    {hermanos.find(r => r.id === editRegId)?.descripcion ?? ''}
                  </Text>
                  <TextInput
                    style={s.editInput}
                    value={editCantidad}
                    onChangeText={setEditCantidad}
                    keyboardType="numeric"
                    placeholder="Nueva cantidad"
                    placeholderTextColor="#A1A1AA"
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <TouchableOpacity
                      style={[s.editAction, { backgroundColor: LGR, flex: 1 }]}
                      onPress={() => setEditRegId(null)}
                    >
                      <Text style={{ color: BLK, fontWeight: '700', fontSize: 14 }}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.editAction, { backgroundColor: PRP, flex: 1 }]}
                      onPress={guardarEdicion}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </Modal>

    </View>
  );
};

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Estructura principal
  header:    { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 54, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  backBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  title:     { fontSize: 18, fontWeight: '800', color: BLK },
  sub:       { fontSize: 12, color: MTD, marginTop: 2 },

  searchBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD, height: 48 },
  searchInput: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, color: BLK },

  tabs:         { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  tabActiva:    { borderBottomWidth: 2, borderBottomColor: PRP },
  tabTxt:       { fontSize: 13, color: MTD, fontWeight: '500' },
  tabTxtActiva: { color: PRP, fontWeight: '700' },

  filterBar: { flexGrow: 0, flexShrink: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  chip:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: LGR, borderWidth: 1, borderColor: BRD, gap: 5 },
  chipDot:   { width: 7, height: 7, borderRadius: 4 },
  chipTxt:   { fontSize: 12, color: MTD, fontWeight: '500' },

  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', borderWidth: 1, borderColor: BRD, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTxt:  { fontSize: 13, color: '#A1A1AA' },

  sobrantesHeader:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  sobrantesHeaderTxt: { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 17 },

  // Cards de lista
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sobranteCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTop:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  codeTag:   { backgroundColor: LGR, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderLeftWidth: 3, flexShrink: 1 },
  codeTxt:   { fontSize: 11, fontWeight: '800' },
  deleteBtn: { marginLeft: 'auto' as any, width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  estadoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, gap: 5, flexShrink: 0 },
  estadoDot:   { width: 6, height: 6, borderRadius: 3 },
  estadoTxt:   { fontSize: 10, fontWeight: '700' },

  descTxt:   { fontSize: 14, fontWeight: '700', color: BLK, marginBottom: 2 },
  ubicTxt:   { fontSize: 11, fontWeight: '600', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },

  qtyRow:    { flexDirection: 'row', backgroundColor: LGR, borderRadius: 10, padding: 10, marginBottom: 8 },
  qtyBox:    { flex: 1, alignItems: 'center', minWidth: 0 },
  qtyLbl:    { fontSize: 9, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  qtyVal:    { fontSize: 13, fontWeight: '800', color: BLK },

  notaRow:   { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 8, padding: 9, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#FDE68A' },
  notaTxt:   { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 17 },

  fotoWrap:       { borderRadius: 12, overflow: 'hidden', marginBottom: 8, position: 'relative' },
  fotoThumb:      { width: '100%', height: 150, borderRadius: 12 },
  fotoOverlay:    { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
  fotoOverlayTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  metaRow:   { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: LGR, gap: 3 },
  metaTxt:   { fontSize: 11, color: '#A1A1AA', flexShrink: 1 },

  // Modal foto fullscreen
  fotoBg:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  fotoClose:  { position: 'absolute', top: 56, right: 20 },
  fotoFullImg:{ width: '95%', aspectRatio: 4 / 3, borderRadius: 16 },
  fotoHint:   { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 },

  // Modal detalle de artículo — bottom sheet
  detalleModalBg: { flex: 1, justifyContent: 'flex-end' },
  detalleSheet:   { backgroundColor: LGR, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%' },
  handleArea:     { paddingVertical: 12, alignItems: 'center' },
  modalHandle:    { width: 44, height: 5, backgroundColor: '#D4D4D8', borderRadius: 3 },

  detalleHeader:  { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BRD },
  detalleEstado:  { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  detalleRef:     { fontSize: 16, fontWeight: '900', color: BLK },
  detalleClose:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E4E4E7', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },

  detalleDesc: { fontSize: 15, fontWeight: '700', color: BLK, marginBottom: 3 },
  detalleUbic: { fontSize: 11, color: '#A1A1AA', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 14 },

  detalleGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  detalleGridBox: { width: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BRD, flexGrow: 1 },
  detalleGridLbl: { fontSize: 9, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 },
  detalleGridVal: { fontSize: 16, fontWeight: '900', color: BLK },

  secTitle: { fontSize: 13, fontWeight: '800', color: BLK },

  // Filas de conteos individuales dentro del modal
  regRow:       { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BRD },
  regUsuario:   { fontSize: 13, fontWeight: '700', color: BLK },
  regFecha:     { fontSize: 11, color: MTD, marginTop: 1 },
  regNota:      { fontSize: 12, color: '#92400E', fontStyle: 'italic', marginTop: 4 },
  regBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  regBadgeTxt:  { fontSize: 12, fontWeight: '800' },
  editBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  lockBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center' },
  readOnlyHint: { fontSize: 10, color: '#A1A1AA', marginTop: 4, fontStyle: 'italic' },

  // Overlay de edición dentro del bottom-sheet
  editOverlayBg: { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  editCard:      { backgroundColor: '#fff', borderRadius: 20, padding: 22, width: '88%', shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 12 },
  editTitle:     { fontSize: 17, fontWeight: '800', color: BLK, marginBottom: 4 },
  editSub:       { fontSize: 12, color: MTD, marginBottom: 14 },
  editInput:     { borderWidth: 1.5, borderColor: PRP, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '700', color: BLK, textAlign: 'center' },
  editAction:    { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
