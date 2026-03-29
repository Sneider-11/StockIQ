import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Usuario, Registro, Tienda } from '../constants/data';
import { Avatar, RolBadge, SecHeader } from '../components/common';
import { PRP, BLK, LGR, BRD, MTD, GRN } from '../constants/colors';

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
  const headerColor  =
    usuario.rol === 'SUPERADMIN' ? BLK :
    usuario.rol === 'ADMIN'      ? '#0369A1' :
    '#047857';

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
    <View style={{ flex: 1, backgroundColor: LGR }}>

      {/* ── Header con avatar ── */}
      <View style={[s.header, { backgroundColor: headerColor }]}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        <View style={s.heroWrap}>
          <TouchableOpacity onPress={elegirFoto} style={s.avatarWrap} activeOpacity={0.85}>
            {usuario.fotoUri ? (
              <Image source={{ uri: usuario.fotoUri }} style={s.avatarImg} />
            ) : (
              <Avatar nombre={usuario.nombre} size={72} bg="rgba(255,255,255,0.18)" />
            )}
            <View style={s.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={s.heroNombre}>{usuario.nombre}</Text>
          <View style={{ marginTop: 6, alignItems: 'center' }}>
            <RolBadge rol={usuario.rol} />
          </View>
        </View>

        <TouchableOpacity style={s.logoutIconBtn} onPress={confirmarLogout}>
          <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.65)" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Mi información ── */}
          <SecHeader title="Mi información" />
          <View style={s.card}>
            <View style={s.infoRow}>
              <View style={[s.infoIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="card-outline" size={16} color={PRP} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLbl}>Número de cédula</Text>
                <Text style={s.infoVal}>{usuario.cedula}</Text>
              </View>
            </View>

            <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
              <View style={[s.infoIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="storefront-outline" size={16} color="#92400E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLbl}>Tiendas asignadas</Text>
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
          <View style={s.card}>

            {exito && (
              <View style={s.exitoBanner}>
                <Ionicons name="shield-checkmark" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.exitoTxt}>¡Contraseña actualizada correctamente!</Text>
              </View>
            )}

            {/* Contraseña actual */}
            <Text style={s.fieldLabel}>Contraseña actual</Text>
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={MTD} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Tu contraseña actual"
                placeholderTextColor="#A1A1AA"
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
            <View style={s.inputWrap}>
              <Ionicons name="key-outline" size={16} color={MTD} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#A1A1AA"
                value={passNueva}
                onChangeText={t => { setPassNueva(t); setError(''); }}
                secureTextEntry={!showPass}
              />
            </View>

            {/* Confirmar */}
            <Text style={s.fieldLabel}>Confirmar nueva contraseña</Text>
            <View style={[s.inputWrap, { marginBottom: 0 }]}>
              <Ionicons name="key-outline" size={16} color={MTD} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Repite la nueva contraseña"
                placeholderTextColor="#A1A1AA"
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
              <Ionicons name="shield-checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.saveTxt}>Actualizar contraseña</Text>
            </TouchableOpacity>
          </View>

          {/* ── Cerrar sesión ── */}
          <TouchableOpacity style={s.logoutCard} onPress={confirmarLogout} activeOpacity={0.85}>
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
  heroWrap:       { alignItems: 'center', marginTop: -4, marginBottom: 4 },
  heroNombre:     { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 12, textAlign: 'center' },
  avatarWrap:     { width: 72, height: 72, borderRadius: 36, position: 'relative' },
  avatarImg:      { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  cameraOverlay:  { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },

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

  saveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRP, borderRadius: 14, height: 52, marginTop: 16 },
  saveTxt:        { color: '#fff', fontWeight: '800', fontSize: 15 },

  logoutCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECACA', marginTop: 4 },
  logoutCardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  logoutCardTxt:  { flex: 1, fontSize: 15, fontWeight: '700', color: '#DC2626' },
});
