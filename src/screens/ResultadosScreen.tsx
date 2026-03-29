import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, Share, Image, Modal,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Tienda, Registro, Articulo, SobranteSinStock, CLSF, CATALOGO_BASE } from '../constants/data';
import { fCOP } from '../utils/helpers';
import { Avatar } from '../components/common';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Props {
  registros: Registro[];
  tienda:    Tienda;
  catalogo:  Articulo[];
  sobrantes: SobranteSinStock[];
  onBack:    () => void;
}

type Tab    = 'resumen' | 'articulos' | 'equipo' | 'economico';
type Filtro = 'TODOS' | 'SIN_DIF' | 'FALTANTE' | 'SOBRANTE' | 'CERO' | 'SIN_STOCK';

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
const DSIZE = 200;
const STROKE = 30;

interface DonutSeg { value: number; color: string; }

const DonutChart: React.FC<{
  segments:    DonutSeg[];
  centerLabel: string;
  centerSub:   string;
}> = ({ segments, centerLabel, centerSub }) => {
  const r             = (DSIZE - STROKE) / 2;
  const cx            = DSIZE / 2;
  const cy            = DSIZE / 2;
  const circumference = 2 * Math.PI * r;
  const total         = segments.reduce((a, s) => a + s.value, 0);
  let   cumLen        = 0;

  return (
    <View style={{ width: DSIZE, height: DSIZE, alignSelf: 'center' }}>
      <Svg width={DSIZE} height={DSIZE}>
        <Circle cx={cx} cy={cy} r={r} stroke="#E4E4E7" strokeWidth={STROKE} fill="none" />
        {total > 0 && segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const arcLen  = (seg.value / total) * circumference;
          const dashOff = circumference * 0.25 - cumLen;
          cumLen += arcLen;
          return (
            <Circle
              key={i}
              cx={cx} cy={cy} r={r}
              stroke={seg.color}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${arcLen} ${circumference}`}
              strokeDashoffset={dashOff}
            />
          );
        })}
      </Svg>
      <View style={StyleSheet.absoluteFill as object}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 34, fontWeight: '900', color: BLK, lineHeight: 38 }}>{centerLabel}</Text>
          <Text style={{ fontSize: 12, color: MTD, marginTop: 2 }}>{centerSub}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export const ResultadosScreen: React.FC<Props> = ({
  registros, tienda, catalogo, sobrantes, onBack,
}) => {
  const [tab,       setTab]       = useState<Tab>('resumen');
  const [filtro,    setFiltro]    = useState<Filtro>('TODOS');
  const [fotoModal, setFotoModal] = useState<string | null>(null);

  // ── Cálculos ───────────────────────────────────────────────────────────────
  const CAT      = catalogo.length > 0 ? catalogo : CATALOGO_BASE;
  const regT     = registros.filter(r => r.tiendaId === tienda.id);
  const total    = CAT.length || 1;
  const contados = new Set(regT.map(r => r.itemId)).size;
  const pct      = Math.round(contados / total * 100);

  const byK    = (k: string) => regT.filter(r => r.clasificacion === k).length;
  const sinDif = byK('SIN_DIF');
  const falt   = byK('FALTANTE');
  const sobr   = byK('SOBRANTE');
  const cero   = byK('CERO');

  const costoPerd = regT
    .filter(r => r.clasificacion === 'FALTANTE')
    .reduce((a, r) => a + r.costoUnitario * Math.abs(r.cantidad - r.stockSistema), 0);
  const costoSobr = regT
    .filter(r => r.clasificacion === 'SOBRANTE')
    .reduce((a, r) => a + r.costoUnitario * Math.abs(r.cantidad - r.stockSistema), 0);

  const sobTotal = sobrantes.reduce((a, s) => a + s.precio * s.cantidad, 0);
  const sobConf  = sobrantes.filter(s => s.estado === 'CONFIRMADO').length;
  const sobPend  = sobrantes.filter(s => s.estado === 'PENDIENTE').length;

  const auditores = [...new Set(regT.map(r => r.usuarioNombre))]
    .map(nombre => ({
      nombre,
      n:   regT.filter(r => r.usuarioNombre === nombre).length,
      pct: total > 0 ? Math.round(regT.filter(r => r.usuarioNombre === nombre).length / total * 100) : 0,
    }))
    .sort((a, b) => b.n - a.n);

  const totalRegistrado = regT.length + sobrantes.length;

  // Segmentos del donut (todos los elementos registrados)
  const donutSegs: DonutSeg[] = [
    { value: sinDif,           color: '#6D28D9' },
    { value: falt,             color: '#F97316' },
    { value: sobr,             color: '#22C55E' },
    { value: cero,             color: '#EF4444' },
    { value: sobrantes.length, color: '#92400E' },
  ];

  // KPI cards para la leyenda
  const kpis = [
    { k: 'SIN_DIF',   label: 'Sin diferencia',    n: sinDif,           color: '#6D28D9', bg: '#EDE9FE', icon: 'checkmark-circle'    as const },
    { k: 'FALTANTE',  label: 'Faltantes',          n: falt,             color: '#C2410C', bg: '#FFF7ED', icon: 'trending-down'        as const },
    { k: 'SOBRANTE',  label: 'Sobrantes',          n: sobr,             color: '#15803D', bg: '#F0FDF4', icon: 'trending-up'          as const },
    { k: 'CERO',      label: 'Conteo cero',        n: cero,             color: '#991B1B', bg: '#FEF2F2', icon: 'close-circle'         as const },
    { k: 'SIN_STOCK', label: 'Sobrantes sin stock',n: sobrantes.length, color: '#92400E', bg: '#FEF3C7', icon: 'warning'              as const },
  ];

  // ── Artículos combinados para la lista ─────────────────────────────────────
  const regFiltrados  = filtro === 'SIN_STOCK' ? [] : filtro === 'TODOS' ? regT : regT.filter(r => r.clasificacion === filtro);
  const sobFiltrados  = filtro === 'TODOS' || filtro === 'SIN_STOCK' ? sobrantes : [];

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

  // ── Navegar a detalle con filtro ──────────────────────────────────────────
  const irDetalle = (f: Filtro) => { setFiltro(f); setTab('articulos'); };

  // ─────────────────────────────────────────────────────────────────────────
  const TABS: { k: Tab; label: string }[] = [
    { k: 'resumen',   label: 'Resumen'  },
    { k: 'articulos', label: `Artículos${totalRegistrado > 0 ? ` (${totalRegistrado})` : ''}` },
    { k: 'equipo',    label: 'Equipo'   },
    { k: 'economico', label: 'Económico'},
  ];

  const FILTROS: { k: Filtro; label: string; color: string }[] = [
    { k: 'TODOS',    label: `Todos (${totalRegistrado})`,  color: BLK },
    { k: 'SIN_DIF',  label: `Sin dif. (${sinDif})`,        color: '#6D28D9' },
    { k: 'FALTANTE', label: `Faltante (${falt})`,          color: '#C2410C' },
    { k: 'SOBRANTE', label: `Sobrante (${sobr})`,          color: '#15803D' },
    { k: 'CERO',     label: `Cero (${cero})`,              color: '#991B1B' },
    { k: 'SIN_STOCK',label: `Sin stock (${sobrantes.length})`, color: '#92400E' },
  ];

  const maxEcon = Math.max(costoPerd, costoSobr, sobTotal, 1);

  return (
    <View style={{ flex: 1, backgroundColor: LGR }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={BLK} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Resultados</Text>
          <Text style={s.headerSub}>{tienda.nombre} · {contados}/{total} artículos · {pct}%</Text>
        </View>
        <TouchableOpacity style={s.headerBtn} onPress={compartir}>
          <Ionicons name="share-outline" size={20} color={BLK} />
        </TouchableOpacity>
      </View>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={s.tabsBar}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.k}
            style={[s.tab, tab === t.k && { borderBottomColor: tienda.color }]}
            onPress={() => setTab(t.k)}
          >
            <Text style={[s.tabTxt, tab === t.k && { color: tienda.color, fontWeight: '700' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: RESUMEN
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'resumen' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

          {/* Donut + leyenda */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Distribución del inventario</Text>

            {totalRegistrado === 0 ? (
              <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
                <Ionicons name="cube-outline" size={48} color={BRD} />
                <Text style={{ color: '#A1A1AA', fontSize: 13 }}>Sin registros aún. Comienza escaneando artículos.</Text>
              </View>
            ) : (
              <>
                <DonutChart
                  segments={donutSegs}
                  centerLabel={`${pct}%`}
                  centerSub="completado"
                />

                {/* Leyenda interactiva */}
                <View style={s.legend}>
                  {kpis.map(kpi => (
                    <TouchableOpacity
                      key={kpi.k}
                      style={[s.legendItem, { backgroundColor: kpi.bg }]}
                      onPress={() => irDetalle(kpi.k as Filtro)}
                      activeOpacity={0.82}
                    >
                      <View style={[s.legendDot, { backgroundColor: kpi.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.legendN, { color: kpi.color }]}>{kpi.n}</Text>
                        <Text style={s.legendLbl}>{kpi.label}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={kpi.color} style={{ opacity: 0.5 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Barra de progreso del catálogo */}
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={s.cardTitle}>Progreso del catálogo</Text>
              <Text style={[s.cardTitle, { color: tienda.color }]}>{pct}%</Text>
            </View>
            <View style={s.progBg}>
              <View style={[s.progFill, { width: `${pct}%` as any, backgroundColor: tienda.color }]} />
            </View>
            <Text style={{ fontSize: 12, color: MTD, marginTop: 8 }}>
              {contados} de {total} artículos del catálogo contados · {regT.length} escaneos registrados
            </Text>
          </View>

        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: ARTÍCULOS
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'articulos' && (
        <View style={{ flex: 1 }}>
          {/* Chips de filtro */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={s.filterBar}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
          >
            {FILTROS.map(f => (
              <TouchableOpacity
                key={f.k}
                style={[s.chip, filtro === f.k && { backgroundColor: f.color, borderColor: f.color }]}
                onPress={() => setFiltro(f.k)}
              >
                <Text style={[s.chipTxt, filtro === f.k && { color: '#fff', fontWeight: '700' }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Lista combinada */}
          {(regFiltrados.length === 0 && sobFiltrados.length === 0) ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <View style={s.emptyCircle}>
                <Ionicons name="cube-outline" size={32} color="#A1A1AA" />
              </View>
              <Text style={{ color: '#A1A1AA', fontSize: 13, marginTop: 10 }}>Sin artículos con este filtro</Text>
            </View>
          ) : (
            <FlatList
              data={[
                ...regFiltrados.map(r  => ({ type: 'registro' as const, data: r,  id: r.id  })),
                ...sobFiltrados.map(ss => ({ type: 'sobrante' as const, data: ss, id: ss.id })),
              ]}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
              renderItem={({ item }) => {
                if (item.type === 'registro') {
                  const r   = item.data as Registro;
                  const cfg = CLSF[r.clasificacion];
                  const delta = r.cantidad - r.stockSistema;
                  return (
                    <View style={s.artCard}>
                      <View style={s.artCardTop}>
                        <View style={s.codeTag}>
                          <Text style={[s.codeTxt, { color: tienda.color }]}>{r.itemId}</Text>
                        </View>
                        <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                          <View style={[s.badgeDot, { backgroundColor: cfg.dot }]} />
                          <Text style={[s.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                      <Text style={s.artDesc}>{r.descripcion}</Text>
                      <Text style={s.artUbic}>{r.ubicacion}</Text>
                      <View style={s.qtyRow}>
                        {[
                          { l: 'Sistema',  v: String(r.stockSistema), c: MTD },
                          { l: 'Contado',  v: String(r.cantidad),     c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                          { l: 'Diferencia', v: (delta > 0 ? '+' : '') + delta, c: delta === 0 ? '#15803D' : delta > 0 ? '#B45309' : '#DC2626' },
                          { l: 'Impacto',  v: delta !== 0 ? fCOP(Math.abs(r.costoUnitario * delta)) : '—', c: MTD },
                        ].map(q => (
                          <View key={q.l} style={s.qtyBox}>
                            <Text style={s.qtyLbl}>{q.l}</Text>
                            <Text style={[s.qtyVal, { color: q.c }]}>{q.v}</Text>
                          </View>
                        ))}
                      </View>
                      {r.nota ? (
                        <View style={s.notaRow}>
                          <Ionicons name="chatbubble-outline" size={12} color="#92400E" style={{ marginRight: 5 }} />
                          <Text style={s.notaTxt}>{r.nota}</Text>
                        </View>
                      ) : null}
                      <View style={s.metaRow}>
                        <Avatar nombre={r.usuarioNombre} size={16} bg="#27272A" />
                        <Text style={s.metaTxt}> {r.usuarioNombre} · {r.escaneadoEn}</Text>
                      </View>
                    </View>
                  );
                }

                // ── Sobrante sin stock ──
                const ss = item.data as SobranteSinStock;
                return (
                  <View style={s.artCard}>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                      {/* Foto tappable */}
                      {ss.fotoUri ? (
                        <TouchableOpacity
                          onPress={() => setFotoModal(ss.fotoUri)}
                          activeOpacity={0.85}
                          style={s.thumbWrap}
                        >
                          <Image source={{ uri: ss.fotoUri }} style={s.thumb} resizeMode="cover" />
                          <View style={s.thumbOverlay}>
                            <Ionicons name="expand-outline" size={14} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View style={[s.thumbWrap, s.thumbEmpty]}>
                          <Ionicons name="image-outline" size={22} color="#A1A1AA" />
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <View style={[s.badge, { backgroundColor: '#FEF3C7' }]}>
                            <View style={[s.badgeDot, { backgroundColor: '#92400E' }]} />
                            <Text style={[s.badgeTxt, { color: '#92400E' }]}>Sin Stock</Text>
                          </View>
                          <View style={[s.badge, {
                            backgroundColor: ss.estado === 'CONFIRMADO' ? '#F0FDF4' : '#FEF3C7',
                          }]}>
                            <Ionicons
                              name={ss.estado === 'CONFIRMADO' ? 'checkmark-circle' : 'time'}
                              size={11}
                              color={ss.estado === 'CONFIRMADO' ? '#15803D' : '#92400E'}
                            />
                            <Text style={[s.badgeTxt, { color: ss.estado === 'CONFIRMADO' ? '#15803D' : '#92400E', marginLeft: 3 }]}>
                              {ss.estado}
                            </Text>
                          </View>
                        </View>
                        <Text style={[s.codeTag, { backgroundColor: 'transparent', paddingHorizontal: 0, marginBottom: 4 }]}>
                          <Text style={[s.codeTxt, { color: '#92400E' }]}>{ss.codigo}</Text>
                        </Text>
                        <Text style={s.artDesc}>{ss.descripcion}</Text>
                        <Text style={s.artUbic}>{ss.ubicacion}</Text>
                      </View>
                    </View>

                    <View style={s.qtyRow}>
                      {[
                        { l: 'Cantidad',     v: String(ss.cantidad)             },
                        { l: 'Precio unit.', v: fCOP(ss.precio)                 },
                        { l: 'Total',        v: fCOP(ss.precio * ss.cantidad)   },
                      ].map(q => (
                        <View key={q.l} style={s.qtyBox}>
                          <Text style={s.qtyLbl}>{q.l}</Text>
                          <Text style={[s.qtyVal, { color: '#92400E' }]}>{q.v}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={s.metaRow}>
                      <Avatar nombre={ss.usuarioNombre} size={16} bg="#27272A" />
                      <Text style={s.metaTxt}> {ss.usuarioNombre} · {ss.registradoEn}</Text>
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
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Rendimiento por auditor</Text>
            {auditores.length === 0 ? (
              <Text style={{ color: '#A1A1AA', textAlign: 'center', padding: 28 }}>Sin registros aún</Text>
            ) : auditores.map((a, i) => {
              const rankColors = ['#F59E0B', '#94A3B8', '#CD7C2F', LGR, LGR];
              const rankTxtCol = i < 3 ? '#fff' : '#A1A1AA';
              const barColors  = [tienda.color, '#4C1D95', '#6D28D9', '#8B5CF6', '#A78BFA'];
              const maxN       = auditores[0]?.n || 1;
              const barPct     = Math.round((a.n / maxN) * 100);
              return (
                <View key={a.nombre} style={s.audRow}>
                  <View style={[s.audRank, { backgroundColor: rankColors[i] ?? LGR }]}>
                    <Text style={[s.audRankTxt, { color: rankTxtCol }]}>{i + 1}</Text>
                  </View>
                  <Avatar nombre={a.nombre} size={42} bg="#27272A" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={s.audNombre}>{a.nombre}</Text>
                      <Text style={s.audMeta}>{a.n} escaneos · {a.pct}% del catálogo</Text>
                    </View>
                    <View style={s.audBarBg}>
                      <View style={[s.audBarFill, { width: `${barPct}%` as any, backgroundColor: barColors[i % barColors.length] }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {auditores.length > 1 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Totales del equipo</Text>
              <View style={s.impactoGrid}>
                <View style={[s.impactoCard, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
                  <Ionicons name="people" size={22} color={PRP} />
                  <Text style={[s.impactoNum, { color: PRP }]}>{auditores.length}</Text>
                  <Text style={s.impactoLbl}>Auditores activos</Text>
                </View>
                <View style={[s.impactoCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="scan" size={22} color="#15803D" />
                  <Text style={[s.impactoNum, { color: '#15803D' }]}>{regT.length}</Text>
                  <Text style={s.impactoLbl}>Escaneos totales</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: ECONÓMICO
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'economico' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

          {/* Resumen compacto */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Impacto económico del inventario</Text>

            {/* Pérdida faltantes */}
            <View style={s.econRow}>
              <View style={s.econLeft}>
                <View style={[s.econIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="trending-down" size={18} color="#C2410C" />
                </View>
                <View>
                  <Text style={s.econLbl}>Pérdida faltantes</Text>
                  <Text style={[s.econAmt, { color: '#C2410C' }]}>-{fCOP(costoPerd)}</Text>
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={s.econBarBg}>
                  <View style={[s.econBarFill, { width: `${Math.round(costoPerd / maxEcon * 100)}%` as any, backgroundColor: '#F97316' }]} />
                </View>
                <Text style={s.econBarPct}>{falt} artículos</Text>
              </View>
            </View>

            {/* Valor sobrantes */}
            <View style={s.econRow}>
              <View style={s.econLeft}>
                <View style={[s.econIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="trending-up" size={18} color="#15803D" />
                </View>
                <View>
                  <Text style={s.econLbl}>Valor sobrantes</Text>
                  <Text style={[s.econAmt, { color: '#15803D' }]}>+{fCOP(costoSobr)}</Text>
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={s.econBarBg}>
                  <View style={[s.econBarFill, { width: `${Math.round(costoSobr / maxEcon * 100)}%` as any, backgroundColor: '#22C55E' }]} />
                </View>
                <Text style={s.econBarPct}>{sobr} artículos</Text>
              </View>
            </View>

            {/* Sin stock */}
            {sobrantes.length > 0 && (
              <View style={s.econRow}>
                <View style={s.econLeft}>
                  <View style={[s.econIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="warning" size={18} color="#92400E" />
                  </View>
                  <View>
                    <Text style={s.econLbl}>Sobrantes sin stock</Text>
                    <Text style={[s.econAmt, { color: '#92400E' }]}>+{fCOP(sobTotal)}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={s.econBarBg}>
                    <View style={[s.econBarFill, { width: `${Math.round(sobTotal / maxEcon * 100)}%` as any, backgroundColor: '#F59E0B' }]} />
                  </View>
                  <Text style={s.econBarPct}>{sobrantes.length} registros · ✓{sobConf} ⏳{sobPend}</Text>
                </View>
              </View>
            )}

            {/* Separador + Balance */}
            <View style={[s.balanceBox, {
              backgroundColor: costoSobr - costoPerd >= 0 ? '#F0FDF4' : '#FEF2F2',
              borderColor:     costoSobr - costoPerd >= 0 ? '#BBF7D0' : '#FECACA',
              marginTop: 8,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={costoSobr - costoPerd >= 0 ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={costoSobr - costoPerd >= 0 ? '#15803D' : '#DC2626'}
                />
                <Text style={s.balanceLbl}>Balance general</Text>
              </View>
              <Text style={[s.balanceNum, { color: costoSobr - costoPerd >= 0 ? '#15803D' : '#DC2626' }]}>
                {costoSobr - costoPerd >= 0 ? '+' : ''}{fCOP(costoSobr - costoPerd)}
              </Text>
            </View>
          </View>

          {/* Desglose sin stock */}
          {sobrantes.length > 0 && (
            <View style={s.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={s.cardTitle}>Sobrantes sin stock</Text>
                <TouchableOpacity onPress={() => irDetalle('SIN_STOCK')}>
                  <Text style={{ fontSize: 12, color: tienda.color, fontWeight: '700' }}>Ver todos →</Text>
                </TouchableOpacity>
              </View>
              <View style={s.impactoGrid}>
                <View style={[s.impactoCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Ionicons name="checkmark-circle" size={22} color="#15803D" />
                  <Text style={[s.impactoNum, { color: '#15803D' }]}>{sobConf}</Text>
                  <Text style={s.impactoLbl}>Confirmados</Text>
                </View>
                <View style={[s.impactoCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                  <Ionicons name="time" size={22} color="#92400E" />
                  <Text style={[s.impactoNum, { color: '#92400E' }]}>{sobPend}</Text>
                  <Text style={s.impactoLbl}>Pendientes</Text>
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

      {/* ── Modal foto fullscreen ─────────────────────────────────────── */}
      <Modal
        visible={!!fotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoModal(null)}
      >
        <TouchableOpacity
          style={s.fotoModalBg}
          activeOpacity={1}
          onPress={() => setFotoModal(null)}
        >
          {fotoModal && (
            <>
              <View style={s.fotoModalClose}>
                <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.8)" />
              </View>
              <Image
                source={{ uri: fotoModal }}
                style={s.fotoModalImg}
                resizeMode="contain"
              />
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
  header:      { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 54, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  headerBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: BLK },
  headerSub:   { fontSize: 12, color: MTD, marginTop: 2 },

  // Tabs
  tabsBar:     { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  tab:         { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabTxt:      { fontSize: 13, fontWeight: '500', color: '#A1A1AA' },

  // Card base
  card:        { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: BLK, marginBottom: 14 },

  // Leyenda donut
  legend:      { marginTop: 20, gap: 8 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, gap: 10 },
  legendDot:   { width: 12, height: 12, borderRadius: 6 },
  legendN:     { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  legendLbl:   { fontSize: 11, color: MTD, marginTop: 1 },

  // Progreso
  progBg:      { height: 12, backgroundColor: LGR, borderRadius: 6, overflow: 'hidden' },
  progFill:    { height: '100%', borderRadius: 6 },

  // Filtros
  filterBar:   { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: LGR, borderWidth: 1, borderColor: BRD },
  chipTxt:     { fontSize: 12, color: MTD, fontWeight: '500' },

  // Lista artículos
  artCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  artCardTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  codeTag:     { backgroundColor: LGR, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  codeTxt:     { fontSize: 11, fontWeight: '800' },
  artDesc:     { fontSize: 14, fontWeight: '700', color: BLK, marginBottom: 2 },
  artUbic:     { fontSize: 11, fontWeight: '600', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },

  badge:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeDot:    { width: 7, height: 7, borderRadius: 4, marginRight: 4 },
  badgeTxt:    { fontSize: 11, fontWeight: '700' },

  qtyRow:      { flexDirection: 'row', backgroundColor: LGR, borderRadius: 10, padding: 10, marginBottom: 8 },
  qtyBox:      { flex: 1, alignItems: 'center' },
  qtyLbl:      { fontSize: 9, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  qtyVal:      { fontSize: 13, fontWeight: '800', color: BLK },

  notaRow:     { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 8, padding: 9, marginBottom: 8 },
  notaTxt:     { fontSize: 12, color: '#92400E', flex: 1 },

  metaRow:     { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: LGR },
  metaTxt:     { fontSize: 11, color: '#A1A1AA' },

  // Fotos de sobrantes (thumbnail tappable)
  thumbWrap:   { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  thumb:       { width: 84, height: 84, borderRadius: 12 },
  thumbEmpty:  { width: 84, height: 84, backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center' },
  thumbOverlay:{ position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },

  // Equipo
  audRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  audRank:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  audRankTxt:  { fontSize: 11, fontWeight: '900' },
  audNombre:   { fontSize: 13, fontWeight: '700', color: BLK },
  audMeta:     { fontSize: 11, color: MTD },
  audBarBg:    { height: 8, backgroundColor: LGR, borderRadius: 4, overflow: 'hidden', marginTop: 2 },
  audBarFill:  { height: '100%', borderRadius: 4 },

  // Económico
  econRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  econLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, width: 155 },
  econIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  econLbl:     { fontSize: 11, color: MTD, marginBottom: 2 },
  econAmt:     { fontSize: 14, fontWeight: '800' },
  econBarBg:   { height: 10, backgroundColor: LGR, borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
  econBarFill: { height: '100%', borderRadius: 5 },
  econBarPct:  { fontSize: 10, color: MTD },

  impactoGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  impactoCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
  impactoNum:  { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  impactoLbl:  { fontSize: 11, color: MTD, textAlign: 'center' },
  balanceBox:  { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  balanceLbl:  { fontSize: 13, fontWeight: '600', color: MTD },
  balanceNum:  { fontSize: 18, fontWeight: '900' },

  // Empty state
  emptyCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', borderWidth: 1, borderColor: BRD, alignItems: 'center', justifyContent: 'center' },

  // Modal foto
  fotoModalBg:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  fotoModalClose:{ position: 'absolute', top: 56, right: 20 },
  fotoModalImg:  { width: '95%', aspectRatio: 4 / 3, borderRadius: 16 },
  fotoModalHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 },
});
