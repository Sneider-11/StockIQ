import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, Share, Image, Modal, TextInput, Alert,
  Animated, Easing,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { Ionicons } from '@expo/vector-icons';
import { Tienda, Registro, Articulo, SobranteSinStock, CLSF, CATALOGO_BASE, Usuario } from '../constants/data';
import { clasificar, fCOP, formatFechaDisplay } from '../utils/helpers';
import { Avatar, AnimatedCounter } from '../components/common';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';
import { useThemeColors } from '../hooks/useThemeColors';

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Props {
  registros:        Registro[];
  tienda:           Tienda;
  catalogo:         Articulo[];
  sobrantes:        SobranteSinStock[];
  usuarios:         Usuario[];
  esAdmin:          boolean;
  confirmadosCero:  string[];
  onBack:           () => void;
  onEliminarRegistro?: (id: string) => void;
  onEditarRegistro?:  (id: string, cambios: Partial<Pick<Registro, 'cantidad' | 'nota'>>) => void;
  onConfirmarCero?:   (itemId: string) => void;
  onDesconfirmarCero?:(itemId: string) => void;
}

type Tab    = 'resumen' | 'articulos' | 'equipo';
type Filtro = 'TODOS' | 'SIN_DIF' | 'FALTANTE' | 'SOBRANTE' | 'CERO' | 'SIN_STOCK';

// Vista unificada de un artículo del catálogo con sus conteos
interface ArticuloVista {
  itemId:      string;
  descripcion: string;
  ubicacion:   string;
  stock:       number;
  costo:       number;
  registros:   Registro[];         // todos los conteos individuales
  conteoTotal: number;             // suma de todos los conteos
  clasificacion: string;           // SIN_DIF | FALTANTE | SOBRANTE | CERO
  confirmado:  boolean;            // conteo cero confirmado por admin
  esSobrante:  false;
}
interface SobranteVista extends SobranteSinStock {
  esSobrante: true;
}
type ItemVista = ArticuloVista | SobranteVista;

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
const DSIZE = 200;
const STROKE = 30;
interface DonutSeg { value: number; color: string; }

