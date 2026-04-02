import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { Tienda, Articulo } from '../constants/data';
import { PRP, BLK, LGR, BRD, MTD } from '../constants/colors';
import { useThemeColors } from '../hooks/useThemeColors';

interface Props {
  tienda:          Tienda;
  catalogoActual?: Articulo[];
  onImportar:      (data: Articulo[]) => void;
  onBack:          () => void;
}

export const ImportarScreen: React.FC<Props> = ({ tienda, catalogoActual = [], onImportar, onBack }) => {
  const tc = useThemeColors();
  const [loading,  setLoading]  = useState(false);
  const [preview,  setPreview]  = useState<Articulo[]>([]);
  const [fileName, setFileName] = useState('');
  const [error,    setError]    = useState('');

  const seleccionar = async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setLoading(true);
      setFileName(result.assets[0].name);
      const response    = await fetch(result.assets[0].uri);
      const arrayBuffer = await response.arrayBuffer();
      const workbook    = XLSX.read(arrayBuffer, { type: 'array', cellText: true });
      const sheet       = workbook.Sheets[workbook.SheetNames[0]];
      const rows        = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
      const parsed: Articulo[] = rows
        .filter(r => r[0] && String(r[0]).trim())
        .map(r => ({
          itemId:      String(r[0]).trim(),
          descripcion: String(r[1] || '').trim(),
          ubicacion:   String(r[2] || '').trim(),
          stock:       parseInt(String(r[6] || '0').replace(/[^0-9]/g, ''), 10) || 0,
          costo:       parseFloat(String(r[7] || '0').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0,
        }))
        .filter(r => r.itemId);

      if (!parsed.length) {
        setError('No se encontraron artículos. Verifica el formato del archivo.');
        setLoading(false);
        return;
      }
      setPreview(parsed);
      setLoading(false);
    } catch {
      setError('Error al leer el archivo. Verifica que sea un .xlsx válido.');
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tc.bg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <TouchableOpacity onPress={onBack} style={[s.backBtn, { backgroundColor: tc.btnBg }]}>
          <Ionicons name="arrow-back" size={20} color={tc.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: tc.text }]}>Cargar inventario</Text>
          <Text style={[s.sub, { color: tc.muted }]}>{tienda.nombre}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Advertencia catálogo existente */}
        {catalogoActual.length > 0 && (
          <View style={s.warnBox}>
            <Ionicons name="warning" size={16} color="#92400E" style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={s.warnTxt}>
              Esta tienda ya tiene{' '}
              <Text style={{ fontWeight: '800' }}>{catalogoActual.length} artículos</Text>{' '}
              cargados. Al confirmar, el inventario será reemplazado completamente.
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={[s.infoBox, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <View style={[s.infoIcon, { backgroundColor: tienda.color }]}>
            <Ionicons name="information" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.infoTitle, { color: tc.text }]}>Formato esperado del Excel</Text>
            <Text style={[s.infoTxt, { color: tc.muted }]}>
              Sin encabezados · Col A: Item ID · B: Descripción · C: Ubicación · G: Stock · H: Costo Unitario
            </Text>
          </View>
        </View>

        {/* Zona de carga */}
        <TouchableOpacity style={[s.uploadZone, { backgroundColor: tc.card, borderColor: tc.border }]} onPress={seleccionar} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <>
              <ActivityIndicator color={PRP} size="large" />
              <Text style={s.uploadTxt}>Procesando archivo...</Text>
            </>
          ) : fileName ? (
            <>
              <View style={[s.uploadIconWrap, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Ionicons name="document-text" size={28} color="#15803D" />
              </View>
              <Text style={[s.uploadTxt, { color: '#15803D' }]}>{fileName}</Text>
              <Text style={[s.uploadSub, { color: tc.muted }]}>Toca para cambiar el archivo</Text>
            </>
          ) : (
            <>
              <View style={[s.uploadIconWrap, { backgroundColor: tc.cardAlt, borderColor: tc.border }]}>
                <Ionicons name="cloud-upload-outline" size={28} color={tc.icon} />
              </View>
              <Text style={[s.uploadTxt, { color: tc.muted }]}>Toca para seleccionar el archivo</Text>
              <Text style={[s.uploadSub, { color: tc.muted }]}>.xlsx · Excel moderno</Text>
            </>
          )}
        </TouchableOpacity>

        {error ? (
          <View style={s.errBox}>
            <Ionicons name="warning" size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={s.errTxt}>{error}</Text>
          </View>
        ) : null}

        {/* Vista previa */}
        {preview.length > 0 && (
          <>
            <View style={s.prevHeader}>
              <Text style={[s.prevTitle, { color: tc.text }]}>{preview.length} artículos detectados</Text>
              <Text style={[s.prevSub, { color: tc.muted }]}>Vista previa de las primeras 5 filas</Text>
            </View>

            {preview.slice(0, 5).map((it, i) => (
              <View key={i} style={[s.prevRow, { backgroundColor: tc.card, borderColor: tc.border }]}>
                <View style={[s.prevCode, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={[s.prevCodeTxt, { color: PRP }]}>{it.itemId}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.prevDesc, { color: tc.text }]} numberOfLines={1}>{it.descripcion}</Text>
                  <Text style={[s.prevMeta, { color: tc.muted }]}>{it.ubicacion} · Stock: {it.stock} · ${it.costo.toLocaleString('es-CO')}</Text>
                </View>
              </View>
            ))}

            {preview.length > 5 && (
              <Text style={{ textAlign: 'center', color: '#A1A1AA', fontSize: 12, marginVertical: 8 }}>
                ... y {preview.length - 5} artículos más
              </Text>
            )}

            <TouchableOpacity
              style={[s.confirmBtn, { backgroundColor: tienda.color }]}
              onPress={() => onImportar(preview)}
              activeOpacity={0.88}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.confirmTxt}>Confirmar {preview.length} artículos</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 54, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BRD },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: LGR, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title:        { fontSize: 18, fontWeight: '800', color: BLK },
  sub:          { fontSize: 12, color: MTD, marginTop: 2 },

  infoBox:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: BRD, gap: 12 },
  infoIcon:     { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoTitle:    { fontSize: 13, fontWeight: '700', color: BLK, marginBottom: 3 },
  infoTxt:      { fontSize: 12, color: MTD, lineHeight: 18 },

  uploadZone:   { backgroundColor: '#fff', borderRadius: 18, borderWidth: 2, borderColor: BRD, borderStyle: 'dashed', alignItems: 'center', padding: 36, marginBottom: 16, gap: 10 },
  uploadIconWrap: { width: 60, height: 60, borderRadius: 16, backgroundColor: LGR, borderWidth: 1, borderColor: BRD, alignItems: 'center', justifyContent: 'center' },
  uploadTxt:    { fontSize: 15, fontWeight: '600', color: MTD, textAlign: 'center' },
  uploadSub:    { fontSize: 12, color: '#A1A1AA' },

  warnBox:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 13, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  warnTxt:      { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },

  errBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  errTxt:       { fontSize: 13, color: '#DC2626', fontWeight: '500', flex: 1 },

  prevHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  prevTitle:    { fontSize: 15, fontWeight: '700', color: BLK },
  prevSub:      { fontSize: 12, color: '#A1A1AA' },

  prevRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BRD },
  prevCode:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  prevCodeTxt:  { fontSize: 11, fontWeight: '800' },
  prevDesc:     { fontSize: 13, fontWeight: '600', color: BLK, marginBottom: 2 },
  prevMeta:     { fontSize: 11, color: '#A1A1AA' },

  confirmBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 15, height: 54, marginTop: 8 },
  confirmTxt:   { color: '#fff', fontWeight: '800', fontSize: 15 },
});
