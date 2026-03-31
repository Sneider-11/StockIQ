import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, Image, Modal, Alert, SectionList, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tienda, Usuario, Registro, SobranteSinStock, CLSF } from '../constants/data';
import { fCOP } from '../utils/helpers';
import { Badge, Avatar } from '../components/common';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';

interface Props {
  usuario:               Usuario;
  tienda:                Tienda;
  registros:             Registro[];
  sobrantes:             SobranteSinStock[];
  esAdmin:               boolean;
  onVolver:              () => void;
  onEliminar?:           (id: string) => void;
  onEliminarSobrante?:   (id: string) => void;
}

export const MisRegistrosScreen: React.FC<Props> = ({
  usuario, tienda, registros, sobrantes, esAdmin, onVolver, onEliminar, onEliminarSobrante,
}) => {
  const [filtro,    setFiltro]    = useState('TODOS');
  const [busqueda,  setBusqueda]  = useState('');
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<'escaneos' | 'sobrantes'>('escaneos');

  const base       = registros.filter(r => r.tiendaId === tienda.id);
  const mis        = esAdmin ? base : base.filter(r => r.usuarioNombre === usuario.nombre);
  const bq         = busqueda.toLowerCase();
  const filtrados  = (filtro === 'TODOS' ? mis : mis.filter(r => r.clasificacion === filtro))
    .filter(r => bq === '' || r.itemId.toLowerCase().includes(bq) || r.descripcion.toLowerCase().includes(bq) || r.ubicacion.toLowerCase().includes(bq) || r.usuarioNombre.toLowerCase().includes(bq));
  const totalCosto = mis.reduce((a, r) => a + r.costoUnitario * r.cantidad, 0);

  // Sobrantes de esta tienda (ADMIN ve todos, CONTADOR solo los suyos)
  const misSobrantes = esAdmin
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

  const confirmarEliminarSobrante = (s: SobranteSinStock) => {
    Alert.alert(
      'Eliminar sobrante',
      `¿Eliminar "${s.descripcion}" (${s.codigo})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onEliminarSobrante?.(s.id) },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: LGR }}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onVolver} style={s.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <Ionicons name="arrow-back" size={20} color={BLK} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title} numberOfLines={1}>
            {esAdmin ? 'Todos los registros' : 'Mis registros'}
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
          accessibilityRole="tab"
          accessibilityState={{ selected: tabActiva === 'escaneos' }}
          accessibilityLabel={`Escaneos, ${mis.length} registros`}
        >
          <Ionicons
            name="scan-outline"
            size={14}
            color={tabActiva === 'escaneos' ? PRP : MTD}
            style={{ marginRight: 5 }}
            accessibilityElementsHidden={true}
          />
          <Text style={[s.tabTxt, tabActiva === 'escaneos' && s.tabTxtActiva]}>
            Escaneos · {mis.length}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tabActiva === 'sobrantes' && s.tabActiva]}
          onPress={() => setTabActiva('sobrantes')}
          accessibilityRole="tab"
          accessibilityState={{ selected: tabActiva === 'sobrantes' }}
          accessibilityLabel={`Sobrantes sin stock, ${misSobrantes.length} registros`}
        >
          <Ionicons
            name="add-circle-outline"
            size={14}
            color={tabActiva === 'sobrantes' ? '#92400E' : MTD}
            style={{ marginRight: 5 }}
            accessibilityElementsHidden={true}
          />
          <Text style={[s.tabTxt, tabActiva === 'sobrantes' && { color: '#92400E', fontWeight: '700' }]}>
            Sobrantes sin Stock · {misSobrantes.length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido: Escaneos */}
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
                  accessibilityRole="tab"
                  accessibilityState={{ selected: act }}
                  accessibilityLabel={`${cfg.label}, ${cnt} artículos`}
                >
                  {!isAll && <View style={[s.chipDot, { backgroundColor: act ? 'rgba(255,255,255,0.7)' : cfg.dot }]} />}
                  <Text style={[s.chipTxt, act && { color: '#fff', fontWeight: '700' }]}>
                    {cfg.label} · {cnt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Lista escaneos */}
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
                <View style={s.card}>
                  <View style={s.cardTop}>
                    <View style={[s.codeTag, { borderLeftColor: cfg.dot }]}>
                      <Text style={[s.codeTxt, { color: tienda.color }]} numberOfLines={1}>{r.itemId}</Text>
                    </View>
                    <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                    {esAdmin && onEliminar && (
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
                    {esAdmin && (
                      <>
                        <Avatar nombre={r.usuarioNombre} size={18} bg="#27272A" />
                        <Text style={s.metaTxt} numberOfLines={1}> {r.usuarioNombre} · </Text>
                      </>
                    )}
                    <Ionicons name="time-outline" size={11} color="#D4D4D8" />
                    <Text style={s.metaTxt} numberOfLines={1}> {r.escaneadoEn}</Text>
                  </View>
                </View>
              );
            }}
          />
        </>
      )}

      {/* Contenido: Sobrantes sin Stock */}
      {tabActiva === 'sobrantes' && (
        <FlatList
          data={misSobrantes}
          keyExtractor={s => s.id}
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
                {esAdmin && onEliminarSobrante && (
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

              {/* Precio y cantidad */}
              <View style={s.qtyRow}>
                {[
                  { l: 'Precio unit.', v: fCOP(sb.precio),           c: BLK },
                  { l: 'Cantidad',     v: String(sb.cantidad),        c: BLK },
                  { l: 'Total',        v: fCOP(sb.precio * sb.cantidad), c: '#15803D' },
                ].map(q => (
                  <View key={q.l} style={s.qtyBox}>
                    <Text style={s.qtyLbl}>{q.l}</Text>
                    <Text style={[s.qtyVal, { color: q.c }]} numberOfLines={1}>{q.v}</Text>
                  </View>
                ))}
              </View>

              {sb.fotoUri ? (
                <TouchableOpacity
                  style={s.fotoWrap}
                  onPress={() => setFotoModal(sb.fotoUri)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: sb.fotoUri }} style={s.fotoThumb} resizeMode="cover" />
                  <View style={s.fotoOverlay}>
                    <Ionicons name="expand-outline" size={14} color="#fff" />
                    <Text style={s.fotoOverlayTxt}>Ver foto</Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              <View style={s.metaRow}>
                {esAdmin && (
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

      {/* Modal foto fullscreen */}
      <Modal
        visible={!!fotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoModal(null)}
      >
        <TouchableOpacity
          style={s.modalBg}
          activeOpacity={1}
          onPress={() => setFotoModal(null)}
        >
          <View style={s.modalClose}>
            <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.8)" />
          </View>
          {fotoModal && (
            <Image
              source={{ uri: fotoModal }}
              style={s.modalImg}
              resizeMode="contain"
            />
          )}
          <Text style={s.modalHint}>Toca en cualquier lugar para cerrar</Text>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

const s = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 54, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  backBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  title:     { fontSize: 18, fontWeight: '800', color: BLK },
  sub:       { fontSize: 12, color: MTD, marginTop: 2 },

  // Búsqueda
  searchBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD, height: 48 },
  searchInput: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, color: BLK },

  // Tabs
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

  card:      { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
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

  modalBg:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  modalClose: { position: 'absolute', top: 56, right: 20 },
  modalImg:   { width: '95%', aspectRatio: 4 / 3, borderRadius: 16 },
  modalHint:  { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 },
});