const DonutChart: React.FC<{ segments: DonutSeg[]; centerLabel: string; centerSub: string }> = ({
  segments, centerLabel, centerSub,
}) => {
  const tc            = useThemeColors();
  const r             = (DSIZE - STROKE) / 2;
  const cx            = DSIZE / 2;
  const cy            = DSIZE / 2;
  const circumference = 2 * Math.PI * r;
  const circ          = circumference.toFixed(2);
  const total         = segments.reduce((a, s) => a + s.value, 0);

  // Un Animated.Value fijo por slot (4 = máximo de clasificaciones posibles)
  // No se inicializa desde segments.length para evitar desajuste si el array cambia.
  const drawAnims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;
  const centerScale = useRef(new Animated.Value(0.7)).current;
  const centerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    drawAnims.forEach(a => a.setValue(0));
    centerScale.setValue(0.7);
    centerOpacity.setValue(0);

    // Stagger draw: each segment draws in after the previous
    const drawSeq = Animated.stagger(90, drawAnims.map(a =>
      Animated.timing(a, {
        toValue:         1,
        duration:        650,
        easing:          Easing.out(Easing.cubic),
        useNativeDriver: false,   // SVG props can't use native driver
      }),
    ));
    // Center label pops in after all segments start drawing
    const centerAnim = Animated.parallel([
      Animated.spring(centerScale,   { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(centerOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]);

    drawSeq.start();
    setTimeout(() => centerAnim.start(), 200);

    return () => { drawSeq.stop(); centerAnim.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let cumLen = 0;
  return (
    <View style={{ width: DSIZE, height: DSIZE, alignSelf: 'center' }}>
      <Svg width={DSIZE} height={DSIZE}>
        {/* Track ring */}
        <Circle cx={cx} cy={cy} r={r} stroke={tc.isDark ? '#3F3F46' : '#E4E4E7'} strokeWidth={STROKE} fill="none" />
        {/* Animated segments */}
        {total > 0 && segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const arcLen  = (seg.value / total) * circumference;
          const dashOff = circumference * 0.25 - cumLen;
          cumLen += arcLen;
          const arcFixed = arcLen.toFixed(2);

          const animDash = drawAnims[i].interpolate({
            inputRange:  [0, 1],
            outputRange: [`0 ${circ}`, `${arcFixed} ${circ}`],
          });
          return (
            <AnimatedCircle
              key={i}
              cx={cx} cy={cy} r={r}
              stroke={seg.color}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={animDash as any}
              strokeDashoffset={dashOff}
            />
          );
        })}
      </Svg>
      {/* Animated center label */}
      <View style={StyleSheet.absoluteFill as object}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: centerScale }], opacity: centerOpacity, alignItems: 'center' }}>
            <Text style={{ fontSize: 34, fontWeight: '900', color: tc.text, lineHeight: 38 }}>{centerLabel}</Text>
            <Text style={{ fontSize: 12, color: tc.muted, marginTop: 2 }}>{centerSub}</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export const ResultadosScreen: React.FC<Props> = ({
  registros, tienda, catalogo, sobrantes, usuarios, esAdmin, confirmadosCero,
  onBack, onEliminarRegistro, onEditarRegistro, onConfirmarCero, onDesconfirmarCero,
}) => {
  const tc = useThemeColors();
  const [tab,               setTab]               = useState<Tab>('resumen');
  const [filtro,            setFiltro]            = useState<Filtro>('TODOS');
  const [busqueda,          setBusqueda]          = useState('');
  const [fotoModal,         setFotoModal]         = useState<string | null>(null);
  const [detalleItem,       setDetalleItem]       = useState<ArticuloVista | null>(null);
  const [miniReg,           setMiniReg]           = useState<Registro | null>(null);
  const [editRegId,         setEditRegId]         = useState<string | null>(null);
  const [editCantidad,      setEditCantidad]      = useState('');
  const [auditorDetalle,    setAuditorDetalle]    = useState<string | null>(null);

  // ── Animaciones de bottom-sheet ────────────────────────────────────────────
  const sheetY       = useRef(new Animated.Value(500)).current;
  const bgOpacity    = useRef(new Animated.Value(0)).current;
  const audSheetY    = useRef(new Animated.Value(500)).current;
  const audBgOpacity = useRef(new Animated.Value(0)).current;
  const miniOpacity  = useRef(new Animated.Value(0)).current;
  const editOpacity  = useRef(new Animated.Value(0)).current;

  const SPRING = { tension: 70, friction: 13, useNativeDriver: true } as const;
  const FADE   = { duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true } as const;

  useEffect(() => {
    if (detalleItem) {
      sheetY.setValue(500);
      bgOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(bgOpacity, { ...FADE, toValue: 1 }),
        Animated.spring(sheetY,    { ...SPRING, toValue: 0 }),
      ]).start();
    }
  }, [detalleItem]);

  useEffect(() => {
    if (auditorDetalle) {
      audSheetY.setValue(500);
      audBgOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(audBgOpacity, { ...FADE, toValue: 1 }),
        Animated.spring(audSheetY,    { ...SPRING, toValue: 0 }),
      ]).start();
    }
  }, [auditorDetalle]);

  useEffect(() => {
    if (miniReg) {
      miniOpacity.setValue(0);
      Animated.timing(miniOpacity, { ...FADE, toValue: 1 }).start();
    }
  }, [miniReg]);

  useEffect(() => {
    if (editRegId) {
      editOpacity.setValue(0);
      Animated.timing(editOpacity, { duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true, toValue: 1 }).start();
    }
  }, [editRegId]);

  // Cierra el detalle de artículo con animación de salida
  const cerrarDetalle = () => {
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sheetY,    { toValue: 500, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setDetalleItem(null));
  };

  // Cierra el detalle del auditor con animación de salida
  const cerrarAuditor = () => {
    Animated.parallel([
      Animated.timing(audBgOpacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(audSheetY,    { toValue: 500, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setAuditorDetalle(null));
  };

  // ── Cálculos base ──────────────────────────────────────────────────────────
  const CAT   = catalogo.length > 0 ? catalogo : CATALOGO_BASE;
  const regT  = registros.filter(r => r.tiendaId === tienda.id);
  const total = CAT.length || 1;

  // Porcentaje incluye confirmados cero
  const escSet  = new Set(regT.map(r => r.itemId));
  const confSet = new Set(confirmadosCero);
  const contados = new Set([...escSet, ...confSet]).size;
  const pct     = Math.min(100, Math.round(contados / total * 100));

  // Construir vista unificada de todos los artículos del catálogo
  const articulosVista: ArticuloVista[] = CAT.map(art => {
    const regsArt    = regT.filter(r => r.itemId === art.itemId);
    const conteoTotal = regsArt.reduce((sum, r) => sum + r.cantidad, 0);
    const confirmado  = confirmadosCero.includes(art.itemId);
    let clsf: string;
    if (regsArt.length > 0) {
      clsf = clasificar(art.stock, conteoTotal);
    } else {
      clsf = art.stock === 0 ? 'SIN_DIF' : 'CERO';
    }
    return {
      itemId:       art.itemId,
      descripcion:  art.descripcion,
      ubicacion:    art.ubicacion,
      stock:        art.stock,
      costo:        art.costo,
      registros:    regsArt,
      conteoTotal,
      clasificacion: clsf,
      confirmado,
      esSobrante: false as const,
    };
  });

  // Stats
  const sinDif    = articulosVista.filter(a => a.clasificacion === 'SIN_DIF').length;
  const falt      = articulosVista.filter(a => a.clasificacion === 'FALTANTE').length;
  const sobr      = articulosVista.filter(a => a.clasificacion === 'SOBRANTE').length;
  const cero      = articulosVista.filter(a => a.clasificacion === 'CERO').length;

  const costoPerd = articulosVista
    .filter(a => a.clasificacion === 'FALTANTE')
    .reduce((a, art) => a + art.costo * Math.abs(art.conteoTotal - art.stock), 0);
  const costoSobr = articulosVista
    .filter(a => a.clasificacion === 'SOBRANTE')
    .reduce((a, art) => a + art.costo * Math.abs(art.conteoTotal - art.stock), 0);

  const sobTotal = sobrantes.reduce((a, s) => a + s.precio * s.cantidad, 0);
  const sobConf  = sobrantes.filter(s => s.estado === 'CONFIRMADO').length;
  const sobPend  = sobrantes.filter(s => s.estado === 'PENDIENTE').length;
  const maxEcon  = Math.max(costoPerd, costoSobr, sobTotal, 1);

  const auditores = [...new Set(regT.map(r => r.usuarioNombre))]
    .map(nombre => ({
      nombre,
      n:   regT.filter(r => r.usuarioNombre === nombre).length,
      pct: total > 0 ? Math.round(regT.filter(r => r.usuarioNombre === nombre).length / total * 100) : 0,
    }))
    .sort((a, b) => b.n - a.n);

  const donutSegs: DonutSeg[] = [
    { value: sinDif,           color: '#6D28D9' },
    { value: falt,             color: '#F97316' },
    { value: sobr,             color: '#22C55E' },
    { value: cero,             color: '#EF4444' },
    { value: sobrantes.length, color: '#92400E' },
  ];

  const kpis = [
    { k: 'SIN_DIF',   label: 'Sin diferencia',      n: sinDif,           color: '#6D28D9', bg: '#EDE9FE', icon: 'checkmark-circle' as const },
    { k: 'FALTANTE',  label: 'Faltantes',            n: falt,             color: '#C2410C', bg: '#FFF7ED', icon: 'trending-down'    as const },
    { k: 'SOBRANTE',  label: 'Sobrantes',            n: sobr,             color: '#15803D', bg: '#F0FDF4', icon: 'trending-up'      as const },
    { k: 'CERO',      label: 'Conteo cero',          n: cero,             color: '#991B1B', bg: '#FEF2F2', icon: 'close-circle'     as const },
    { k: 'SIN_STOCK', label: 'Sobrantes sin stock',  n: sobrantes.length, color: '#92400E', bg: '#FEF3C7', icon: 'warning'          as const },
  ];

  // ── Filtrado de artículos con búsqueda ─────────────────────────────────────
  const bq = busqueda.toLowerCase();
  const artsFiltrados: ArticuloVista[] = articulosVista.filter(a => {
    const matchFiltro = filtro === 'TODOS' || filtro === 'SIN_STOCK' ? true : a.clasificacion === filtro;
    const matchBusq   = bq === '' || a.itemId.toLowerCase().includes(bq) || a.descripcion.toLowerCase().includes(bq) || a.ubicacion.toLowerCase().includes(bq);
    return matchFiltro && matchBusq;
  });
  const sobsFiltrados: SobranteSinStock[] = (filtro === 'TODOS' || filtro === 'SIN_STOCK') ? sobrantes.filter(s => {
    return bq === '' || s.codigo.toLowerCase().includes(bq) || s.descripcion.toLowerCase().includes(bq);
  }) : [];

  // ── Compartir ─────────────────────────────────────────────────────────────
  const compartir = async () => {
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    const texto = [
      `📦 REPORTE INVENTARIO — StockIQ`,
      `Tienda: ${tienda.nombre}`,
      `Fecha: ${fecha}`,
      ``,
      `📊 PROGRESO: ${contados}/${total} artículos (${pct}%)`,
      `Escaneos totales: ${regT.length}`,
      ``,
      `📋 CLASIFICACIÓN`,
      `  ✅ Sin diferencia: ${sinDif}`,
      `  📉 Faltantes: ${falt}`,
      `  📈 Sobrantes: ${sobr}`,
      `  0️⃣  Conteo cero: ${cero}`,
      sobrantes.length > 0 ? `  ⚠️  Sin stock: ${sobrantes.length} (✓${sobConf} ⏳${sobPend})` : '',
      ``,
      `💰 IMPACTO ECONÓMICO`,
      `  Pérdida faltantes: -${fCOP(costoPerd)}`,
      `  Valor sobrantes:   +${fCOP(costoSobr)}`,
      sobrantes.length > 0 ? `  Valor sin stock:    +${fCOP(sobTotal)}` : '',
      `  Balance general: ${costoSobr - costoPerd >= 0 ? '+' : ''}${fCOP(costoSobr - costoPerd)}`,
      ``,
      `— Generado con StockIQ`,
    ].filter(l => l !== '').join('\n');
    await Share.share({ message: texto });
  };

  const irDetalle = (f: Filtro) => { setFiltro(f); setTab('articulos'); };

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TABS: { k: Tab; label: string }[] = [
    { k: 'resumen',   label: 'Resumen'  },
    { k: 'articulos', label: `Artículos (${CAT.length + sobrantes.length})`  },
    { k: 'equipo',    label: 'Equipo'   },
  ];

  const FILTROS: { k: Filtro; label: string; color: string }[] = [
    { k: 'TODOS',    label: `Todos (${CAT.length + sobrantes.length})`,    color: BLK },
    { k: 'SIN_DIF',  label: `Sin dif. (${sinDif})`,                        color: '#6D28D9' },
    { k: 'FALTANTE', label: `Faltante (${falt})`,                          color: '#C2410C' },
    { k: 'SOBRANTE', label: `Sobrante (${sobr})`,                          color: '#15803D' },
    { k: 'CERO',     label: `Cero (${cero})`,                              color: '#991B1B' },
    { k: 'SIN_STOCK',label: `Sin stock (${sobrantes.length})`,             color: '#92400E' },
  ];

  // ── Helpers detalle ───────────────────────────────────────────────────────
  const abrirDetalle = (art: ArticuloVista) => setDetalleItem(art);

  const getEstadoLabel = (clsf: string) => {
    if (clsf === 'SIN_DIF')  return { label: 'Sin Diferencias', color: '#6D28D9', bg: '#EDE9FE' };
    if (clsf === 'FALTANTE') return { label: 'Faltante',        color: '#C2410C', bg: '#FFF7ED' };
    if (clsf === 'SOBRANTE') return { label: 'Sobrante',        color: '#15803D', bg: '#F0FDF4' };
    return                          { label: 'Conteo Cero',     color: '#991B1B', bg: '#FEF2F2' };
  };

  const guardarEdicion = () => {
    if (!editRegId) return;
    const cant = parseInt(editCantidad, 10);
    if (isNaN(cant) || cant < 0) { Alert.alert('Cantidad inválida'); return; }
    onEditarRegistro?.(editRegId, { cantidad: cant });
    setEditRegId(null);
    // Actualizar detalle local
    if (detalleItem) {
      const regsActualizados = detalleItem.registros.map(r =>
        r.id === editRegId ? { ...r, cantidad: cant, clasificacion: clasificar(r.stockSistema, cant) } : r
      );
      const nuevoTotal = regsActualizados.reduce((s, r) => s + r.cantidad, 0);
      setDetalleItem({
        ...detalleItem,
        registros:   regsActualizados,
        conteoTotal: nuevoTotal,
        clasificacion: clasificar(detalleItem.stock, nuevoTotal),
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: tc.bg }}>

      {/* Header */}
      <View style={[s.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <TouchableOpacity style={[s.headerBtn, { backgroundColor: tc.btnBg }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={tc.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <Text style={[s.headerTitle, { color: tc.text }]} numberOfLines={1}>Resultados</Text>
          <Text style={[s.headerSub, { color: tc.muted }]} numberOfLines={1}>{tienda.nombre} · {contados}/{total} · {pct}%</Text>
        </View>
        <TouchableOpacity style={[s.headerBtn, { backgroundColor: tc.btnBg }]} onPress={compartir}>
          <Ionicons name="share-outline" size={20} color={tc.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.tabsBar, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}
        contentContainerStyle={{ paddingHorizontal: 12 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.k} style={[s.tab, tab === t.k && { borderBottomColor: tienda.color }]}
            onPress={() => setTab(t.k)}>
            <Text style={[s.tabTxt, tab === t.k && { color: tienda.color, fontWeight: '700' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: RESUMEN + ECONÓMICO
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'resumen' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

          {/* Donut + leyenda interactiva */}
          <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <Text style={[s.cardTitle, { color: tc.text }]}>Distribución del inventario</Text>
            {regT.length === 0 && sobrantes.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
                <Ionicons name="cube-outline" size={48} color={BRD} />
                <Text style={{ color: '#A1A1AA', fontSize: 13 }}>Sin registros aún.</Text>
              </View>
            ) : (
              <>
                <DonutChart segments={donutSegs} centerLabel={`${pct}%`} centerSub="completado" />
                <View style={s.legend}>
                  {kpis.map(kpi => (
                    <TouchableOpacity key={kpi.k} style={[s.legendItem, { backgroundColor: kpi.bg }]}
                      onPress={() => irDetalle(kpi.k as Filtro)} activeOpacity={0.82}>
                      <View style={[s.legendDot, { backgroundColor: kpi.color }]} />
                      <View style={{ flex: 1 }}>
                        <AnimatedCounter value={kpi.n} style={[s.legendN, { color: kpi.color }]} />
                        <Text style={[s.legendLbl, { color: kpi.color }]}>{kpi.label}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={kpi.color} style={{ opacity: 0.5 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Progreso del catálogo */}
          <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={[s.cardTitle, { color: tc.text }]}>Progreso del inventario</Text>
              <Text style={[s.cardTitle, { color: tienda.color }]}>{pct}%</Text>
            </View>
            <View style={s.progBg}>
              <View style={[s.progFill, { width: `${pct}%` as any, backgroundColor: tienda.color }]} />
            </View>
            <Text style={{ fontSize: 12, color: tc.muted, marginTop: 8 }}>
              {contados} de {total} artículos contados · {regT.length} escaneos registrados
            </Text>
          </View>

          {/* ── Impacto económico ── */}
          <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <Text style={[s.cardTitle, { color: tc.text }]}>Impacto económico del inventario</Text>

            <View style={s.econRow}>
              <View style={s.econLeft}>
                <View style={[s.econIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="trending-down" size={18} color="#C2410C" />
                </View>
                <View style={{ minWidth: 0, flex: 1 }}>
                  <Text style={[s.econLbl, { color: tc.muted }]} numberOfLines={1}>Pérdida faltantes</Text>
                  <Text style={[s.econAmt, { color: '#C2410C' }]} numberOfLines={1}>-{fCOP(costoPerd)}</Text>
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={s.econBarBg}>
                  <View style={[s.econBarFill, { width: `${Math.round(costoPerd / maxEcon * 100)}%` as any, backgroundColor: '#F97316' }]} />
                </View>
                <Text style={[s.econBarPct, { color: tc.muted }]}>{falt} arts.</Text>
              </View>
            </View>

            <View style={s.econRow}>
              <View style={s.econLeft}>
                <View style={[s.econIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="trending-up" size={18} color="#15803D" />
                </View>
                <View style={{ minWidth: 0, flex: 1 }}>
                  <Text style={[s.econLbl, { color: tc.muted }]} numberOfLines={1}>Valor sobrantes</Text>
                  <Text style={[s.econAmt, { color: '#15803D' }]} numberOfLines={1}>+{fCOP(costoSobr)}</Text>
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={s.econBarBg}>
                  <View style={[s.econBarFill, { width: `${Math.round(costoSobr / maxEcon * 100)}%` as any, backgroundColor: '#22C55E' }]} />
                </View>
                <Text style={[s.econBarPct, { color: tc.muted }]}>{sobr} arts.</Text>
              </View>
            </View>

            {sobrantes.length > 0 && (
              <View style={s.econRow}>
                <View style={s.econLeft}>
                  <View style={[s.econIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="warning" size={18} color="#92400E" />
                  </View>
                  <View style={{ minWidth: 0, flex: 1 }}>
                    <Text style={[s.econLbl, { color: tc.muted }]} numberOfLines={1}>Sobrantes sin stock</Text>
                    <Text style={[s.econAmt, { color: '#92400E' }]} numberOfLines={1}>+{fCOP(sobTotal)}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={s.econBarBg}>
                    <View style={[s.econBarFill, { width: `${Math.round(sobTotal / maxEcon * 100)}%` as any, backgroundColor: '#F59E0B' }]} />
                  </View>
                  <Text style={[s.econBarPct, { color: tc.muted }]}>✓{sobConf} ⏳{sobPend}</Text>
                </View>
              </View>
            )}

            <View style={[s.balanceBox, {
              backgroundColor: costoSobr - costoPerd >= 0 ? '#F0FDF4' : '#FEF2F2',
              borderColor:     costoSobr - costoPerd >= 0 ? '#BBF7D0' : '#FECACA',
              marginTop: 8,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={costoSobr - costoPerd >= 0 ? 'checkmark-circle' : 'alert-circle'} size={20}
                  color={costoSobr - costoPerd >= 0 ? '#15803D' : '#DC2626'} />
                <Text style={[s.balanceLbl, { color: tc.muted }]}>Balance general</Text>
              </View>
              <Text style={[s.balanceNum, { color: costoSobr - costoPerd >= 0 ? '#15803D' : '#DC2626' }]}>
                {costoSobr - costoPerd >= 0 ? '+' : ''}{fCOP(costoSobr - costoPerd)}
              </Text>
            </View>
          </View>

          {/* Sobrantes sin stock desglose */}
          {sobrantes.length > 0 && (
            <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={[s.cardTitle, { color: tc.text }]}>Sobrantes sin stock</Text>
                <TouchableOpacity onPress={() => irDetalle('SIN_STOCK')}>
                  <Text style={{ fontSize: 12, color: tienda.color, fontWeight: '700' }}>Ver todos →</Text>
                </TouchableOpacity>
              </View>
              <View style={s.impactoGrid}>
                <View style={[s.impactoCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="checkmark-circle" size={22} color="#15803D" />
                  <Text style={[s.impactoNum, { color: '#15803D' }]}>{sobConf}</Text>
                  <Text style={[s.impactoLbl, { color: '#15803D' }]}>Confirmados</Text>
                </View>
                <View style={[s.impactoCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                  <Ionicons name="time" size={22} color="#92400E" />
                  <Text style={[s.impactoNum, { color: '#92400E' }]}>{sobPend}</Text>
                  <Text style={[s.impactoLbl, { color: '#92400E' }]}>Pendientes</Text>
                </View>
              </View>
              <View style={[s.balanceBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', marginTop: 10 }]}>
                <Text style={[s.balanceLbl, { color: '#92400E' }]}>Valor total estimado</Text>
                <Text style={[s.balanceNum, { color: '#92400E' }]}>+{fCOP(sobTotal)}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: ARTÍCULOS — TODO el catálogo + sobrantes, con búsqueda
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'articulos' && (
        <View style={{ flex: 1 }}>
          {/* Barra de búsqueda */}
          <View style={[s.searchBar, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
            <Ionicons name="search-outline" size={16} color={tc.muted} style={{ marginLeft: 12 }} />
            <TextInput
              style={[s.searchInput, { color: tc.text, backgroundColor: tc.headerBg }]}
              placeholder="Buscar por código, descripción o ubicación..."
              placeholderTextColor={tc.placeholder}
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

          {/* Chips de filtro */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.filterBar, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
            {FILTROS.map(f => (
              <TouchableOpacity key={f.k}
                style={[s.chip, filtro === f.k && { backgroundColor: f.color, borderColor: f.color }]}
                onPress={() => setFiltro(f.k)}>
                <Text style={[s.chipTxt, filtro === f.k && { color: '#fff', fontWeight: '700' }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Lista combinada */}
          {artsFiltrados.length === 0 && sobsFiltrados.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <View style={s.emptyCircle}>
                <Ionicons name="cube-outline" size={32} color="#A1A1AA" />
              </View>
              <Text style={{ color: '#A1A1AA', fontSize: 13, marginTop: 10 }}>Sin artículos con este filtro</Text>
            </View>
          ) : (
            <FlatList
              data={[
                ...(filtro !== 'SIN_STOCK' ? artsFiltrados.map(a => ({ type: 'articulo' as const, data: a, id: a.itemId })) : []),
                ...sobsFiltrados.map(ss => ({ type: 'sobrante' as const, data: ss, id: ss.id })),
              ]}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
              renderItem={({ item }) => {
                if (item.type === 'articulo') {
                  const art   = item.data as ArticuloVista;
                  const cfg   = (CLSF as any)[art.clasificacion] ?? { label: art.clasificacion, color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' };
                  const delta = art.conteoTotal - art.stock;
                  const sinConteo = art.registros.length === 0;
                  return (
                    <TouchableOpacity style={[s.artCard, { backgroundColor: tc.card, borderColor: tc.border }, sinConteo && { opacity: 0.75 }]}
                      onPress={esAdmin ? () => abrirDetalle(art) : undefined}
                      activeOpacity={esAdmin ? 0.8 : 1}>
                      <View style={s.artCardTop}>
                        <View style={[s.codeTag, { backgroundColor: tc.cardAlt }]}>
                          <Text style={[s.codeTxt, { color: tienda.color }]} numberOfLines={1}>{art.itemId}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          {art.confirmado && (
                            <View style={[s.badge, { backgroundColor: '#F0FDF4' }]}>
                              <Ionicons name="checkmark-circle" size={10} color="#15803D" />
                              <Text style={[s.badgeTxt, { color: '#15803D', marginLeft: 3 }]}>Conf.</Text>
                            </View>
                          )}
                          <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                            <View style={[s.badgeDot, { backgroundColor: cfg.dot }]} />
                            <Text style={[s.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                        </View>
                      </View>
                      <Text style={[s.artDesc, { color: tc.text }]} numberOfLines={2}>{art.descripcion}</Text>
                      <Text style={[s.artUbic, { color: tc.muted }]} numberOfLines={1}>{art.ubicacion}</Text>
                      <View style={[s.qtyRow, { backgroundColor: tc.cardAlt }]}>
                        {[
                          { l: 'Stock',     v: String(art.stock),       c: tc.muted },
                          { l: 'Contado',   v: String(art.conteoTotal), c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                          { l: 'Diferencia',v: (delta > 0 ? '+' : '') + delta, c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                          { l: 'Impacto',   v: delta !== 0 ? fCOP(Math.abs(art.costo * delta)) : '—', c: tc.muted },
                        ].map(q => (
                          <View key={q.l} style={s.qtyBox}>
                            <Text style={[s.qtyLbl, { color: tc.muted }]}>{q.l}</Text>
                            <Text style={[s.qtyVal, { color: q.c }]} numberOfLines={1} adjustsFontSizeToFit>{q.v}</Text>
                          </View>
                        ))}
                      </View>
                      {esAdmin && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: tc.borderLight }}>
                          <Ionicons name="eye-outline" size={12} color={tc.muted} style={{ marginRight: 5 }} />
                          <Text style={{ fontSize: 11, color: tc.muted }}>{art.registros.length} conteo{art.registros.length !== 1 ? 's' : ''} · Toca para ver detalle</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }

                // ── Sobrante sin stock ──
                const ss = item.data as SobranteSinStock;
                return (
                  <View style={[s.artCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                      {ss.fotoUri ? (
                        <TouchableOpacity onPress={() => setFotoModal(ss.fotoUri)} style={s.thumbWrap}>
                          <Image source={{ uri: ss.fotoUri }} style={s.thumb} resizeMode="cover" />
                          <View style={s.thumbOverlay}><Ionicons name="expand-outline" size={14} color="#fff" /></View>
                        </TouchableOpacity>
                      ) : (
                        <View style={[s.thumbWrap, s.thumbEmpty]}>
                          <Ionicons name="image-outline" size={22} color="#A1A1AA" />
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <View style={[s.badge, { backgroundColor: '#FEF3C7' }]}>
                            <View style={[s.badgeDot, { backgroundColor: '#92400E' }]} />
                            <Text style={[s.badgeTxt, { color: '#92400E' }]}>Sin Stock</Text>
                          </View>
                          <View style={[s.badge, { backgroundColor: ss.estado === 'CONFIRMADO' ? '#F0FDF4' : '#FEF3C7' }]}>
                            <Ionicons name={ss.estado === 'CONFIRMADO' ? 'checkmark-circle' : 'time'} size={11}
                              color={ss.estado === 'CONFIRMADO' ? '#15803D' : '#92400E'} />
                            <Text style={[s.badgeTxt, { color: ss.estado === 'CONFIRMADO' ? '#15803D' : '#92400E', marginLeft: 3 }]}>
                              {ss.estado}
                            </Text>
                          </View>
                        </View>
                        <Text style={[s.codeTxt, { color: tc.isDark ? '#FCD34D' : '#92400E', marginBottom: 4 }]} numberOfLines={1}>{ss.codigo}</Text>
                        <Text style={[s.artDesc, { color: tc.text }]} numberOfLines={2}>{ss.descripcion}</Text>
                        <Text style={[s.artUbic, { color: tc.muted }]} numberOfLines={1}>{ss.ubicacion}</Text>
                      </View>
                    </View>
                    <View style={[s.qtyRow, { backgroundColor: tc.cardAlt }]}>
                      {[
                        { l: 'Cantidad',    v: String(ss.cantidad)           },
                        { l: 'Precio unit.',v: fCOP(ss.precio)               },
                        { l: 'Total',       v: fCOP(ss.precio * ss.cantidad) },
                      ].map(q => (
                        <View key={q.l} style={s.qtyBox}>
                          <Text style={[s.qtyLbl, { color: tc.muted }]}>{q.l}</Text>
                          <Text style={[s.qtyVal, { color: '#92400E' }]} numberOfLines={1} adjustsFontSizeToFit>{q.v}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={[s.metaRow, { borderTopColor: tc.borderLight }]}>
                      <Avatar nombre={ss.usuarioNombre} size={16} bg="#27272A" />
                      <Text style={[s.metaTxt, { color: tc.muted }]} numberOfLines={1}> {ss.usuarioNombre} · {formatFechaDisplay(ss.registradoEn)}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: EQUIPO
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'equipo' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <Text style={[s.cardTitle, { color: tc.text }]}>Rendimiento por auditor</Text>
            {auditores.length === 0 ? (
              <Text style={{ color: '#A1A1AA', textAlign: 'center', padding: 28 }}>Sin registros aún</Text>
            ) : auditores.map((a, i) => {
              const rankColors = ['#F59E0B', '#94A3B8', '#CD7C2F', LGR, LGR];
              const rankTxtCol = i < 3 ? '#fff' : '#A1A1AA';
              const barColors  = [tienda.color, '#4C1D95', '#6D28D9', '#8B5CF6', '#A78BFA'];
              const maxN       = auditores[0]?.n || 1;
              const barPct     = Math.round((a.n / maxN) * 100);
              const aud        = usuarios.find(u => u.nombre === a.nombre);
              return (
                <TouchableOpacity key={a.nombre} style={s.audRow} onPress={() => setAuditorDetalle(a.nombre)} activeOpacity={0.75}>
                  <View style={[s.audRank, { backgroundColor: rankColors[i] ?? LGR }]}>
                    <Text style={[s.audRankTxt, { color: rankTxtCol }]}>{i + 1}</Text>
                  </View>
                  <Avatar nombre={a.nombre} size={42} bg="#27272A" fotoUri={aud?.fotoUri} />
                  <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={[s.audNombre, { color: tc.text }]} numberOfLines={1}>{a.nombre}</Text>
                      <Text style={[s.audMeta, { color: tc.muted }]} numberOfLines={1}>{a.n} escaneos</Text>
                    </View>
                    <View style={s.audBarBg}>
                      <View style={[s.audBarFill, { width: `${barPct}%` as any, backgroundColor: barColors[i % barColors.length] }]} />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#A1A1AA" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              );
            })}
          </View>

          {auditores.length > 1 && (
            <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <Text style={[s.cardTitle, { color: tc.text }]}>Totales del equipo</Text>
              <View style={s.impactoGrid}>
                <View style={[s.impactoCard, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
                  <Ionicons name="people" size={22} color={PRP} />
                  <Text style={[s.impactoNum, { color: PRP }]}>{auditores.length}</Text>
                  <Text style={[s.impactoLbl, { color: PRP }]}>Auditores activos</Text>
                </View>
                <View style={[s.impactoCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="scan" size={22} color="#15803D" />
                  <Text style={[s.impactoNum, { color: '#15803D' }]}>{regT.length}</Text>
                  <Text style={[s.impactoLbl, { color: '#15803D' }]}>Escaneos totales</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: DETALLE DE ARTÍCULO
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!detalleItem} animationType="none" transparent onRequestClose={() => { if (miniReg) setMiniReg(null); else cerrarDetalle(); }}>
        <Animated.View style={[s.detalleModalBg, { opacity: bgOpacity }]}>
          <Animated.View style={[s.detalleSheet, { backgroundColor: tc.card, transform: [{ translateY: sheetY }] }]}>
            <View style={s.modalHandle} />
            {detalleItem && (() => {
              const est     = getEstadoLabel(detalleItem.clasificacion);
              const delta   = detalleItem.conteoTotal - detalleItem.stock;
              const difMon  = delta * detalleItem.costo;
              return (
                <>
                  {/* Header del detalle */}
                  <View style={[s.detalleHeader, { backgroundColor: est.bg }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[s.detalleEstado, { color: est.color }]}>{est.label}</Text>
                      <Text style={[s.detalleRef, { color: est.color }]} numberOfLines={1}>{detalleItem.itemId}</Text>
                    </View>
                    <TouchableOpacity onPress={cerrarDetalle} style={s.detalleClose}>
                      <Ionicons name="close" size={20} color={est.color} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}>

                    {/* Descripción */}
                    <Text style={[s.detalleDesc, { color: tc.text }]}>{detalleItem.descripcion}</Text>
                    <Text style={[s.detalleUbic, { color: tc.muted }]}>{detalleItem.ubicacion}</Text>

                    {/* Grid de datos */}
                    <View style={[s.detalleGrid, { backgroundColor: tc.cardAlt, borderColor: tc.border }]}>
                      {[
                        { l: 'Stock',           v: String(detalleItem.stock),         c: tc.muted },
                        { l: 'Conteo total',    v: String(detalleItem.conteoTotal),   c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                        { l: 'Diferencia',      v: (delta > 0 ? '+' : '') + delta,    c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                        { l: 'Valor unitario',  v: fCOP(detalleItem.costo),           c: tc.muted },
                        { l: 'Diferencia mon.', v: (difMon > 0 ? '+' : '') + fCOP(Math.abs(difMon)), c: difMon === 0 ? '#15803D' : difMon > 0 ? '#B45309' : '#DC2626' },
                      ].map(q => (
                        <View key={q.l} style={s.detalleGridBox}>
                          <Text style={[s.detalleGridLbl, { color: tc.muted }]}>{q.l}</Text>
                          <Text style={[s.detalleGridVal, { color: q.c }]} numberOfLines={1} adjustsFontSizeToFit>{q.v}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Confirmar conteo cero (solo admin, solo si está en CERO) */}
                    {esAdmin && detalleItem.clasificacion === 'CERO' && (
                      <TouchableOpacity
                        style={[s.confirmarBtn, detalleItem.confirmado && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                        onPress={() => {
                          if (detalleItem.confirmado) {
                            onDesconfirmarCero?.(detalleItem.itemId);
                            setDetalleItem({ ...detalleItem, confirmado: false });
                          } else {
                            onConfirmarCero?.(detalleItem.itemId);
                            setDetalleItem({ ...detalleItem, confirmado: true });
                          }
                        }}
                      >
                        <Ionicons
                          name={detalleItem.confirmado ? 'close-circle-outline' : 'checkmark-circle-outline'}
                          size={18}
                          color={detalleItem.confirmado ? '#DC2626' : '#15803D'}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[s.confirmarBtnTxt, { color: detalleItem.confirmado ? '#DC2626' : '#15803D' }]}>
                          {detalleItem.confirmado ? 'Quitar confirmación de cero' : 'Confirmar conteo cero'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Registros individuales */}
                    <Text style={[s.cardTitle, { marginTop: 16, marginBottom: 10, color: tc.text }]}>
                      Registros ({detalleItem.registros.length})
                    </Text>

                    {detalleItem.registros.length === 0 ? (
                      <View style={{ alignItems: 'center', padding: 20, backgroundColor: tc.card, borderRadius: 14, borderWidth: 1, borderColor: tc.border }}>
                        <Ionicons name="cube-outline" size={32} color="#A1A1AA" />
                        <Text style={{ color: tc.muted, fontSize: 13, marginTop: 8 }}>Sin conteos registrados</Text>
                      </View>
                    ) : detalleItem.registros.map((reg, idx) => (
                      <View key={reg.id} style={[s.regRow, { backgroundColor: tc.row, borderColor: tc.border }]}>
                        <TouchableOpacity
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                          onPress={() => setMiniReg(reg)}
                          activeOpacity={0.82}
                        >
                          <View style={[s.regNumBadge, { backgroundColor: tienda.color }]}>
                            <Text style={s.regNumTxt}>{idx + 1}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[s.regUsuario, { color: tc.text }]} numberOfLines={1}>{reg.usuarioNombre}</Text>
                              <Text style={[s.regCantidad, { color: tienda.color }]}>{reg.cantidad} und.</Text>
                            </View>
                            <Text style={[s.regFecha, { color: tc.muted }]} numberOfLines={1}>{formatFechaDisplay(reg.escaneadoEn)}</Text>
                            {reg.nota ? <Text style={s.regNota} numberOfLines={1}>"{reg.nota}"</Text> : null}
                          </View>
                          <Ionicons name="chevron-forward" size={14} color="#A1A1AA" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                        {esAdmin && (
                          <TouchableOpacity
                            style={s.editBtn}
                            onPress={() => { setEditRegId(reg.id); setEditCantidad(String(reg.cantidad)); }}
                          >
                            <Ionicons name="pencil-outline" size={15} color={PRP} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </>
              );
            })()}
          </Animated.View>{/* ← cierra detalleSheet */}

          {/* ── Overlay mini-detalle: hermano de detalleSheet → cubre pantalla completa ── */}
          {miniReg && (
            <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: miniOpacity }]}>
            <TouchableOpacity
              style={[StyleSheet.absoluteFillObject, s.overlayBg]}
              activeOpacity={1}
              onPress={() => setMiniReg(null)}
            >
              <View style={[s.miniModalCard, { backgroundColor: tc.card }]} onStartShouldSetResponder={() => true}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text style={[s.miniTitle, { color: tc.text }]}>Detalle del conteo</Text>
                  <TouchableOpacity onPress={() => setMiniReg(null)}>
                    <Ionicons name="close-circle" size={22} color={MTD} />
                  </TouchableOpacity>
                </View>
                {[
                  { icon: 'person-circle-outline' as const, lbl: 'Usuario',      val: miniReg.usuarioNombre },
                  { icon: 'layers-outline'         as const, lbl: 'Cantidad',     val: `${miniReg.cantidad} unidad${miniReg.cantidad !== 1 ? 'es' : ''}` },
                  { icon: 'time-outline'           as const, lbl: 'Fecha y hora', val: formatFechaDisplay(miniReg.escaneadoEn) },
                ].map(row => (
                  <View key={row.lbl} style={s.miniRow}>
                    <Ionicons name={row.icon} size={16} color={tienda.color} style={{ marginRight: 10, marginTop: 2 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[s.miniLbl, { color: tc.muted }]}>{row.lbl}</Text>
                      <Text style={[s.miniVal, { color: tc.text }]} numberOfLines={2}>{row.val}</Text>
                    </View>
                  </View>
                ))}
                {miniReg.nota ? (
                  <View style={s.miniRow}>
                    <Ionicons name="chatbubble-outline" size={16} color={tienda.color} style={{ marginRight: 10, marginTop: 2 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[s.miniLbl, { color: tc.muted }]}>Nota</Text>
                      <Text style={[s.miniVal, { color: tc.text }]}>{miniReg.nota}</Text>
                    </View>
                  </View>
                ) : null}
                {miniReg.fotoUri ? (
                  <TouchableOpacity style={{ marginTop: 10 }} onPress={() => { setMiniReg(null); setFotoModal(miniReg.fotoUri); }}>
                    <Image source={{ uri: miniReg.fotoUri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 12 }} resizeMode="cover" />
                    <Text style={{ fontSize: 11, color: tc.muted, textAlign: 'center', marginTop: 6 }}>Toca la foto para ampliar</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.miniRow}>
                    <Ionicons name="image-outline" size={16} color="#A1A1AA" style={{ marginRight: 10 }} />
                    <Text style={[s.miniVal, { color: tc.muted }]}>Sin foto en este conteo</Text>
                  </View>
                )}
                <Text style={{ fontSize: 11, color: tc.muted, textAlign: 'center', marginTop: 14 }}>
                  Toca fuera para cerrar
                </Text>
              </View>
            </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Overlay editar cantidad: hermano de detalleSheet → sin Modal anidado ── */}
          {editRegId && (
            <Animated.View style={[StyleSheet.absoluteFillObject, s.overlayBg, { opacity: editOpacity }]}>
              <View style={[s.miniModalCard, { width: '85%', backgroundColor: tc.card }]} onStartShouldSetResponder={() => true}>
                <Text style={[s.miniTitle, { color: tc.text }]}>Editar cantidad</Text>
                <TextInput
                  style={[s.editInput, { color: tc.text, backgroundColor: tc.inputBg, borderColor: tc.inputBorder }]}
                  value={editCantidad}
                  onChangeText={setEditCantidad}
                  keyboardType="numeric"
                  placeholder="Nueva cantidad"
                  placeholderTextColor={tc.placeholder}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity style={[s.editAction, { backgroundColor: tc.btnBg, flex: 1 }]} onPress={() => setEditRegId(null)}>
                    <Text style={{ color: tc.text, fontWeight: '700', fontSize: 14 }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.editAction, { backgroundColor: PRP, flex: 1 }]} onPress={guardarEdicion}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>{/* ← cierra detalleModalBg */}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: DETALLE POR AUDITOR
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!auditorDetalle} animationType="none" transparent onRequestClose={cerrarAuditor}>
        <Animated.View style={[s.detalleModalBg, { opacity: audBgOpacity }]}>
          <Animated.View style={[s.detalleSheet, { backgroundColor: tc.card, transform: [{ translateY: audSheetY }] }]}>
            <View style={s.modalHandle} />
            {auditorDetalle && (() => {
              const regsAud   = regT.filter(r => r.usuarioNombre === auditorDetalle);
              const aud       = usuarios.find(u => u.nombre === auditorDetalle);
              const grupos: { k: string; label: string; color: string; bg: string; items: Registro[] }[] = [
                { k: 'SIN_DIF',  label: 'Sin diferencia', color: '#6D28D9', bg: '#EDE9FE', items: regsAud.filter(r => r.clasificacion === 'SIN_DIF') },
                { k: 'FALTANTE', label: 'Faltantes',      color: '#C2410C', bg: '#FFF7ED', items: regsAud.filter(r => r.clasificacion === 'FALTANTE') },
                { k: 'SOBRANTE', label: 'Sobrantes',      color: '#15803D', bg: '#F0FDF4', items: regsAud.filter(r => r.clasificacion === 'SOBRANTE') },
                { k: 'CERO',     label: 'Conteo cero',    color: '#991B1B', bg: '#FEF2F2', items: regsAud.filter(r => r.clasificacion === 'CERO') },
              ];
              return (
                <>
                  <View style={[s.detalleHeader, { backgroundColor: tc.cardAlt, borderBottomColor: tc.border }]}>
                    <Avatar nombre={auditorDetalle} size={42} bg="#27272A" fotoUri={aud?.fotoUri} />
                    <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                      <Text style={[s.detalleEstado, { color: tc.text }]} numberOfLines={1}>{auditorDetalle}</Text>
                      <Text style={{ fontSize: 12, color: tc.muted }}>{regsAud.length} escaneos registrados</Text>
                    </View>
                    <TouchableOpacity onPress={cerrarAuditor} style={s.detalleClose}>
                      <Ionicons name="close" size={20} color={tc.text} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                    {grupos.map(g => g.items.length > 0 && (
                      <View key={g.k} style={{ marginBottom: 16 }}>
                        <View style={[s.detalleHeader, { backgroundColor: g.bg, borderRadius: 12, marginBottom: 8, paddingVertical: 10 }]}>
                          <View style={[s.audRank, { backgroundColor: g.color, marginRight: 10 }]}>
                            <Text style={[s.audRankTxt, { color: '#fff' }]}>{g.items.length}</Text>
                          </View>
                          <Text style={[s.detalleEstado, { color: g.color }]}>{g.label}</Text>
                        </View>
                        {g.items.map(reg => {
                          const delta = reg.cantidad - reg.stockSistema;
                          return (
                            <View key={reg.id} style={[s.regRow, { marginBottom: 8, backgroundColor: tc.card, borderColor: tc.border }]}>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                  <Text style={[s.codeTxt, { color: tienda.color, fontSize: 12 }]} numberOfLines={1}>{reg.itemId}</Text>
                                  <Text style={[s.regCantidad, { color: g.color }]}>{reg.cantidad} und.</Text>
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: tc.text, marginBottom: 2 }} numberOfLines={1}>{reg.descripcion}</Text>
                                <Text style={{ fontSize: 10, color: tc.muted }}>
                                  Sistema: {reg.stockSistema} · Dif: {delta > 0 ? '+' : ''}{delta} · {formatFechaDisplay(reg.escaneadoEn)}
                                </Text>
                                {reg.nota ? <Text style={s.regNota} numberOfLines={1}>"{reg.nota}"</Text> : null}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                    {regsAud.length === 0 && (
                      <View style={{ alignItems: 'center', paddingTop: 40 }}>
                        <Ionicons name="cube-outline" size={40} color="#A1A1AA" />
                        <Text style={{ color: '#A1A1AA', fontSize: 13, marginTop: 10 }}>Sin registros</Text>
                      </View>
                    )}
                  </ScrollView>
                </>
              );
            })()}
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Modal foto fullscreen */}
      <Modal visible={!!fotoModal} transparent animationType="fade" onRequestClose={() => setFotoModal(null)}>
        <TouchableOpacity style={s.fotoModalBg} activeOpacity={1} onPress={() => setFotoModal(null)}>
          {fotoModal && (
            <>
              <View style={s.fotoModalClose}>
                <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.8)" />
              </View>
              <Image source={{ uri: fotoModal }} style={s.fotoModalImg} resizeMode="contain" />
              <Text style={s.fotoModalHint}>Toca en cualquier lugar para cerrar</Text>
            </>
          )}
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header:       { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 54, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  headerBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: BLK },
  headerSub:    { fontSize: 12, color: MTD, marginTop: 2 },

  // Tabs
  tabsBar:      { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  tab:          { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabTxt:       { fontSize: 13, fontWeight: '500', color: '#A1A1AA' },

  // Card
  card:         { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle:    { fontSize: 14, fontWeight: '700', color: BLK, marginBottom: 14 },

  // Donut leyenda
  legend:       { marginTop: 20, gap: 8 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, gap: 10 },
  legendDot:    { width: 12, height: 12, borderRadius: 6 },
  legendN:      { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  legendLbl:    { fontSize: 11, color: MTD, marginTop: 1 },

  // Progreso
  progBg:       { height: 12, backgroundColor: LGR, borderRadius: 6, overflow: 'hidden' },
  progFill:     { height: '100%', borderRadius: 6 },

  // Búsqueda
  searchBar:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD, height: 48 },
  searchInput:  { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, color: BLK },

  // Filtros
  filterBar:    { flexGrow: 0, flexShrink: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: LGR, borderWidth: 1, borderColor: BRD },
  chipTxt:      { fontSize: 12, color: MTD, fontWeight: '500' },

  // Artículos
  artCard:      { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  artCardTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 },
  codeTag:      { backgroundColor: LGR, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, maxWidth: '60%' },
  codeTxt:      { fontSize: 11, fontWeight: '800' },
  artDesc:      { fontSize: 14, fontWeight: '700', color: BLK, marginBottom: 2 },
  artUbic:      { fontSize: 11, fontWeight: '600', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },

  badge:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeDot:     { width: 7, height: 7, borderRadius: 4, marginRight: 4 },
  badgeTxt:     { fontSize: 11, fontWeight: '700' },

  qtyRow:       { flexDirection: 'row', backgroundColor: LGR, borderRadius: 10, padding: 10, marginBottom: 8 },
  qtyBox:       { flex: 1, alignItems: 'center' },
  qtyLbl:       { fontSize: 9, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  qtyVal:       { fontSize: 13, fontWeight: '800', color: BLK },

  metaRow:      { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: LGR },
  metaTxt:      { fontSize: 11, color: '#A1A1AA' },

  thumbWrap:    { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  thumb:        { width: 84, height: 84, borderRadius: 12 },
  thumbEmpty:   { width: 84, height: 84, backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center' },
  thumbOverlay: { position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },

  // Equipo
  audRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  audRank:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  audRankTxt:   { fontSize: 11, fontWeight: '900' },
  audNombre:    { fontSize: 13, fontWeight: '700', color: BLK, flexShrink: 1 },
  audMeta:      { fontSize: 11, color: MTD, flexShrink: 0 },
  audBarBg:     { height: 8, backgroundColor: LGR, borderRadius: 4, overflow: 'hidden', marginTop: 2 },
  audBarFill:   { height: '100%', borderRadius: 4 },

  // Económico
  econRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  econLeft:     { flexDirection: 'row', alignItems: 'center', gap: 8, width: 150 },
  econIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  econLbl:      { fontSize: 11, color: MTD, marginBottom: 2 },
  econAmt:      { fontSize: 13, fontWeight: '800' },
  econBarBg:    { height: 10, backgroundColor: LGR, borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
  econBarFill:  { height: '100%', borderRadius: 5 },
  econBarPct:   { fontSize: 10, color: MTD },
  impactoGrid:  { flexDirection: 'row', gap: 10, marginBottom: 10 },
  impactoCard:  { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
  impactoNum:   { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  impactoLbl:   { fontSize: 11, color: MTD, textAlign: 'center' },
  balanceBox:   { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  balanceLbl:   { fontSize: 13, fontWeight: '600', color: MTD },
  balanceNum:   { fontSize: 18, fontWeight: '900' },

  // Empty
  emptyCircle:  { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', borderWidth: 1, borderColor: BRD, alignItems: 'center', justifyContent: 'center' },

  // Modal detalle artículo
  detalleModalBg:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detalleSheet:     { backgroundColor: LGR, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', minHeight: '60%' },
  modalHandle:      { width: 40, height: 4, backgroundColor: '#D4D4D8', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  detalleHeader:    { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BRD },
  detalleEstado:    { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  detalleRef:       { fontSize: 15, fontWeight: '800', color: BLK },
  detalleClose:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  detalleDesc:      { fontSize: 16, fontWeight: '800', color: BLK, marginBottom: 4 },
  detalleUbic:      { fontSize: 12, color: MTD, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  detalleGrid:      { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: BRD, gap: 4 },
  detalleGridBox:   { width: '46%', paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  detalleGridLbl:   { fontSize: 10, color: MTD, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  detalleGridVal:   { fontSize: 16, fontWeight: '900', color: BLK },
  confirmarBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 14, padding: 14, marginBottom: 8 },
  confirmarBtnTxt:  { fontSize: 14, fontWeight: '700' },
  regRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BRD },
  regNumBadge:      { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  regNumTxt:        { fontSize: 11, fontWeight: '900', color: '#fff' },
  regUsuario:       { fontSize: 13, fontWeight: '700', color: BLK, flexShrink: 1 },
  regCantidad:      { fontSize: 14, fontWeight: '900', flexShrink: 0 },
  regFecha:         { fontSize: 11, color: MTD, marginTop: 2 },
  regNota:          { fontSize: 11, color: '#92400E', marginTop: 2, fontStyle: 'italic' },
  editBtn:          { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  // Overlay centrado (mini-detalle y editar) — se usa con absoluteFillObject, NO como Modal independiente
  overlayBg:        { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 99 },
  miniModalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  miniModalCard:    { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '92%', maxWidth: 400 },
  miniTitle:        { fontSize: 16, fontWeight: '800', color: BLK, marginBottom: 16 },
  miniRow:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  miniLbl:          { fontSize: 10, color: MTD, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  miniVal:          { fontSize: 14, fontWeight: '700', color: BLK },

  // Editar cantidad
  editInput:        { borderWidth: 1.5, borderColor: BRD, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 18, fontWeight: '700', color: BLK, backgroundColor: LGR, textAlign: 'center' },
  editAction:       { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Foto fullscreen
  fotoModalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  fotoModalClose:   { position: 'absolute', top: 56, right: 20 },
  fotoModalImg:     { width: '95%', aspectRatio: 4 / 3, borderRadius: 16 },
  fotoModalHint:    { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 },
});
