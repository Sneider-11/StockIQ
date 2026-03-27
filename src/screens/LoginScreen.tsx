import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Usuario } from '../constants/data';
import { Avatar } from '../components/common';

const PRP  = '#7C3AED';
const BLK  = '#09090B';
const DRK  = '#18181B';
const MTD  = '#71717A';
const LGR  = '#F4F4F5';
const BRD  = '#E4E4E7';

interface Props {
  usuarios: Usuario[];
  onLogin: (u: Usuario) => void;
}

export const LoginScreen: React.FC<Props> = ({ usuarios, onLogin }) => {
  const [cedula, setCedula]   = useState('');
  const [pass, setPass]       = useState('');
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const shake = useRef(new Animated.Value(0)).current;

  const doShake = () => Animated.sequence([
    Animated.timing(shake, { toValue: 10, duration: 55, useNativeDriver: true }),
    Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
    Animated.timing(shake, { toValue: 5,  duration: 55, useNativeDriver: true }),
    Animated.timing(shake, { toValue: 0,  duration: 55, useNativeDriver: true }),
  ]).start();

  const login = () => {
    setError('');
    if (!cedula.trim()) { setError('Ingresa tu número de cédula.'); doShake(); return; }
    if (!pass)          { setError('Ingresa tu contraseña.');        doShake(); return; }
    const u = usuarios.find(u => u.cedula === cedula.trim());
    if (!u)          { setError('Cédula no registrada. Contacta al administrador.'); doShake(); return; }
    if (u.pass !== pass) { setError('Contraseña incorrecta.'); doShake(); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(u); }, 800);
  };

  const loginRapido = (u: Usuario) => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(u); }, 500);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Fondo oscuro con destellos de color */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: BLK }]} />
      <View style={s.glow1} />
      <View style={s.glow2} />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoSection}>
          <View style={s.logoCard}>
            <Text style={s.logoLetter}>S</Text>
          </View>
          <Text style={s.brand}>StockIQ</Text>
          <Text style={s.brandSub}>Sistema de Auditoría de Inventarios</Text>
        </View>

        {/* Tarjeta de login */}
        <Animated.View style={[s.card, { transform: [{ translateX: shake }] }]}>
          <Text style={s.cardTitle}>Iniciar sesión</Text>
          <Text style={s.cardSub}>Ingresa con tu cédula y contraseña</Text>

          <View style={s.fieldWrap}>
            <View style={s.inputRow}>
              <View style={s.inputIcon}>
                <Ionicons name="person-outline" size={17} color={MTD} />
              </View>
              <TextInput
                style={s.input}
                placeholder="Número de cédula"
                placeholderTextColor="#A1A1AA"
                value={cedula}
                onChangeText={t => { setCedula(t); setError(''); }}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <View style={s.inputRow}>
              <View style={s.inputIcon}>
                <Ionicons name="lock-closed-outline" size={17} color={MTD} />
              </View>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Contraseña"
                placeholderTextColor="#A1A1AA"
                secureTextEntry={!show}
                value={pass}
                onChangeText={t => { setPass(t); setError(''); }}
                returnKeyType="done"
                onSubmitEditing={login}
              />
              <TouchableOpacity onPress={() => setShow(!show)} style={s.eyeBtn}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={MTD} />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={s.errBox}>
              <Ionicons name="alert-circle" size={15} color="#DC2626" />
              <Text style={s.errTxt}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.loginBtn, loading && { opacity: 0.75 }]}
            onPress={login}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Text style={s.loginBtnTxt}>Ingresar</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </>
            }
          </TouchableOpacity>
        </Animated.View>

        {/* Acceso rápido */}
        <View style={s.demo}>
          <View style={s.demoHeader}>
            <View style={s.demoLine} />
            <Text style={s.demoLbl}>Acceso rápido · Demo</Text>
            <View style={s.demoLine} />
          </View>
          {usuarios.map(u => (
            <TouchableOpacity key={u.id} style={s.demoItem} onPress={() => loginRapido(u)} activeOpacity={0.7}>
              <Avatar nombre={u.nombre} size={40} bg={u.rol === 'SUPERADMIN' ? PRP : DRK} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.demoName}>{u.nombre}</Text>
                <Text style={s.demoCed}>CC {u.cedula}</Text>
              </View>
              <View style={[s.rolPill, { backgroundColor: u.rol === 'SUPERADMIN' ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.08)' }]}>
                <Text style={[s.rolTxt, { color: u.rol === 'SUPERADMIN' ? '#A78BFA' : '#A1A1AA' }]}>
                  {u.rol === 'SUPERADMIN' ? 'Super Admin' : 'Auditor'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.ver}>v2.1.0 · StockIQ · Grupo Comercial</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  glow1:       { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(124,58,237,0.13)', top: -140, right: -100 },
  glow2:       { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(91,33,182,0.09)', bottom: 60, left: -80 },
  scroll:      { flexGrow: 1, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 },

  logoSection: { alignItems: 'center', marginBottom: 36 },
  logoCard:    { width: 76, height: 76, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: PRP, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 10 },
  logoLetter:  { fontSize: 40, fontWeight: '900', color: PRP },
  brand:       { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 4, marginBottom: 6 },
  brandSub:    { fontSize: 12, color: 'rgba(255,255,255,0.38)', textAlign: 'center' },

  card:        { backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 14 },
  cardTitle:   { fontSize: 22, fontWeight: '800', color: BLK, marginBottom: 4 },
  cardSub:     { fontSize: 13, color: MTD, marginBottom: 24 },

  fieldWrap:   { marginBottom: 12 },
  inputRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: LGR, borderRadius: 13, borderWidth: 1.5, borderColor: BRD, overflow: 'hidden' },
  inputIcon:   { width: 46, alignItems: 'center', justifyContent: 'center', height: 50, borderRightWidth: 1, borderRightColor: BRD },
  input:       { flex: 1, height: 50, paddingHorizontal: 14, fontSize: 15, color: BLK },
  eyeBtn:      { paddingHorizontal: 14, height: 50, alignItems: 'center', justifyContent: 'center' },

  errBox:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  errTxt:      { fontSize: 13, color: '#DC2626', fontWeight: '600', flex: 1 },

  loginBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRP, borderRadius: 14, height: 52, marginTop: 4 },
  loginBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  demo:        { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  demoHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  demoLine:    { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  demoLbl:     { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  demoItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  demoName:    { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  demoCed:     { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  rolPill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rolTxt:      { fontSize: 11, fontWeight: '600' },

  ver:         { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 4 },
});
