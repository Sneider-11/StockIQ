/**
 * ReporteAuditoriaScreen.tsx
 * Informe ejecutivo de auditoría de inventario
 * Estilo profesional — Orvion Tech / StockIQ
 * Generación de PDF real con expo-print + expo-sharing
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
// expo-print y expo-sharing se cargan dinámicamente — no forman parte del bundle inicial
let _Print: typeof import('expo-print') | null = null;
let _Sharing: typeof import('expo-sharing') | null = null;
async function loadPrintLibs() {
  if (!_Print)   _Print   = await import('expo-print');
  if (!_Sharing) _Sharing = await import('expo-sharing');
  return { Print: _Print!, Sharing: _Sharing! };
}
import { Ionicons } from '@expo/vector-icons';
import {
  Tienda, Registro, Articulo, SobranteSinStock, Usuario, CATALOGO_BASE,
} from '../constants/data';
import { clasificar, fCOP } from '../utils/helpers';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';
import { useThemeColors } from '../hooks/useThemeColors';

interface Props {
  tienda:          Tienda;
  registros:       Registro[];
  catalogo:        Articulo[];
  sobrantes:       SobranteSinStock[];
  usuarios:        Usuario[];
  confirmadosCero: string[];
  onBack:          () => void;
}

// ─── DONUT CHART (pantalla) ───────────────────────────────────────────────────
const Donut: React.FC<{ pct: number; color: string; size?: number }> = ({
  pct, color, size = 120,
}) => {
  const sw  = 14;
  const r   = (size - sw) / 2;
  const cx  = size / 2;
  const cy  = size / 2;
  const c   = 2 * Math.PI * r;
  const arc = Math.max(0, Math.min(1, pct / 100)) * c;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke="#E4E4E7" strokeWidth={sw} fill="none" />
        {arc > 0 && (
          <Circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={sw} fill="none"
            strokeDasharray={`${arc} ${c}`}
            strokeDashoffset={c * 0.25}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 22, fontWeight: '900', color }}>{pct}%</Text>
        <Text style={{ fontSize: 10, color: MTD, marginTop: 1 }}>completado</Text>
      </View>
    </View>
  );
};

// ─── BARRA HORIZONTAL ─────────────────────────────────────────────────────────
const BarH: React.FC<{ pct: number; color: string; h?: number }> = ({
  pct, color, h = 10,
}) => (
  <View style={{ height: h, backgroundColor: '#E4E4E7', borderRadius: h / 2, overflow: 'hidden' }}>
    <View style={{ width: `${Math.max(1, pct)}%`, height: h, backgroundColor: color, borderRadius: h / 2 }} />
  </View>
);

// ─── NIVEL DE RIESGO ─────────────────────────────────────────────────────────
function nivelRiesgo(pct: number, faltPct: number) {
  if (pct >= 95 && faltPct <= 5)  return { nivel: 'BAJO',  color: '#15803D', bg: '#F0FDF4', icon: 'shield-checkmark' as const };
  if (pct >= 80 && faltPct <= 15) return { nivel: 'MEDIO', color: '#B45309', bg: '#FFFBEB', icon: 'warning'           as const };
  return                                  { nivel: 'ALTO',  color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle'      as const };
}

// ─── PÁGINAS (sin Equipo) ─────────────────────────────────────────────────────
const TABS = ['Resumen', 'Clasificación', 'Económico', 'Conclusiones'];

// ══════════════════════════════════════════════════════════════════════════════
export const ReporteAuditoriaScreen: React.FC<Props> = ({
  tienda, registros, catalogo, sobrantes, confirmadosCero, onBack,
}) => {
  const tc = useThemeColors();
  const [tab,        setTab]        = useState(0);
  const [generando,  setGenerando]  = useState(false);

  // ── Cálculos base ──────────────────────────────────────────────────────────
  const CAT      = catalogo.length > 0 ? catalogo : CATALOGO_BASE;
  const regT     = registros.filter(r => r.tiendaId === tienda.id);
  const total    = CAT.length || 1;
  const escSet   = new Set(regT.map(r => r.itemId));
  const confSet  = new Set(confirmadosCero);
  const contados = new Set([...escSet, ...confSet]).size;
  const pct      = Math.min(100, Math.round(contados / total * 100));

  const artVista = CAT.map(art => {
    const regs = regT.filter(r => r.itemId === art.itemId);
    const ct   = regs.reduce((s, r) => s + r.cantidad, 0);
    const clsf = regs.length > 0
      ? clasificar(art.stock, ct)
      : (art.stock === 0 ? 'SIN_DIF' : 'CERO');
    return { ...art, regs, ct, clsf };
  });

  const sinDif   = artVista.filter(a => a.clsf === 'SIN_DIF').length;
  const falt     = artVista.filter(a => a.clsf === 'FALTANTE').length;
  const sobr     = artVista.filter(a => a.clsf === 'SOBRANTE').length;
  const cero     = artVista.filter(a => a.clsf === 'CERO').length;

  const faltPct    = Math.round(falt   / total * 100);
  const sobrPct    = Math.round(sobr   / total * 100);
  const ceroPct    = Math.round(cero   / total * 100);
  const sinDifPct  = Math.round(sinDif / total * 100);

  const { nivel: nivelR, color: colorR, bg: bgRLight, icon: iconR } = nivelRiesgo(pct, faltPct);
  const bgR = tc.isDark
    ? (nivelR === 'BAJO' ? '#0D2818' : nivelR === 'MEDIO' ? '#292014' : '#2D0A0A')
    : bgRLight;

  const costoPerd  = artVista.filter(a => a.clsf === 'FALTANTE')
    .reduce((s, a) => s + a.costo * Math.abs(a.ct - a.stock), 0);
  const costoSobr  = artVista.filter(a => a.clsf === 'SOBRANTE')
    .reduce((s, a) => s + a.costo * Math.abs(a.ct - a.stock), 0);
  const sobTotal   = sobrantes.reduce((s, sb) => s + sb.precio * sb.cantidad, 0);
  const balance    = costoSobr - costoPerd;
  const ventasEst  = CAT.reduce((s, a) => s + a.costo * a.stock, 0);

  const topFalt = [...artVista.filter(a => a.clsf === 'FALTANTE')]
    .sort((a, b) => Math.abs(b.ct - b.stock) - Math.abs(a.ct - a.stock))
    .slice(0, 5);

  const fecha  = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const maxEcon = Math.max(costoPerd, costoSobr, sobTotal, 1);

  // ── OBSERVACIONES (Auditor >=25 años) ─────────────────────────────────────
  type NivelObs = 'CRÍTICO' | 'ALERTA' | 'OK' | 'INFO';
  const obsColor: Record<NivelObs, string> = { 'CRÍTICO': '#DC2626', ALERTA: '#B45309', OK: '#15803D', INFO: '#0369A1' };
  const obsBg:    Record<NivelObs, string> = { 'CRÍTICO': '#FEF2F2', ALERTA: '#FFFBEB', OK: '#F0FDF4', INFO: '#EFF6FF' };
  const obsIcon:  Record<NivelObs, any>   = { 'CRÍTICO': 'alert-circle', ALERTA: 'warning', OK: 'checkmark-circle', INFO: 'information-circle' };

  const observaciones: { nivel: NivelObs; texto: string }[] = [];

  // Cobertura
  if (pct < 100) {
    observaciones.push({ nivel: 'ALERTA', texto: `El inventario físico registra un avance de ${pct}% (${contados} de ${total} artículos). Los ${total - contados} artículos no contados representan un riesgo de cierre incompleto y comprometen la integridad del proceso de auditoría.` });
  } else {
    observaciones.push({ nivel: 'OK', texto: `Inventario físico completado al 100%. La totalidad de los ${total} artículos del sistema fue verificada en campo, garantizando la integridad del proceso de auditoría.` });
  }

  // Faltantes
  if (faltPct > 15) {
    observaciones.push({ nivel: 'CRÍTICO', texto: `La tasa de faltantes del ${faltPct}% (${falt} artículos) supera ampliamente el umbral crítico del 15% establecido por las normas IPPF. Este nivel indica debilidades severas en los controles de custodia, posibles mermas no registradas o inconsistencias en el sistema. Se requiere apertura de investigación formal e intervención inmediata de la gerencia.` });
  } else if (faltPct > 5) {
    observaciones.push({ nivel: 'ALERTA', texto: `La tasa de faltantes del ${faltPct}% supera el parámetro de control del 5%. Se recomienda investigar cada artículo individualmente, cruzar con notas de recepción, registros de devoluciones y bitácoras de acceso al almacén.` });
  } else if (faltPct > 0) {
    observaciones.push({ nivel: 'INFO', texto: `La tasa de faltantes del ${faltPct}% se encuentra dentro de parámetros aceptables (< 5%). Se recomienda documentar y monitorear estos artículos en los próximos ciclos de conteo.` });
  } else {
    observaciones.push({ nivel: 'OK', texto: 'No se detectaron artículos faltantes. El inventario físico coincide plenamente con los registros del sistema en la categoría de faltantes.' });
  }

  // Impacto económico
  if (costoPerd > 1_000_000) {
    observaciones.push({ nivel: 'CRÍTICO', texto: `El valor de los faltantes asciende a ${fCOP(costoPerd)}, representando un impacto económico mayor que exige comunicación inmediata a la gerencia financiera y apertura de un expediente de auditoría. Se sugiere analizar los artículos de mayor costo individual como punto de partida de la investigación.` });
  } else if (costoPerd > 200_000) {
    observaciones.push({ nivel: 'ALERTA', texto: `Los faltantes representan un impacto económico de ${fCOP(costoPerd)}. Se recomienda investigar los ${falt} artículos afectados y documentar hallazgos antes del cierre del período contable.` });
  }

  // Sobrantes sin stock
  if (sobrantes.length > 0) {
    const pendientes = sobrantes.filter(s => s.estado === 'PENDIENTE').length;
    observaciones.push({ nivel: pendientes > 0 ? 'ALERTA' : 'INFO', texto: `Se identificaron ${sobrantes.length} artículos sobrantes sin registro en el sistema (${pendientes} pendientes de verificación). Estos artículos deben conciliarse con el área de compras para determinar si corresponden a devoluciones sin registrar, mercancía en tránsito, artículos de proveedores no facturados o posibles errores de recepción.` });
  }

  // Balance general
  if (balance < 0) {
    observaciones.push({ nivel: 'CRÍTICO', texto: `El balance general del inventario arroja un déficit de ${fCOP(Math.abs(balance))}. Este resultado negativo indica que las pérdidas por faltantes superan el valor de los sobrantes. Se recomienda revisar los controles internos, el proceso de recepción de mercancía y los accesos al almacén con carácter de urgencia.` });
  } else if (balance > 0) {
    observaciones.push({ nivel: 'INFO', texto: `El balance general presenta un superávit de ${fCOP(balance)}, lo que indica que el valor de los sobrantes supera las pérdidas por faltantes. Aunque favorable, los sobrantes también representan irregularidades que deben ser explicadas y normalizadas.` });
  }

  // Exactitud
  if (sinDifPct < 70) {
    observaciones.push({ nivel: 'ALERTA', texto: `Solo el ${sinDifPct}% de los artículos auditados coincide con el sistema de inventario. Este nivel de precisión por debajo del 70% sugiere debilidades estructurales en los procesos de registro de entradas, salidas y ajustes. Se recomienda una revisión integral del proceso de operación del sistema.` });
  } else if (sinDifPct >= 90) {
    observaciones.push({ nivel: 'OK', texto: `El ${sinDifPct}% de artículos sin diferencia evidencia un sólido control del inventario. Se recomienda mantener las prácticas actuales e implementar conteos cíclicos para sostener este nivel de precisión.` });
  }

  // Recomendaciones
  const recomendaciones: string[] = [
    faltPct > 5  ? `Establecer un plan de acción inmediato para investigar los ${falt} artículos faltantes, asignando un responsable y un plazo máximo de 15 días hábiles.` : null,
    pct < 95     ? 'Implementar una política de cierre de inventario con una cobertura mínima obligatoria del 98% antes de validar el proceso.': null,
    'Cruzar los resultados de este inventario con los registros contables del período y conciliar todas las diferencias antes del cierre mensual.',
    sobrantes.length > 0 ? 'Gestionar los artículos sobrantes sin stock con el área de compras dentro de los próximos 5 días hábiles para su normalización contable.' : null,
    'Documentar y custodiar este informe como soporte probatorio del proceso de auditoría interna, conforme a los estándares IPPF del IIA.',
    faltPct > 10 ? 'Considerar la implementación de conteos cíclicos semanales para los artículos de mayor valor y rotación como control preventivo.' : 'Mantener conteos cíclicos mensuales para los artículos de alto valor como parte del programa de auditoría continua.',
    balance < 0 ? 'Comunicar el resultado del balance a la gerencia general y al área financiera con carácter urgente, adjuntando este informe.' : null,
  ].filter(Boolean) as string[];

  // ── GENERADOR DE PDF (HTML completo) ──────────────────────────────────────
  const generarHTML = (): string => {
    // Donut SVG inline
    const donutR   = 55;
    const donutCx  = 75;
    const donutCy  = 75;
    const donutC   = 2 * Math.PI * donutR;
    const donutArc = (pct / 100) * donutC;
    const donutSVG = `
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" stroke="#E4E4E7" stroke-width="18" fill="none"/>
        <circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" stroke="${tienda.color}" stroke-width="18" fill="none"
          stroke-dasharray="${donutArc.toFixed(1)} ${donutC.toFixed(1)}"
          stroke-dashoffset="${(donutC * 0.25).toFixed(1)}"
          stroke-linecap="round"
          transform="rotate(-90 ${donutCx} ${donutCy})"/>
        <text x="${donutCx}" y="${donutCy - 6}" text-anchor="middle" font-size="26" font-weight="900" font-family="Arial,sans-serif" fill="${tienda.color}">${pct}%</text>
        <text x="${donutCx}" y="${donutCy + 14}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#71717A">completado</text>
      </svg>`;

    // Función auxiliar para barras
    const bar = (pctVal: number, color: string) =>
      `<div style="height:12px;background:#E4E4E7;border-radius:6px;overflow:hidden;margin-top:4px;">
         <div style="width:${Math.max(1, pctVal)}%;height:12px;background:${color};border-radius:6px;"></div>
       </div>`;

    // Chips de clasificación
    const chips = [
      { label: 'Sin diferencia', n: sinDif,  pct: sinDifPct, color: '#6D28D9', bg: '#EDE9FE' },
      { label: 'Faltantes',      n: falt,    pct: faltPct,   color: '#DC2626', bg: '#FEF2F2' },
      { label: 'Sobrantes',      n: sobr,    pct: sobrPct,   color: '#15803D', bg: '#F0FDF4' },
      { label: 'Conteo cero',    n: cero,    pct: ceroPct,   color: '#B45309', bg: '#FFFBEB' },
      { label: 'Sin stock',      n: sobrantes.length, pct: Math.round(sobrantes.length/total*100), color: '#92400E', bg: '#FEF3C7' },
    ].map(c => `
      <div style="display:inline-flex;align-items:center;background:${c.bg};border-radius:8px;padding:6px 12px;margin:4px;">
        <span style="font-size:20px;font-weight:900;color:${c.color};margin-right:8px;">${c.n}</span>
        <div><div style="font-size:10px;font-weight:700;color:${c.color};">${c.label}</div>
          <div style="font-size:10px;color:#71717A;">${c.pct}%</div></div>
      </div>`).join('');

    // Top faltantes
    const topFaltHTML = topFalt.length > 0 ? `
      <div class="section">
        <div class="section-title">Top artículos faltantes críticos</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#F4F4F5;">
              <th style="padding:8px;text-align:left;font-size:11px;color:#71717A;">#</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#71717A;">Código</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#71717A;">Descripción</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#71717A;">Diferencia</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#71717A;">Impacto</th>
            </tr>
          </thead>
          <tbody>
            ${topFalt.map((art, i) => {
              const dif = art.ct - art.stock;
              const rowBg = i % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
              return `<tr style="background:${rowBg};">
                <td style="padding:8px;font-size:12px;font-weight:700;color:${i===0?'#DC2626':i===1?'#F97316':'#B45309'};">${i+1}</td>
                <td style="padding:8px;font-size:11px;font-weight:800;color:#18181B;">${art.itemId}</td>
                <td style="padding:8px;font-size:12px;color:#3F3F46;">${art.descripcion}</td>
                <td style="padding:8px;text-align:right;font-size:12px;font-weight:700;color:#DC2626;">${dif} uds.</td>
                <td style="padding:8px;text-align:right;font-size:12px;font-weight:700;color:#DC2626;">${fCOP(Math.abs(dif * art.costo))}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : '';

    // Observaciones en HTML
    const obsHtmlColors: Record<string, string> = { 'CRÍTICO': '#DC2626', ALERTA: '#B45309', OK: '#15803D', INFO: '#0369A1' };
    const obsHtmlBg:     Record<string, string> = { 'CRÍTICO': '#FEF2F2', ALERTA: '#FFFBEB', OK: '#F0FDF4', INFO: '#EFF6FF' };
    const obsHtmlBorder: Record<string, string> = { 'CRÍTICO': '#FECACA', ALERTA: '#FDE68A', OK: '#BBF7D0', INFO: '#BAE6FD' };
    const obsHTML = observaciones.map(o => `
      <div style="display:flex;align-items:flex-start;background:${obsHtmlBg[o.nivel]};border:1px solid ${obsHtmlBorder[o.nivel]};border-left:4px solid ${obsHtmlColors[o.nivel]};border-radius:8px;padding:12px;margin-bottom:10px;">
        <div style="width:70px;flex-shrink:0;">
          <span style="font-size:9px;font-weight:800;color:${obsHtmlColors[o.nivel]};letter-spacing:0.5px;text-transform:uppercase;">${o.nivel}</span>
        </div>
        <p style="margin:0;font-size:12px;color:#18181B;line-height:1.6;">${o.texto}</p>
      </div>`).join('');

    const recHTML = recomendaciones.map((r, i) => `
      <div style="display:flex;align-items:flex-start;margin-bottom:10px;">
        <span style="width:22px;height:22px;border-radius:50%;background:${tienda.color};color:#fff;font-size:11px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:10px;margin-top:1px;">${i+1}</span>
        <p style="margin:0;font-size:12px;color:#3F3F46;line-height:1.6;">${r}</p>
      </div>`).join('');

    const riesgoBoxColor = nivelR === 'BAJO' ? '#15803D' : nivelR === 'MEDIO' ? '#B45309' : '#DC2626';
    const riesgoBg       = nivelR === 'BAJO' ? '#F0FDF4' : nivelR === 'MEDIO' ? '#FFFBEB' : '#FEF2F2';
    const riesgoTexto    = nivelR === 'BAJO'  ? 'Inventario en buenas condiciones. Las diferencias detectadas son menores y manejables con los controles habituales.'
                         : nivelR === 'MEDIO' ? 'Se detectaron diferencias significativas que requieren seguimiento formal y acciones correctivas dentro del ciclo contable.'
                         : 'Diferencias críticas detectadas. Se requiere intervención inmediata y comunicación urgente a la dirección general.';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Auditoría — ${tienda.nombre}</title>
  <style>
    @page {
      size: A4;
      margin: 28mm 32mm 32mm 32mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #18181B; }
    .page { max-width: 760px; margin: 0 auto; padding: 28px 24px; }
    .header { background: ${tienda.color}; border-radius: 16px; padding: 28px 32px; margin-bottom: 24px; color: #fff; }
    .header-brand { font-size: 11px; font-weight: 700; letter-spacing: 2px; opacity: 0.7; text-transform: uppercase; margin-bottom: 4px; }
    .header-title { font-size: 26px; font-weight: 900; margin-bottom: 2px; }
    .header-sub   { font-size: 13px; opacity: 0.75; }
    .header-meta  { display: flex; gap: 24px; margin-top: 18px; flex-wrap: wrap; }
    .header-meta-item { background: rgba(255,255,255,0.15); border-radius: 10px; padding: 10px 16px; }
    .header-meta-label { font-size: 10px; opacity: 0.75; letter-spacing: 0.5px; text-transform: uppercase; }
    .header-meta-val   { font-size: 14px; font-weight: 800; margin-top: 2px; }

    .risk-banner { display: flex; align-items: flex-start; background: ${riesgoBg}; border: 1px solid ${riesgoBoxColor}40; border-left: 5px solid ${riesgoBoxColor}; border-radius: 12px; padding: 16px; margin-bottom: 18px; }
    .risk-nivel { font-size: 18px; font-weight: 900; color: ${riesgoBoxColor}; letter-spacing: 0.5px; }
    .risk-sub   { font-size: 12px; color: ${riesgoBoxColor}CC; margin-top: 4px; line-height: 1.5; }

    .kpi-grid { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
    .kpi-card { flex: 1; min-width: 130px; background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #E4E4E7; text-align: center; }
    .kpi-val  { font-size: 28px; font-weight: 900; }
    .kpi-lbl  { font-size: 10px; font-weight: 700; color: #71717A; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .kpi-sub  { font-size: 10px; color: #A1A1AA; margin-top: 2px; }

    .section { background: #fff; border-radius: 14px; padding: 20px; margin-bottom: 16px; border: 1px solid #E4E4E7; }
    .section-title { font-size: 13px; font-weight: 800; color: #18181B; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #F4F4F5; }

    .progress-row { display: flex; align-items: center; gap: 24px; margin-bottom: 12px; }
    .bar-row { display: flex; align-items: center; margin-bottom: 10px; }
    .bar-label { font-size: 12px; color: #71717A; width: 120px; flex-shrink: 0; }
    .bar-val   { font-size: 12px; font-weight: 700; width: 70px; text-align: right; flex-shrink: 0; margin-left: 8px; }

    .econ-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .econ-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .econ-label { font-size: 11px; color: #71717A; }
    .econ-amount { font-size: 14px; font-weight: 800; }

    .balance-box { border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 16px; border: 2px solid; }

    .info-table { width: 100%; }
    .info-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #F4F4F5; }
    .info-lbl { flex: 1; font-size: 12px; color: #71717A; }
    .info-val { font-size: 12px; font-weight: 700; color: #18181B; }

    .footer { background: #18181B; border-radius: 12px; padding: 20px 24px; margin-top: 28px; color: rgba(255,255,255,0.7); font-size: 11px; line-height: 1.7; }
    .footer strong { color: #fff; }

    @media print {
      body { background: #fff; }
      .page { padding: 0; max-width: 100%; }
      .section { break-inside: avoid; }
      .header  { break-after: avoid; }
      .footer  { break-before: avoid; margin-top: 16px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ENCABEZADO -->
  <div class="header">
    <div class="header-brand">Orvion Tech · StockIQ · Auditoría de Inventario</div>
    <div class="header-title">Reporte de Auditoría</div>
    <div class="header-sub">${tienda.nombre}</div>
    <div class="header-meta">
      <div class="header-meta-item">
        <div class="header-meta-label">Fecha</div>
        <div class="header-meta-val">${fecha}</div>
      </div>
      <div class="header-meta-item">
        <div class="header-meta-label">Cobertura</div>
        <div class="header-meta-val">${pct}% (${contados}/${total})</div>
      </div>
      <div class="header-meta-item">
        <div class="header-meta-label">Nivel de riesgo</div>
        <div class="header-meta-val">RIESGO ${nivelR}</div>
      </div>
      <div class="header-meta-item">
        <div class="header-meta-label">Total escaneos</div>
        <div class="header-meta-val">${regT.length}</div>
      </div>
    </div>
  </div>

  <!-- SEMÁFORO DE RIESGO -->
  <div class="risk-banner">
    <div style="margin-right:16px;flex-shrink:0;">${donutSVG}</div>
    <div>
      <div class="risk-nivel">RIESGO ${nivelR}</div>
      <p class="risk-sub">${riesgoTexto}</p>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-val" style="color:${tienda.color};">${pct}%</div>
      <div class="kpi-lbl">Cobertura</div>
      <div class="kpi-sub">${contados} / ${total} arts.</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color:#15803D;">${sinDifPct}%</div>
      <div class="kpi-lbl">Sin diferencia</div>
      <div class="kpi-sub">${sinDif} artículos</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color:#DC2626;">${faltPct}%</div>
      <div class="kpi-lbl">Faltantes</div>
      <div class="kpi-sub">${falt} artículos</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color:${balance >= 0 ? '#15803D' : '#DC2626'};">${balance >= 0 ? '+' : ''}${fCOP(balance)}</div>
      <div class="kpi-lbl">Balance</div>
      <div class="kpi-sub">${balance >= 0 ? 'Superávit' : 'Déficit'}</div>
    </div>
  </div>

  <!-- CLASIFICACIÓN -->
  <div class="section">
    <div class="section-title">Clasificación de artículos</div>
    <div style="margin-bottom:16px;">${chips}</div>
    ${[
      { label: 'Sin diferencia', n: sinDif, pct: sinDifPct, color: '#6D28D9' },
      { label: 'Faltantes',      n: falt,   pct: faltPct,   color: '#DC2626' },
      { label: 'Sobrantes',      n: sobr,   pct: sobrPct,   color: '#15803D' },
      { label: 'Conteo cero',    n: cero,   pct: ceroPct,   color: '#B45309' },
    ].map(it => `
      <div class="bar-row">
        <div class="bar-label">${it.label}</div>
        <div style="flex:1;">${bar(it.pct, it.color)}</div>
        <div class="bar-val" style="color:${it.color};">${it.n} <span style="font-weight:400;color:#A1A1AA;">(${it.pct}%)</span></div>
      </div>`).join('')}
  </div>

  ${topFaltHTML}

  <!-- IMPACTO ECONÓMICO -->
  <div class="balance-box" style="background:${balance >= 0 ? '#F0FDF4' : '#FEF2F2'};border-color:${balance >= 0 ? '#BBF7D0' : '#FECACA'};">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${balance >= 0 ? '#15803D' : '#DC2626'};margin-bottom:8px;">Balance General del Inventario</div>
    <div style="font-size:36px;font-weight:900;color:${balance >= 0 ? '#15803D' : '#DC2626'};">${balance >= 0 ? '+' : ''}${fCOP(balance)}</div>
    <div style="font-size:12px;color:${balance >= 0 ? '#15803D' : '#DC2626'};margin-top:6px;">${balance >= 0 ? 'Superávit — el valor de sobrantes supera las pérdidas' : 'Déficit — las pérdidas superan el valor de sobrantes'}</div>
  </div>

  <div class="section">
    <div class="section-title">Impacto económico por categoría</div>
    ${[
      { label: 'Pérdida por faltantes', monto: costoPerd, color: '#DC2626', signo: '-', barColor: '#EF4444' },
      { label: 'Valor de sobrantes',    monto: costoSobr, color: '#15803D', signo: '+', barColor: '#22C55E' },
      { label: 'Sin stock estimado',    monto: sobTotal,  color: '#92400E', signo: '+', barColor: '#F59E0B' },
    ].map(e => `
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:12px;color:#3F3F46;">${e.label}</span>
          <span style="font-size:14px;font-weight:800;color:${e.color};">${e.signo}${fCOP(e.monto)}</span>
        </div>
        ${bar(Math.round(e.monto / maxEcon * 100), e.barColor)}
      </div>`).join('')}

    <div style="background:#F4F4F5;border-radius:10px;padding:14px;margin-top:8px;">
      ${[
        { label: 'Valor total inventario (sistema)', val: fCOP(ventasEst), color: '#18181B' },
        { label: 'Tasa de faltantes',                val: `${faltPct}%`,   color: faltPct > 10 ? '#DC2626' : '#15803D' },
        { label: 'Tasa de cobertura',                val: `${pct}%`,       color: pct >= 90 ? '#15803D' : '#B45309' },
        { label: 'Exactitud del inventario',         val: `${sinDifPct}%`, color: sinDifPct >= 80 ? '#15803D' : '#DC2626' },
      ].map(row => `
        <div class="info-row">
          <span class="info-lbl">${row.label}</span>
          <span class="info-val" style="color:${row.color};">${row.val}</span>
        </div>`).join('')}
    </div>
  </div>

  <!-- OBSERVACIONES -->
  <div class="section">
    <div class="section-title">Hallazgos y observaciones del auditor</div>
    <p style="font-size:11px;color:#71717A;margin-bottom:14px;line-height:1.6;">
      Análisis basado en los Estándares Internacionales para la Práctica Profesional de la Auditoría Interna (IPPF — IIA) y las mejores prácticas del sector comercial.
    </p>
    ${obsHTML}
  </div>

  <!-- RECOMENDACIONES -->
  <div class="section">
    <div class="section-title">Recomendaciones del auditor</div>
    ${recHTML}
  </div>

  <!-- PIE DE PÁGINA -->
  <div class="footer">
    <strong>Orvion Tech · StockIQ v2.3.0</strong><br/>
    Reporte generado automáticamente el ${fecha}.<br/>
    Este documento constituye el soporte probatorio del proceso de auditoría de inventario físico y debe ser custodiado conforme a las políticas de gestión documental de la organización.<br/>
    Los hallazgos y recomendaciones expresados en este informe son de carácter técnico y están sustentados en los datos registrados en el sistema StockIQ durante la ejecución del inventario.
  </div>

</div>
</body>
</html>`;
  };

  // ── Compartir como PDF ─────────────────────────────────────────────────────
  const generarPDF = async () => {
    setGenerando(true);
    try {
      const html = generarHTML();
      const { Print, Sharing } = await loadPrintLibs();
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const disponible = await Sharing.isAvailableAsync();
      if (disponible) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Reporte — ${tienda.nombre}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF generado', `El archivo fue guardado en:\n${uri}`);
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF. Verifica los permisos de almacenamiento.');
    } finally {
      setGenerando(false);
    }
  };

  // ── PÁGINAS (UI) ───────────────────────────────────────────────────────────

  const renderResumen = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>

      {/* Semáforo de riesgo */}
      <View style={[s.riesgoBanner, { backgroundColor: bgR, borderColor: colorR + '40' }]}>
        <Ionicons name={iconR} size={28} color={colorR} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.riesgoNivel, { color: colorR }]}>RIESGO {nivelR}</Text>
          <Text style={[s.riesgoSub, { color: colorR + 'CC' }]}>
            {nivelR === 'BAJO'  ? 'Inventario en buenas condiciones. Diferencias menores.' :
             nivelR === 'MEDIO' ? 'Diferencias significativas detectadas. Requiere seguimiento.' :
                                  'Diferencias críticas. Requiere intervención inmediata.'}
          </Text>
        </View>
      </View>

      {/* KPIs */}
      <View style={s.kpiRow}>
        {[
          { label: 'Cobertura',     valor: `${pct}%`,         sub: `${contados}/${total} arts.`,    color: tienda.color },
          { label: 'Sin diferencia',valor: `${sinDifPct}%`,   sub: `${sinDif} artículos`,           color: '#15803D' },
          { label: 'Faltantes',     valor: `${faltPct}%`,     sub: `${falt} artículos`,             color: '#DC2626' },
          { label: 'Balance',       valor: fCOP(Math.abs(balance)), sub: balance >= 0 ? 'Superávit' : 'Déficit', color: balance >= 0 ? '#15803D' : '#DC2626' },
        ].map(k => (
          <View key={k.label} style={[s.kpiCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <Text style={[s.kpiValor, { color: k.color }]} numberOfLines={1} adjustsFontSizeToFit>{k.valor}</Text>
            <Text style={[s.kpiLabel, { color: tc.muted }]}>{k.label}</Text>
            <Text style={[s.kpiSub, { color: tc.muted }]}>{k.sub}</Text>
          </View>
        ))}
      </View>

      {/* Donut + barras */}
      <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
        <Text style={[s.cardTitle, { color: tc.text }]}>Avance del inventario</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Donut pct={pct} color={tienda.color} size={120} />
          <View style={{ flex: 1, gap: 12 }}>
            {[
              { label: 'Contados',       n: contados, max: total, color: tienda.color },
              { label: 'Sin diferencia', n: sinDif,   max: total, color: '#15803D' },
              { label: 'Con diferencia', n: falt + sobr + cero, max: total, color: '#DC2626' },
            ].map(b => (
              <View key={b.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[s.barLabel, { color: tc.muted }]}>{b.label}</Text>
                  <Text style={[s.barLabel, { color: b.color, fontWeight: '700' }]}>{b.n}</Text>
                </View>
                <BarH pct={Math.round(b.n / b.max * 100)} color={b.color} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Datos generales */}
      <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
        <Text style={[s.cardTitle, { color: tc.text }]}>Datos generales</Text>
        {[
          { icon: 'storefront-outline' as const, label: 'Tienda',               val: tienda.nombre },
          { icon: 'calendar-outline'  as const, label: 'Fecha de reporte',      val: fecha },
          { icon: 'cube-outline'      as const, label: 'Artículos en sistema',   val: `${total}` },
          { icon: 'scan-outline'      as const, label: 'Escaneos totales',       val: `${regT.length}` },
          { icon: 'warning-outline'   as const, label: 'Sobrantes sin stock',    val: `${sobrantes.length}` },
        ].map(row => (
          <View key={row.label} style={[s.infoRow, { borderBottomColor: tc.borderLight }]}>
            <View style={[s.infoIcon, { backgroundColor: tienda.color + '18' }]}>
              <Ionicons name={row.icon} size={15} color={tienda.color} />
            </View>
            <Text style={[s.infoLabel, { color: tc.muted }]}>{row.label}</Text>
            <Text style={[s.infoVal, { color: tc.text }]}>{row.val}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderClasificacion = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
      <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
        <Text style={[s.cardTitle, { color: tc.text }]}>Distribución de artículos</Text>
        {[
          { label: 'Sin diferencia', n: sinDif, pct: sinDifPct, color: '#6D28D9' },
          { label: 'Faltantes',      n: falt,   pct: faltPct,   color: '#DC2626' },
          { label: 'Sobrantes',      n: sobr,   pct: sobrPct,   color: '#15803D' },
          { label: 'Conteo cero',    n: cero,   pct: ceroPct,   color: '#B45309' },
          { label: 'Sin stock',      n: sobrantes.length, pct: Math.round(sobrantes.length/total*100), color: '#92400E' },
        ].map(it => (
          <View key={it.label} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: it.color }} />
                <Text style={[s.barLabel, { color: tc.muted }]}>{it.label}</Text>
              </View>
              <Text style={[s.barLabel, { color: it.color, fontWeight: '800' }]}>{it.n} ({it.pct}%)</Text>
            </View>
            <BarH pct={it.pct} color={it.color} h={13} />
          </View>
        ))}
      </View>

      {topFalt.length > 0 && (
        <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <Text style={[s.cardTitle, { color: tc.text }]}>Top faltantes críticos</Text>
          {topFalt.map((art, i) => {
            const dif = art.ct - art.stock;
            return (
              <View key={art.itemId} style={[s.topRow, { backgroundColor: tc.cardAlt }]}>
                <View style={[s.rankBadge, {
                  backgroundColor: i === 0 ? '#DC2626' : i === 1 ? '#F97316' : '#F59E0B',
                }]}>
                  <Text style={s.rankTxt}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.topCode, { color: tc.muted }]} numberOfLines={1}>{art.itemId}</Text>
                  <Text style={[s.topDesc, { color: tc.text }]} numberOfLines={1}>{art.descripcion}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.topDif, { color: '#DC2626' }]}>{dif} uds.</Text>
                  <Text style={[s.topImpacto, { color: tc.muted }]}>{fCOP(Math.abs(dif * art.costo))}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  const renderEconomico = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
      <View style={[s.balanceCard, {
        backgroundColor: balance >= 0
          ? (tc.isDark ? '#0D2818' : '#F0FDF4')
          : (tc.isDark ? '#2D0A0A' : '#FEF2F2'),
        borderColor: balance >= 0
          ? (tc.isDark ? '#166534' : '#BBF7D0')
          : (tc.isDark ? '#7F1D1D' : '#FECACA'),
      }]}>
        <Text style={[s.balanceLbl, { color: balance >= 0 ? '#15803D' : '#DC2626' }]}>BALANCE GENERAL</Text>
        <Text style={[s.balanceNum, { color: balance >= 0 ? '#15803D' : '#DC2626' }]}>
          {balance >= 0 ? '+' : ''}{fCOP(balance)}
        </Text>
        <Text style={[s.balanceSub, { color: balance >= 0 ? '#15803D' : '#DC2626' }]}>
          {balance >= 0 ? 'Superávit de inventario' : 'Déficit de inventario — requiere atención'}
        </Text>
      </View>

      <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
        <Text style={[s.cardTitle, { color: tc.text }]}>Impacto económico por categoría</Text>
        {[
          { label: 'Pérdida faltantes',  monto: costoPerd, color: '#DC2626', signo: '-' },
          { label: 'Valor sobrantes',    monto: costoSobr, color: '#15803D', signo: '+' },
          { label: 'Sin stock estimado', monto: sobTotal,  color: '#92400E', signo: '+' },
        ].map(e => (
          <View key={e.label} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={[s.barLabel, { color: e.color, fontWeight: '700' }]}>{e.label}</Text>
              <Text style={[s.barLabel, { color: e.color, fontWeight: '900', fontSize: 14 }]}>
                {e.signo}{fCOP(e.monto)}
              </Text>
            </View>
            <BarH pct={Math.round(e.monto / maxEcon * 100)} color={e.color} h={14} />
          </View>
        ))}
      </View>

      <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
        <Text style={[s.cardTitle, { color: tc.text }]}>Indicadores financieros</Text>
        {[
          { label: 'Valor total inventario (sistema)', val: fCOP(ventasEst),  color: tc.text },
          { label: 'Tasa de faltantes',                val: `${faltPct}%`,    color: faltPct > 10 ? '#DC2626' : '#15803D' },
          { label: 'Tasa de cobertura',                val: `${pct}%`,        color: pct >= 90 ? '#15803D' : '#B45309' },
          { label: 'Exactitud del inventario',         val: `${sinDifPct}%`,  color: sinDifPct >= 80 ? '#15803D' : '#DC2626' },
        ].map(row => (
          <View key={row.label} style={[s.infoRow, { borderBottomColor: tc.borderLight }]}>
            <Text style={[s.infoLabel, { flex: 1.5, color: tc.muted }]}>{row.label}</Text>
            <Text style={[s.infoVal, { color: row.color, fontWeight: '800' }]}>{row.val}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderConclusiones = () => {
    const colNivel: Record<NivelObs, string> = { 'CRÍTICO': '#DC2626', ALERTA: '#B45309', OK: '#15803D', INFO: '#0369A1' };
    const bgNivel:  Record<NivelObs, string> = tc.isDark
      ? { 'CRÍTICO': '#2D0A0A', ALERTA: '#292014', OK: '#0D2818', INFO: '#0C1E2E' }
      : { 'CRÍTICO': '#FEF2F2', ALERTA: '#FFFBEB', OK: '#F0FDF4', INFO: '#EFF6FF' };
    const txtNivel = tc.isDark ? tc.text : '#1C1C1E';
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <Text style={[s.cardTitle, { color: tc.text }]}>Hallazgos y observaciones</Text>
          <Text style={{ fontSize: 11, color: tc.muted, marginBottom: 14, lineHeight: 16 }}>
            Basado en los estándares IPPF — IIA y mejores prácticas para auditorías de inventario físico en el sector comercial.
          </Text>
          {observaciones.map((o, i) => (
            <View key={i} style={[s.obsRow, {
              backgroundColor: bgNivel[o.nivel],
              borderLeftColor: colNivel[o.nivel],
            }]}>
              <Ionicons name={obsIcon[o.nivel]} size={18} color={colNivel[o.nivel]}
                style={{ marginRight: 10, marginTop: 2, flexShrink: 0 }} />
              <View style={{ flex: 1 }}>
                <Text style={[s.obsNivel, { color: colNivel[o.nivel] }]}>{o.nivel}</Text>
                <Text style={[s.obsTxt, { color: txtNivel }]}>{o.texto}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <Text style={[s.cardTitle, { color: tc.text }]}>Recomendaciones del auditor</Text>
          {recomendaciones.map((r, i) => (
            <View key={i} style={s.recRow}>
              <View style={[s.recNum, { backgroundColor: tienda.color }]}>
                <Text style={s.recNumTxt}>{i + 1}</Text>
              </View>
              <Text style={[s.recTxt, { color: tc.text }]}>{r}</Text>
            </View>
          ))}
        </View>

        <View style={[s.card, { backgroundColor: tc.isDark ? '#1A1033' : '#F8F7FF', borderColor: PRP + '30' }]}>
          <Text style={[s.cardTitle, { color: tc.isDark ? '#E9D5FF' : PRP }]}>Certificación del auditor</Text>
          <Text style={{ fontSize: 12, color: tc.muted, lineHeight: 19 }}>
            Este informe ha sido preparado siguiendo los estándares internacionales de auditoría interna (IPPF) y las mejores prácticas para auditorías de inventario físico en el sector comercial.{'\n\n'}
            El sistema StockIQ certifica que los procedimientos de conteo fueron aplicados de acuerdo con los controles registrados y que los resultados reflejan fielmente la situación del inventario de <Text style={{ fontWeight: '700', color: tc.text }}>Orvion Tech</Text> a la fecha indicada.
          </Text>
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: tc.border }}>
            <Text style={{ fontSize: 11, color: tc.muted }}>Sistema: StockIQ v2.3.0 · Orvion Tech</Text>
            <Text style={{ fontSize: 11, color: tc.muted, marginTop: 2 }}>Generado el: {fecha}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTab = () => {
    switch (tab) {
      case 0: return renderResumen();
      case 1: return renderClasificacion();
      case 2: return renderEconomico();
      case 3: return renderConclusiones();
      default: return null;
    }
  };

  // ── RENDER PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: tc.bg }}>

      {/* Header — usa color de la tienda, intacto */}
      <View style={[s.header, { backgroundColor: tienda.color }]}>
        <TouchableOpacity onPress={onBack} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerSup}>REPORTE DE AUDITORÍA · ORVION TECH</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{tienda.nombre}</Text>
        </View>
        <TouchableOpacity
          onPress={generarPDF}
          style={[s.headerBtn, generando && { opacity: 0.6 }]}
          disabled={generando}
        >
          {generando
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="document-text-outline" size={20} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[s.tabBar, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}
        contentContainerStyle={{ paddingHorizontal: 8 }}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[s.tab, tab === i && { borderBottomColor: tienda.color, borderBottomWidth: 3 }]}
            onPress={() => setTab(i)}>
            <Text style={[s.tabTxt, { color: tc.muted }, tab === i && { color: tienda.color, fontWeight: '700' }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {renderTab()}
    </View>
  );
};

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:      { paddingTop: 54, paddingBottom: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  headerBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerSup:   { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.2 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },

  tabBar:    { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  tab:       { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabTxt:    { fontSize: 13, fontWeight: '500', color: '#A1A1AA' },

  pageContent: { padding: 14, paddingBottom: 48 },

  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle:   { fontSize: 13, fontWeight: '800', color: BLK, marginBottom: 14 },

  riesgoBanner:{ flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  riesgoNivel: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  riesgoSub:   { fontSize: 12, marginTop: 3, lineHeight: 17 },

  kpiRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BRD, alignItems: 'center' },
  kpiValor:{ fontSize: 20, fontWeight: '900', marginBottom: 4 },
  kpiLabel:{ fontSize: 10, fontWeight: '700', color: MTD, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiSub:  { fontSize: 10, color: '#A1A1AA', marginTop: 2 },

  barLabel:  { fontSize: 12, color: MTD },

  infoRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: LGR },
  infoIcon:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  infoLabel: { flex: 1, fontSize: 12, color: MTD },
  infoVal:   { fontSize: 12, fontWeight: '700', color: BLK },

  topRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, backgroundColor: LGR, borderRadius: 12, padding: 10 },
  rankBadge:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankTxt:    { fontSize: 11, fontWeight: '900', color: '#fff' },
  topCode:    { fontSize: 11, fontWeight: '800', color: MTD },
  topDesc:    { fontSize: 12, fontWeight: '700', color: BLK },
  topDif:     { fontSize: 13, fontWeight: '900' },
  topImpacto: { fontSize: 10, color: MTD },

  balanceCard: { borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1.5, alignItems: 'center' },
  balanceLbl:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  balanceNum:  { fontSize: 30, fontWeight: '900', marginBottom: 6 },
  balanceSub:  { fontSize: 12, fontWeight: '600' },

  obsRow:    { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 4 },
  obsNivel:  { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  obsTxt:    { fontSize: 12, lineHeight: 18, color: BLK },

  recRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  recNum:    { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  recNumTxt: { fontSize: 11, fontWeight: '900', color: '#fff' },
  recTxt:    { flex: 1, fontSize: 12, color: BLK, lineHeight: 18 },
});
