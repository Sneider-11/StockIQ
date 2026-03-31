/**
 * ReporteAuditoriaScreen.tsx
 * Reporte de auditoría de inventario — estilo PowerBI, 5 páginas
 * Preparado como lo haría un Auditor Interno con +25 años de experiencia
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Share, Alert,
} from 'react-native';
import Svg, { Circle, Rect, Line, G, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Tienda, Registro, Articulo, SobranteSinStock, Usuario, CLSF, CATALOGO_BASE } from '../constants/data';
import { clasificar, fCOP } from '../utils/helpers';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';

interface Props {
  tienda:          Tienda;
  registros:       Registro[];
  catalogo:        Articulo[];
  sobrantes:       SobranteSinStock[];
  usuarios:        Usuario[];
  confirmadosCero: string[];
  onBack:          () => void;
}

// ─── DONUT ────────────────────────────────────────────────────────────────────
const Donut: React.FC<{ pct: number; color: string; size?: number }> = ({ pct, color, size = 100 }) => {
  const r   = (size - 16) / 2;
  const cx  = size / 2;
  const cy  = size / 2;
  const c   = 2 * Math.PI * r;
  const arc = (pct / 100) * c;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke="#E4E4E7" strokeWidth={10} fill="none" />
      <Circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={10} fill="none"
        strokeDasharray={`${arc} ${c}`} strokeDashoffset={c * 0.25} />
    </Svg>
  );
};

// ─── BARRA HORIZONTAL ─────────────────────────────────────────────────────────
const BarH: React.FC<{ pct: number; color: string; height?: number }> = ({ pct, color, height = 10 }) => (
  <View style={{ flex: 1, height, backgroundColor: '#E4E4E7', borderRadius: height / 2, overflow: 'hidden' }}>
    <View style={{ width: `${Math.max(2, pct)}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
  </View>
);

// ─── SEMÁFORO DE RIESGO ───────────────────────────────────────────────────────
const riesgo = (pct: number, faltPct: number): { nivel: string; color: string; bg: string; icon: string } => {
  if (pct >= 95 && faltPct <= 5)  return { nivel: 'BAJO',  color: '#15803D', bg: '#F0FDF4', icon: 'shield-checkmark' };
  if (pct >= 80 && faltPct <= 15) return { nivel: 'MEDIO', color: '#B45309', bg: '#FFFBEB', icon: 'warning' };
  return                                  { nivel: 'ALTO',  color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle' };
};

const PAGINAS = ['Resumen', 'Clasificación', 'Económico', 'Equipo', 'Conclusiones'];

export const ReporteAuditoriaScreen: React.FC<Props> = ({
  tienda, registros, catalogo, sobrantes, usuarios, confirmadosCero, onBack,
}) => {
  const [pagina, setPagina] = useState(0);

  const CAT         = catalogo.length > 0 ? catalogo : CATALOGO_BASE;
  const regT        = registros.filter(r => r.tiendaId === tienda.id);
  const total       = CAT.length || 1;
  const escSet      = new Set(regT.map(r => r.itemId));
  const confSet     = new Set(confirmadosCero);
  const contados    = new Set([...escSet, ...confSet]).size;
  const pct         = Math.min(100, Math.round(contados / total * 100));

  const artVista = CAT.map(art => {
    const regs = regT.filter(r => r.itemId === art.itemId);
    const ct   = regs.reduce((s, r) => s + r.cantidad, 0);
    const clsf = regs.length > 0 ? clasificar(art.stock, ct) : (art.stock === 0 ? 'SIN_DIF' : 'CERO');
    return { ...art, regs, ct, clsf };
  });

  const sinDif  = artVista.filter(a => a.clsf === 'SIN_DIF').length;
  const falt    = artVista.filter(a => a.clsf === 'FALTANTE').length;
  const sobr    = artVista.filter(a => a.clsf === 'SOBRANTE').length;
  const cero    = artVista.filter(a => a.clsf === 'CERO').length;

  const faltPct = Math.round(falt / total * 100);
  const sinDifPct = Math.round(sinDif / total * 100);
  const { nivel: nivelR, color: colorR, bg: bgR, icon: iconR } = riesgo(pct, faltPct);

  const costoPerd = artVista.filter(a => a.clsf === 'FALTANTE')
    .reduce((s, a) => s + a.costo * Math.abs(a.ct - a.stock), 0);
  const costoSobr = artVista.filter(a => a.clsf === 'SOBRANTE')
    .reduce((s, a) => s + a.costo * Math.abs(a.ct - a.stock), 0);
  const sobTotal  = sobrantes.filter(s => s.tiendaId === tienda.id).reduce((s, sb) => s + sb.precio * sb.cantidad, 0);
  const balance   = costoSobr - costoPerd;

  const auditores = [...new Set(regT.map(r => r.usuarioNombre))].map(n => ({
    nombre: n,
    n: regT.filter(r => r.usuarioNombre === n).length,
    sinDif: regT.filter(r => r.usuarioNombre === n && r.clasificacion === 'SIN_DIF').length,
    falt:   regT.filter(r => r.usuarioNombre === n && r.clasificacion === 'FALTANTE').length,
  })).sort((a, b) => b.n - a.n);

  const maxN   = auditores[0]?.n || 1;
  const fecha  = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Generar texto del reporte para compartir ──────────────────────────────
  const generarTextoReporte = () => {
    const sep = '─'.repeat(50);
    const dobleLinea = '═'.repeat(50);
    const lineas = [
      dobleLinea,
      '   INFORME DE AUDITORÍA DE INVENTARIO FÍSICO',
      '             GRUPO COMERCIAL AUDIMEYER',
      dobleLinea,
      '',
      `Tienda:       ${tienda.nombre}`,
      `Fecha:        ${fecha}`,
      `Generado por: StockIQ — Sistema de Auditoría`,
      '',
      '━ RESUMEN EJECUTIVO ' + '━'.repeat(31),
      '',
      `  Cobertura del inventario:  ${pct}%  (${contados}/${total} artículos)`,
      `  Total escaneos realizados: ${regT.length}`,
      `  Auditores participantes:   ${auditores.length}`,
      `  Nivel de riesgo:           ${nivelR}`,
      '',
      '━ CLASIFICACIÓN DE ARTÍCULOS ' + '━'.repeat(22),
      '',
      `  ✅  Sin diferencia:   ${sinDif}  (${sinDifPct}%)`,
      `  📉  Faltantes:        ${falt}  (${faltPct}%)`,
      `  📈  Sobrantes:        ${sobr}  (${Math.round(sobr/total*100)}%)`,
      `  ⭕  Conteo cero:      ${cero}  (${Math.round(cero/total*100)}%)`,
      `  ⚠️   Sin stock:        ${sobrantes.filter(s=>s.tiendaId===tienda.id).length}`,
      '',
      '━ IMPACTO ECONÓMICO ' + '━'.repeat(31),
      '',
      `  Pérdida por faltantes:     -${fCOP(costoPerd)}`,
      `  Valor de sobrantes:        +${fCOP(costoSobr)}`,
      `  Valor artículos sin stock: +${fCOP(sobTotal)}`,
      `  BALANCE GENERAL:            ${balance >= 0 ? '+' : ''}${fCOP(balance)}`,
      '',
      '━ EQUIPO AUDITOR ' + '━'.repeat(34),
      '',
      ...auditores.map((a, i) => `  ${i+1}. ${a.nombre.padEnd(25)} ${a.n} escaneos`),
      '',
      '━ OBSERVACIONES DEL AUDITOR ' + '━'.repeat(23),
      '',
      ...[
        pct < 100 ? `  ⚠️  El inventario tiene ${100-pct}% pendiente de contar.` : '  ✅  Inventario completado al 100%.',
        faltPct > 10 ? `  🔴  ALERTA: ${falt} artículos faltantes representan un riesgo alto de pérdida.` : '',
        costoPerd > 0 ? `  💰  Se recomienda investigar los ${falt} faltantes por valor de ${fCOP(costoPerd)}.` : '',
        sobrantes.filter(s=>s.tiendaId===tienda.id).length > 0
          ? `  📋  ${sobrantes.filter(s=>s.tiendaId===tienda.id).length} artículos sin stock requieren verificación con el proveedor.`
          : '',
        balance < 0 ? '  ⚡  Balance negativo: se sugiere revisión de controles de inventario.' : '',
      ].filter(Boolean),
      '',
      sep,
      '  Este reporte fue generado automáticamente por StockIQ.',
      '  Para uso interno del Grupo Comercial AudiMeyer.',
      sep,
    ];
    return lineas.join('\n');
  };

  const compartir = async () => {
    try {
      await Share.share({
        message: generarTextoReporte(),
        title:   `Reporte Inventario — ${tienda.nombre}`,
      });
    } catch {
      Alert.alert('Error', 'No se pudo compartir el reporte.');
    }
  };

  // ── PÁGINA 1: RESUMEN EJECUTIVO ────────────────────────────────────────────
  const renderResumen = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={p.pageContent} showsVerticalScrollIndicator={false}>

      {/* Banner riesgo */}
      <View style={[p.riesgoBanner, { backgroundColor: bgR, borderColor: colorR + '40' }]}>
        <Ionicons name={iconR as any} size={28} color={colorR} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[p.riesgoNivel, { color: colorR }]}>RIESGO {nivelR}</Text>
          <Text style={[p.riesgoSub, { color: colorR + 'CC' }]}>
            {nivelR === 'BAJO'  ? 'Inventario en buenas condiciones. Diferencias menores.' :
             nivelR === 'MEDIO' ? 'Se detectaron diferencias significativas. Requiere seguimiento.' :
                                  'Diferencias críticas. Requiere intervención inmediata.'}
          </Text>
        </View>
      </View>

      {/* KPIs principales */}
      <View style={p.kpiRow}>
        {[
          { label: 'Cobertura',    valor: `${pct}%`,         sub: `${contados}/${total} arts.`, color: tienda.color },
          { label: 'Sin diferencia', valor: `${sinDifPct}%`, sub: `${sinDif} artículos`,        color: '#15803D' },
          { label: 'Faltantes',    valor: `${faltPct}%`,     sub: `${falt} artículos`,          color: '#DC2626' },
          { label: 'Escaneos',     valor: String(regT.length), sub: `${auditores.length} audit.`, color: '#7C3AED' },
        ].map(k => (
          <View key={k.label} style={p.kpiCard}>
            <Text style={[p.kpiValor, { color: k.color }]}>{k.valor}</Text>
            <Text style={p.kpiLabel}>{k.label}</Text>
            <Text style={p.kpiSub}>{k.sub}</Text>
          </View>
        ))}
      </View>

      {/* Progreso circular */}
      <View style={p.card}>
        <Text style={p.cardTitle}>Avance del inventario</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <View style={{ alignItems: 'center' }}>
            <Donut pct={pct} color={tienda.color} size={110} />
            <Text style={[p.donutPct, { color: tienda.color, marginTop: -70 }]}>{pct}%</Text>
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            {[
              { label: 'Contados',      n: contados, max: total, color: tienda.color },
              { label: 'Sin diferencia', n: sinDif,   max: total, color: '#15803D' },
              { label: 'Con diferencia', n: falt+sobr+cero, max: total, color: '#DC2626' },
            ].map(b => (
              <View key={b.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={p.barLabel}>{b.label}</Text>
                  <Text style={[p.barLabel, { color: b.color, fontWeight: '700' }]}>{b.n}</Text>
                </View>
                <BarH pct={Math.round(b.n / b.max * 100)} color={b.color} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Datos generales */}
      <View style={p.card}>
        <Text style={p.cardTitle}>Datos generales del inventario</Text>
        {[
          { icon: 'storefront-outline',    label: 'Tienda',          val: tienda.nombre },
          { icon: 'calendar-outline',      label: 'Fecha de reporte', val: fecha },
          { icon: 'cube-outline',          label: 'Artículos en sistema', val: `${total} ítems` },
          { icon: 'scan-outline',          label: 'Escaneos totales', val: `${regT.length} registros` },
          { icon: 'people-outline',        label: 'Equipo auditor',   val: `${auditores.length} persona${auditores.length !== 1 ? 's' : ''}` },
          { icon: 'warning-outline',       label: 'Sobrantes sin stock', val: `${sobrantes.filter(s=>s.tiendaId===tienda.id).length} artículos` },
        ].map(row => (
          <View key={row.label} style={p.infoRow}>
            <View style={p.infoIcon}><Ionicons name={row.icon as any} size={16} color={tienda.color} /></View>
            <Text style={p.infoLabel}>{row.label}</Text>
            <Text style={p.infoVal}>{row.val}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // ── PÁGINA 2: CLASIFICACIÓN ────────────────────────────────────────────────
  const renderClasificacion = () => {
    const items = [
      { k: 'SIN_DIF',  label: 'Sin diferencia', n: sinDif, color: '#6D28D9', pct: Math.round(sinDif/total*100) },
      { k: 'FALTANTE', label: 'Faltantes',       n: falt,  color: '#DC2626', pct: Math.round(falt/total*100) },
      { k: 'SOBRANTE', label: 'Sobrantes',        n: sobr,  color: '#15803D', pct: Math.round(sobr/total*100) },
      { k: 'CERO',     label: 'Conteo cero',      n: cero,  color: '#F59E0B', pct: Math.round(cero/total*100) },
      { k: 'SIN_STOCK',label: 'Sin stock',         n: sobrantes.filter(s=>s.tiendaId===tienda.id).length, color: '#92400E', pct: Math.round(sobrantes.filter(s=>s.tiendaId===tienda.id).length/total*100) },
    ];
    const topFaltantes = artVista.filter(a => a.clsf === 'FALTANTE')
      .sort((a, b) => Math.abs(b.ct - b.stock) - Math.abs(a.ct - a.stock)).slice(0, 5);
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={p.pageContent} showsVerticalScrollIndicator={false}>
        <View style={p.card}>
          <Text style={p.cardTitle}>Distribución de artículos</Text>
          {items.map(it => (
            <View key={it.k} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: it.color }} />
                  <Text style={p.barLabel}>{it.label}</Text>
                </View>
                <Text style={[p.barLabel, { color: it.color, fontWeight: '800' }]}>{it.n} ({it.pct}%)</Text>
              </View>
              <BarH pct={it.pct} color={it.color} height={12} />
            </View>
          ))}
        </View>

        {topFaltantes.length > 0 && (
          <View style={p.card}>
            <Text style={p.cardTitle}>Top faltantes críticos</Text>
            {topFaltantes.map((art, i) => {
              const dif = art.ct - art.stock;
              return (
                <View key={art.itemId} style={p.topRow}>
                  <View style={[p.rankBadge, { backgroundColor: i === 0 ? '#DC2626' : i === 1 ? '#F97316' : '#F59E0B' }]}>
                    <Text style={p.rankTxt}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={p.topCode} numberOfLines={1}>{art.itemId}</Text>
                    <Text style={p.topDesc} numberOfLines={1}>{art.descripcion}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[p.topDif, { color: '#DC2626' }]}>{dif} uds.</Text>
                    <Text style={p.topImpacto}>{fCOP(Math.abs(dif * art.costo))}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  // ── PÁGINA 3: ECONÓMICO ────────────────────────────────────────────────────
  const renderEconomico = () => {
    const maxEcon = Math.max(costoPerd, costoSobr, sobTotal, 1);
    const ventasEst = artVista.reduce((s, a) => s + a.costo * a.stock, 0);
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={p.pageContent} showsVerticalScrollIndicator={false}>

        <View style={[p.balanceCard, { backgroundColor: balance >= 0 ? '#F0FDF4' : '#FEF2F2', borderColor: balance >= 0 ? '#BBF7D0' : '#FECACA' }]}>
          <Text style={[p.balanceLbl, { color: balance >= 0 ? '#15803D' : '#DC2626' }]}>BALANCE GENERAL</Text>
          <Text style={[p.balanceNum, { color: balance >= 0 ? '#15803D' : '#DC2626' }]}>
            {balance >= 0 ? '+' : ''}{fCOP(balance)}
          </Text>
          <Text style={[p.balanceSub, { color: balance >= 0 ? '#15803D' : '#DC2626' }]}>
            {balance >= 0 ? 'Superávit de inventario' : 'Déficit de inventario — requiere atención'}
          </Text>
        </View>

        <View style={p.card}>
          <Text style={p.cardTitle}>Impacto económico por categoría</Text>
          {[
            { label: 'Pérdida faltantes', monto: costoPerd, color: '#DC2626', icon: 'trending-down', signo: '-' },
            { label: 'Valor sobrantes',   monto: costoSobr, color: '#15803D', icon: 'trending-up',   signo: '+' },
            { label: 'Sin stock estimado',monto: sobTotal,  color: '#92400E', icon: 'warning',        signo: '+' },
          ].map(e => (
            <View key={e.label} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={e.icon as any} size={18} color={e.color} />
                  <Text style={[p.barLabel, { color: e.color, fontWeight: '700' }]}>{e.label}</Text>
                </View>
                <Text style={[p.barLabel, { color: e.color, fontWeight: '800', fontSize: 14 }]}>
                  {e.signo}{fCOP(e.monto)}
                </Text>
              </View>
              <BarH pct={Math.round(e.monto / maxEcon * 100)} color={e.color} height={14} />
            </View>
          ))}
        </View>

        <View style={p.card}>
          <Text style={p.cardTitle}>Indicadores financieros clave</Text>
          {[
            { label: 'Valor total inventario (sistema)', val: fCOP(ventasEst), color: MTD },
            { label: 'Tasa de faltantes (%)',            val: `${faltPct}%`,   color: faltPct > 10 ? '#DC2626' : '#15803D' },
            { label: 'Tasa de cobertura (%)',            val: `${pct}%`,       color: pct >= 90 ? '#15803D' : '#B45309' },
            { label: 'Artículos sin diferencia (%)',     val: `${sinDifPct}%`, color: sinDifPct >= 80 ? '#15803D' : '#DC2626' },
          ].map(row => (
            <View key={row.label} style={p.infoRow}>
              <Text style={[p.infoLabel, { flex: 1.5 }]}>{row.label}</Text>
              <Text style={[p.infoVal, { color: row.color, fontWeight: '800' }]}>{row.val}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  // ── PÁGINA 4: EQUIPO ───────────────────────────────────────────────────────
  const renderEquipo = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={p.pageContent} showsVerticalScrollIndicator={false}>
      <View style={p.card}>
        <Text style={p.cardTitle}>Rendimiento por auditor</Text>
        {auditores.length === 0 ? (
          <Text style={{ color: '#A1A1AA', textAlign: 'center', padding: 24 }}>Sin registros</Text>
        ) : auditores.map((a, i) => {
          const audPct  = Math.round(a.n / maxN * 100);
          const precPct = a.n > 0 ? Math.round(a.sinDif / a.n * 100) : 0;
          const colores = [tienda.color, '#4C1D95', '#0369A1', '#065F46', '#92400E'];
          return (
            <View key={a.nombre} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={[p.rankBadge, { backgroundColor: i < 3 ? colores[i] : '#E4E4E7' }]}>
                  <Text style={[p.rankTxt, { color: i < 3 ? '#fff' : '#71717A' }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={p.audNombre} numberOfLines={1}>{a.nombre}</Text>
                  <Text style={p.audSub}>{a.n} escaneos · {precPct}% sin diferencia</Text>
                </View>
                <Text style={[p.audPct, { color: colores[i % colores.length] }]}>{audPct}%</Text>
              </View>
              <BarH pct={audPct} color={colores[i % colores.length]} height={8} />
            </View>
          );
        })}
      </View>

      <View style={p.card}>
        <Text style={p.cardTitle}>Totales del equipo</Text>
        {[
          { label: 'Auditores activos',   val: String(auditores.length),         color: PRP },
          { label: 'Total escaneos',      val: String(regT.length),               color: tienda.color },
          { label: 'Promedio por auditor',val: auditores.length > 0 ? String(Math.round(regT.length / auditores.length)) : '0', color: MTD },
        ].map(row => (
          <View key={row.label} style={p.infoRow}>
            <Text style={p.infoLabel}>{row.label}</Text>
            <Text style={[p.infoVal, { color: row.color, fontWeight: '800' }]}>{row.val}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // ── PÁGINA 5: CONCLUSIONES (Auditor con 25 años de experiencia) ────────────
  const renderConclusiones = () => {
    const obs: { nivel: 'CRITICO' | 'ALERTA' | 'INFO' | 'OK'; texto: string }[] = [];

    if (pct < 100) obs.push({ nivel: 'ALERTA', texto: `El inventario físico tiene un avance del ${pct}%. Se deben completar los ${total - contados} artículos pendientes antes de cerrar el proceso.` });
    else           obs.push({ nivel: 'OK',     texto: 'Inventario físico completado al 100%. Todos los artículos del sistema fueron verificados.' });

    if (faltPct > 15) obs.push({ nivel: 'CRITICO', texto: `La tasa de faltantes del ${faltPct}% supera el umbral crítico del 15%. Se recomienda revisión inmediata de controles de acceso, procedimientos de almacenamiento y posibles mermas no registradas.` });
    else if (faltPct > 5) obs.push({ nivel: 'ALERTA', texto: `La tasa de faltantes del ${faltPct}% supera el parámetro de control del 5%. Se sugiere investigación de cada artículo faltante y cruce con notas de recepción.` });
    else obs.push({ nivel: 'OK', texto: `La tasa de faltantes del ${faltPct}% se encuentra dentro de los parámetros aceptables (< 5%).` });

    if (costoPerd > 500000) obs.push({ nivel: 'CRITICO', texto: `El valor de los faltantes asciende a ${fCOP(costoPerd)}, lo cual representa un impacto económico significativo. Se sugiere apertura de investigación formal y comunicación a la gerencia.` });

    if (sobrantes.filter(s=>s.tiendaId===tienda.id).length > 0) obs.push({ nivel: 'ALERTA', texto: `Se registraron ${sobrantes.filter(s=>s.tiendaId===tienda.id).length} artículos sobrantes sin stock en sistema. Estos deben ser verificados con el área de compras para determinar si son devoluciones sin registrar, mercancía en tránsito o artículos de proveedores no facturados.` });

    if (sinDifPct < 70) obs.push({ nivel: 'ALERTA', texto: `Solo el ${sinDifPct}% de los artículos auditados coincide con el sistema. Esto puede indicar debilidades en el proceso de registro de entradas y salidas. Se recomienda capacitación del equipo y revisión del proceso de recepción.` });
    else obs.push({ nivel: 'OK', texto: `El ${sinDifPct}% de artículos sin diferencia refleja un buen control del inventario. Se recomienda mantener las prácticas actuales.` });

    if (balance < 0) obs.push({ nivel: 'CRITICO', texto: `El balance general del inventario es negativo (${fCOP(balance)}), lo que indica pérdidas netas de mercancía. Se debe iniciar un proceso de auditoría forense para determinar las causas.` });

    const rec = [
      faltPct > 5  ? 'Implementar conteos cíclicos mensuales para los artículos de mayor rotación y valor.' : null,
      pct < 95     ? 'Establecer una política de cierre del inventario con porcentaje mínimo de cobertura del 98%.' : null,
      auditores.length < 2 ? 'Considerar ampliar el equipo auditor para reducir tiempos y mejorar la cobertura.' : null,
      'Cruzar los resultados con el sistema contable y conciliar las diferencias antes del cierre del período.',
      'Documentar y custodiar este reporte como soporte del proceso de auditoría interna.',
      balance < 0  ? 'Comunicar los resultados a la gerencia general y área financiera de inmediato.' : null,
    ].filter(Boolean) as string[];

    const colNivel = { CRITICO: '#DC2626', ALERTA: '#B45309', INFO: '#0369A1', OK: '#15803D' };
    const bgNivel  = { CRITICO: '#FEF2F2', ALERTA: '#FFFBEB', INFO: '#EFF6FF', OK: '#F0FDF4' };
    const iconNivel = { CRITICO: 'alert-circle', ALERTA: 'warning', INFO: 'information-circle', OK: 'checkmark-circle' };

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={p.pageContent} showsVerticalScrollIndicator={false}>
        <View style={p.card}>
          <Text style={p.cardTitle}>Hallazgos y observaciones</Text>
          <Text style={{ fontSize: 11, color: MTD, marginBottom: 12, lineHeight: 16 }}>
            Basado en los estándares de auditoría interna IPPF — IIA y más de 25 años de experiencia en auditoría de inventarios del sector comercial.
          </Text>
          {obs.map((o, i) => (
            <View key={i} style={[p.obsRow, { backgroundColor: bgNivel[o.nivel], borderLeftColor: colNivel[o.nivel] }]}>
              <Ionicons name={iconNivel[o.nivel] as any} size={18} color={colNivel[o.nivel]} style={{ marginRight: 10, marginTop: 2, flexShrink: 0 }} />
              <View style={{ flex: 1 }}>
                <Text style={[p.obsNivel, { color: colNivel[o.nivel] }]}>{o.nivel}</Text>
                <Text style={[p.obsTxt, { color: BLK }]}>{o.texto}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={p.card}>
          <Text style={p.cardTitle}>Recomendaciones del auditor</Text>
          {rec.map((r, i) => (
            <View key={i} style={p.recRow}>
              <View style={p.recNum}><Text style={p.recNumTxt}>{i + 1}</Text></View>
              <Text style={p.recTxt}>{r}</Text>
            </View>
          ))}
        </View>

        <View style={[p.card, { backgroundColor: '#F8F7FF', borderColor: PRP + '30' }]}>
          <Text style={[p.cardTitle, { color: PRP }]}>Firma del auditor</Text>
          <Text style={{ fontSize: 12, color: MTD, lineHeight: 18 }}>
            Este informe ha sido preparado siguiendo los estándares internacionales de auditoría interna (IPPF) y las mejores prácticas para auditorías de inventario físico en el sector comercial automotriz y de motos.{'\n\n'}
            El auditor certifica que los procedimientos fueron aplicados de acuerdo con los controles establecidos por el Grupo Comercial AudiMeyer y que los resultados reflejan fielmente la situación del inventario a la fecha indicada.
          </Text>
          <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: BRD }}>
            <Text style={{ fontSize: 11, color: MTD }}>Sistema de auditoría: StockIQ v2.3.0</Text>
            <Text style={{ fontSize: 11, color: MTD }}>Fecha de generación: {fecha}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderPagina = () => {
    switch (pagina) {
      case 0: return renderResumen();
      case 1: return renderClasificacion();
      case 2: return renderEconomico();
      case 3: return renderEquipo();
      case 4: return renderConclusiones();
      default: return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: LGR }}>

      {/* Header */}
      <View style={[p.header, { backgroundColor: tienda.color }]}>
        <TouchableOpacity onPress={onBack} style={p.backBtn}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={p.headerSup}>REPORTE DE AUDITORÍA</Text>
          <Text style={p.headerTitle} numberOfLines={1}>{tienda.nombre}</Text>
        </View>
        <TouchableOpacity onPress={compartir} style={p.shareBtn}>
          <Ionicons name="share-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Indicador de página (PowerBI style) */}
      <View style={p.paginaBar}>
        {PAGINAS.map((pg, i) => (
          <TouchableOpacity
            key={pg}
            style={[p.paginaTab, pagina === i && { borderBottomColor: tienda.color, borderBottomWidth: 3 }]}
            onPress={() => setPagina(i)}
          >
            <Text style={[p.paginaTxt, pagina === i && { color: tienda.color, fontWeight: '700' }]}>{pg}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenido de la página */}
      {renderPagina()}
    </View>
  );
};

const p = StyleSheet.create({
  header:      { paddingTop: 54, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  shareBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerSup:   { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },

  paginaBar:   { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  paginaTab:   { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  paginaTxt:   { fontSize: 11, fontWeight: '500', color: MTD },

  pageContent: { padding: 14, paddingBottom: 48 },

  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle:   { fontSize: 13, fontWeight: '800', color: BLK, marginBottom: 14 },

  riesgoBanner:{ flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  riesgoNivel: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  riesgoSub:   { fontSize: 12, marginTop: 2, lineHeight: 17 },

  kpiRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard:     { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BRD, alignItems: 'center' },
  kpiValor:    { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  kpiLabel:    { fontSize: 10, fontWeight: '700', color: MTD, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiSub:      { fontSize: 10, color: '#A1A1AA', marginTop: 2 },

  donutPct:    { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  barLabel:    { fontSize: 12, color: MTD },

  infoRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: LGR },
  infoIcon:    { width: 28, height: 28, borderRadius: 8, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  infoLabel:   { flex: 1, fontSize: 12, color: MTD },
  infoVal:     { fontSize: 12, fontWeight: '700', color: BLK },

  topRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, backgroundColor: LGR, borderRadius: 12, padding: 10 },
  rankBadge:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankTxt:     { fontSize: 11, fontWeight: '900', color: '#fff' },
  topCode:     { fontSize: 11, fontWeight: '800', color: MTD },
  topDesc:     { fontSize: 12, fontWeight: '700', color: BLK },
  topDif:      { fontSize: 13, fontWeight: '900' },
  topImpacto:  { fontSize: 10, color: MTD },

  balanceCard: { borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1.5, alignItems: 'center' },
  balanceLbl:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  balanceNum:  { fontSize: 32, fontWeight: '900', marginBottom: 6 },
  balanceSub:  { fontSize: 12, fontWeight: '600' },

  audNombre:   { fontSize: 13, fontWeight: '700', color: BLK },
  audSub:      { fontSize: 11, color: MTD },
  audPct:      { fontSize: 14, fontWeight: '900' },

  obsRow:      { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 4 },
  obsNivel:    { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  obsTxt:      { fontSize: 12, lineHeight: 18 },

  recRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  recNum:      { width: 24, height: 24, borderRadius: 12, backgroundColor: PRP, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  recNumTxt:   { fontSize: 11, fontWeight: '900', color: '#fff' },
  recTxt:      { flex: 1, fontSize: 12, color: BLK, lineHeight: 18 },
});
