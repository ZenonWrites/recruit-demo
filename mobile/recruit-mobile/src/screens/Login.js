import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { api, setToken } from '../api';
import { Btn, C, Card, Chips, Field, Screen } from '../ui';

export default function Login({ onLogin }) {
  const [role, setRole] = useState('candidate');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (body) => {
    setBusy(true);
    try {
      const r = await api('/auth/login', 'POST', body);
      await setToken(r.token);
      onLogin(r.profile);
    } catch (e) {
      Alert.alert('Login failed', e.message);
    }
    setBusy(false);
  };

  return (
    <Screen title="Manpower Hire" subtitle="Digital recruitment for Saudi manpower companies">
      <ScrollView keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={{ fontWeight: '800', fontSize: 16, color: C.dark, marginBottom: 8 }}>Sign in with mobile number</Text>
          <Text style={{ color: C.muted, marginBottom: 4 }}>I am a</Text>
          <Chips options={['candidate', 'company']} value={role} onChange={setRole} />
          <Field label={role === 'company' ? 'Company name (new accounts)' : 'Full name (new accounts)'} value={name} onChangeText={setName} />
          <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05XXXXXXXX" />
          {sent && <Field label="OTP (demo code: 123456)" value={otp} onChangeText={setOtp} keyboardType="number-pad" />}
          {!sent ? (
            <Btn title="Send OTP" onPress={() => (phone.trim().length >= 8 ? setSent(true) : Alert.alert('Enter a valid mobile number'))} />
          ) : (
            <Btn title="Verify & continue" disabled={busy} onPress={() => submit({ phone, otp, role, name })} />
          )}
        </Card>
        <Card>
          <Text style={{ fontWeight: '800', color: C.dark }}>Quick demo login</Text>
          <View style={{ flexDirection: 'row' }}>
            <Btn kind="ghost" title="As Company (HR)" onPress={() => submit({ phone: '0500000001', otp: '123456' })} />
            <Btn kind="ghost" title="As Candidate" onPress={() => submit({ phone: '0500000003', otp: '123456' })} />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
