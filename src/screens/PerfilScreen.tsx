import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Usuario, Registro, Tienda } from '../constants/data';
import { Avatar, RolBadge, SecHeader } from '../components/common';
import { PRP, IND, BLK, LGR, BRD, MTD } from '../constants/colors';
import { useThemeColors } from '../hooks/useThemeColors';

interface Props {
  usuario:           Usuario;
  registros:         Registro[];
  tiendas:           Tienda[];
  onCambiarPass:     (nueva: string) => void;
  onActualizarFoto?: (uri: string) => void;
  onEliminarFoto?:   () => void;
  onLogout:          () => void;
  onBack:            () => void;
}

export const PerfilScreen: React.FC<Props> = ({
  usuario, registros, tiendas, onCambiarPass, onActualizarFoto, onEliminarFoto, onLogout, onBack,
}) => {
  const tc = useThemeColors();
  const [passActual,    setPassActual]    = useState('');
  const [passNueva,     setPassNueva]     = useState('');
  const [passConfirmar, setPassConfirmar] = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [error,         setError]         = useState('');
  const [exito,         setExito]         = useState(false);

  const misTiendas = tiendas.filter(t => usuario.tiendas.includes(t.id));

  const abrirGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onActualizarFoto?.(result.assets[0].uri);
    }
  };

  const elegirFoto = () => {
    if (usuario.fotoUri) {
      Alert.alert('Foto de perfil', '¿Qué deseas hacer?', [
        { text: 'Cambiar foto', onPress: abrirGaleria },
        {
          text: 'Eliminar foto',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Eliminar foto', '¿Seguro que deseas eliminar tu foto de perfil?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive', onPress: () => onEliminarFoto?.() },
            ]),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } else {
      abrirGaleria();
    }
  };
  // Gradiente de header según rol
  const headerGradient: [string, string, string] =
    usuario.rol === 'SUPERADMIN' ? ['#10071E', '#080510', '#030305'] :
    usuario.rol === 'ADMIN'      ? ['#040D1C', '#050A14', '#030305'] :
                                   ['#041210', '#030D0A', '#030305'];
  const headerGradientLight: [string, string, string] =
    usuario.rol === 'SUPERADMIN' ? ['#EDE9FE', '#F4F0FF', '#F8F6FF'] :
    usuario.rol === 'ADMIN'      ? ['#DBEAFE', '#EFF6FF', '#F8FAFF'] :
                                   ['#D1FAE5', '#ECFDF5', '#F4FFF9'];
  const gradColors = tc.isDark ? headerGradient : headerGradientLight;

  // Anillo pulsante alrededor del avatar
  const ringScale   = useRef(new Animated.Value(1.0)).current;
  const ringOpacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1.18, duration: 1600, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.0,  duration: 1600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1.0,  duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardarPass = () => {
    setError('');
    if (!passActual)                { setError('Ingresa tu contraseña actual.'); return; }
    if (passActual !== usuario.pass){ setError('La contraseña actual es incorrecta.'); return; }
    if (!passNueva)                 { setError('Ingresa la nueva contraseña.'); return; }
    if (passNueva.length < 8)       { setError('Mínimo 8 caracteres para la nueva contraseña.'); return; }
    if (passNueva !== passConfirmar) { setError('Las contraseñas nuevas no coinciden.'); return; }
    if (passNueva === passActual)    { setError('La nueva contraseña debe ser diferente a la actual.'); return; }

    onCambiarPass(passNueva);
    setPassActual(''); setPassNueva(''); setPassConfirmar('');
    setExito(true);
    setTimeout(() => setExito(false), 3500);
  };

  const confirmarLogout = () =>
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: onLogout },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: tc.bg }}>

      {/* ── Header con gradiente y avatar con anillo SVG vectorial ── */}
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <TouchableOpacity style={[s.backBtn, {
          backgroundColor: tc.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
        }]} onPress={onBack}>
          <Ionicons
            name="arrow-back" size={20}
            color={tc.isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.70)'}
          />
        </TouchableOpacity>

        <View style={s.heroWrap}>
          <View style={s.avatarWrap}>
            {/* Anillo pulsante con SVG — vectorial, sin pixelado */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { alignItems: 'center', justifyContent: 'center',
                  opacity: ringOpacity, transform: [{ scale: ringScale }] },
              ]}
            >
              <Svg width={88} height={88}>
                <Circle
                  cx={44} cy={44} r={41}
                  stroke={PRP}
                  strokeWidth={2.5}
                  fill="none"
                />
              </Svg>
            </Animated.View>

            <TouchableOpacity onPress={elegirFoto} activeOpacity={0.85}>
              {usuario.fotoUri && usuario.fotoUri.length > 0 ? (
                <Image source={{ uri: usuario.fotoUri }} style={s.avatarImg} />
              ) : (
                <Avatar
                  nombre={usuario.nombre}
                  size={72}
                  bg={tc.isDark ? 'rgba(255,255,255,0.18)' : PRP}
                />
              )}
              <View style={s.cameraOverlay}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={[s.heroNombre, { color: tc.isDark ? '#fff' : tc.text }]}>
            {usuario.nombre}
          </Text>
          <View style={{ marginTop: 6, alignItems: 'center' }}>
            <RolBadge rol={usuario.rol} />
          </View>
        </View>

        <TouchableOpacity style={[s.logoutIconBtn, {
          backgroundColor: tc.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
        }]} onPress={confirmarLogout}>
          <Ionicons
            name="log-out-outline" size={20}
            color={tc.isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.50)'}
          />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Mi información ── */}
          <SecHeader title="Mi información" />
          <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <View style={s.infoRow}>
              <View style={[s.infoIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="card-outline" size={16} color={PRP} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.infoLbl, { color: tc.muted }]}>Número de cédula</Text>
                <Text style={[s.infoVal, { color: tc.text }]}>{usuario.cedula}</Text>
              </View>
            </View>

            <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
              <View style={[s.infoIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="storefront-outline" size={16} color="#92400E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.infoLbl, { color: tc.muted }]}>Tiendas asignadas</Text>
                <View style={s.tiendasWrap}>
                  {misTiendas.map(t => {
                    const rolEnT = usuario.tiendasRoles?.[t.id];
                    return (
                      <View key={t.id} style={[s.tiendaChip, { backgroundColor: t.color + '14', borderColor: t.color + '45' }]}>
                        <View style={[s.tiendaDot, { backgroundColor: t.color }]} />
                        <Text style={[s.tiendaChipTxt, { color: t.color }]}>
                          {t.nombre.replace('Tienda ', '').replace('Inventario ', '')}
                        </Text>
                        {rolEnT && (
                          <Text style={[s.tiendaChipRol, { color: t.color }]}>
                            · {rolEnT === 'ADMIN' ? 'Admin' : 'Cont.'}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* ── Cambiar contraseña ── */}
          <SecHeader title="Cambiar contraseña" />
          <View style={[s.card, { backgroundColor: tc.card, borderColor: tc.border }]}>

            {exito && (
              <View style={s.exitoBanner}>
                <Ionicons name="shield-checkmark" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.exitoTxt}>¡Contraseña actualizada correctamente!</Text>
              </View>
            )}

            {/* Contraseña actual */}
            <Text style={s.fieldLabel}>Contraseña actual</Text>
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder }]}>
              <Ionicons name="lock-closed-outline" size={16} color={tc.icon} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: tc.text, backgroundColor: tc.inputBg }]}
                placeholder="Tu contraseña actual"
                placeholderTextColor={tc.placeholder}
                value={passActual}
                onChangeText={t => { setPassActual(t); setError(''); }}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={MTD} />
              </TouchableOpacity>
            </View>

            {/* Nueva contraseña */}
            <Text style={s.fieldLabel}>Nueva contraseña</Text>
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder }]}>
              <Ionicons name="key-outline" size={16} color={tc.icon} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: tc.text, backgroundColor: tc.inputBg }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={tc.placeholder}
                value={passNueva}
                onChangeText={t => { setPassNueva(t); setError(''); }}
                secureTextEntry={!showPass}
              />
            </View>

            {/* Confirmar */}
            <Text style={s.fieldLabel}>Confirmar nueva contraseña</Text>
            <View style={[s.inputWrap, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder, marginBottom: 0 }]}>
              <Ionicons name="key-outline" size={16} color={tc.icon} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: tc.text, backgroundColor: tc.inputBg }]}
                placeholder="Repite la nueva contraseña"
                placeholderTextColor={tc.placeholder}
                value={passConfirmar}
                onChangeText={t => { setPassConfirmar(t); setError(''); }}
                secureTextEntry={!showPass}
              />
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={s.saveBtn} onPress={guardarPass} activeOpacity={0.88}>
              <LinearGradient
                colors={[PRP, IND]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="shield-checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.saveTxt}>Actualizar contraseña</Text>
            </TouchableOpacity>
          </View>

          {/* ── Cerrar sesión ── */}
          <TouchableOpacity style={[s.logoutCard, { backgroundColor: tc.danger, borderColor: tc.isDark ? '#7F1D1D' : '#FECACA' }]} onPress={confirmarLogout} activeOpacity={0.85}>
            <View style={s.logoutCardIcon}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            </View>
            <Text style={s.logoutCardTxt}>Cerrar sesión</Text>
            <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  header:         { paddingTop: 54, paddingBottom: 28, paddingHorizontal: 20 },
  backBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  logoutIconBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 54, right: 20 },
  heroWrap:      { alignItems: 'center', marginTop: -4, marginBottom: 4 },
  heroNombre:    { fontSize: 20, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  avatarWrap:    { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  avatarImg:     { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },

  card:           { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BRD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },

  infoRow:        { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: LGR, gap: 12 },
  infoIconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLbl:        { fontSize: 11, color: MTD, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  infoVal:        { fontSize: 14, fontWeight: '700', color: BLK },

  tiendasWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tiendaChip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, gap: 5 },
  tiendaDot:      { width: 6, height: 6, borderRadius: 3 },
  tiendaChipTxt:  { fontSize: 11, fontWeight: '700' },
  tiendaChipRol:  { fontSize: 10, fontWeight: '600', flexShrink: 0 },

  exitoBanner:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15803D', borderRadius: 10, padding: 12, marginBottom: 14 },
  exitoTxt:       { color: '#fff', fontWeight: '700', fontSize: 13 },

  fieldLabel:     { fontSize: 11, fontWeight: '700', color: '#52525B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 14 },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BRD, borderRadius: 13, backgroundColor: LGR, marginBottom: 2 },
  inputIcon:      { marginLeft: 14 },
  input:          { flex: 1, height: 50, paddingHorizontal: 12, fontSize: 15, color: BLK },
  eyeBtn:         { paddingHorizontal: 14, height: 50, alignItems: 'center', justifyContent: 'center' },

  errorBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginTop: 10, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  errorTxt:       { fontSize: 12, color: '#DC2626', fontWeight: '600', flex: 1 },

  saveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRP, borderRadius: 14, height: 52, marginTop: 16, overflow: 'hidden' },
  saveTxt:        { color: '#fff', fontWeight: '800', fontSize: 15 },

  logoutCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECACA', marginTop: 4 },
  logoutCardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  logoutCardTxt:  { flex: 1, fontSize: 15, fontWeight: '700', color: '#DC2626' },
});
