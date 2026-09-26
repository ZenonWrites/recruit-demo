import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { Badge, Btn, C, Card, Field, Match, Screen, Steps, T, TabBar, fmt } from '../ui';

export default function Candidate({ profile, onProfile, onLogout }) {
  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(profile);
  const set = (k) => (v) => setForm({ ...form, [k]: v });

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setJobs(await api('/jobs'));
      setApps(await api('/applications'));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const apply = async (id) => {
    try {
      const a = await api(`/jobs/${id}/apply`, 'POST');
      if (a.status === 'rejected') Alert.alert('Not eligible', 'Auto-screening: you do not meet the minimum experience for this role.');
      else Alert.alert('Applied', 'Application submitted. Track it in the Applications tab.');
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const respond = async (id, accept) => {
    try { await api(`/applications/${id}/offer`, 'POST', { accept }); load(); } catch (e) { Alert.alert('Error', e.message); }
  };

  const save = async () => {
    try {
      onProfile(await api('/me', 'PUT', form));
      Alert.alert('Saved', 'Profile updated. Your job matches were refreshed.');
      load();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const titles = { jobs: 'Jobs for you', apps: 'My applications', me: 'My profile' };

  return (
    <Screen title={titles[tab]} subtitle={`Hello, ${profile.name || 'Candidate'}`}>
      {tab === 'jobs' && (
        <FlatList
          data={jobs} keyExtractor={(j) => String(j.id)} refreshing={busy} onRefresh={load}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: C.muted }}>No open jobs yet</Text>}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={T.title}>{item.title}</Text>
                  <Text style={T.muted}>{item.company}{item.verified ? ' ✔' : ''} · {item.location}</Text>
                </View>
                <Match score={item.match_score} />
              </View>
              <Text style={T.line}>SAR {item.salary_min}–{item.salary_max} · {item.contract_type} · {item.duty_hours}h/day</Text>
              <Text style={T.line}>{item.skill_level} · {item.min_experience}+ yrs · {item.workers_needed} needed</Text>
              <Text style={T.line}>Skills: {item.skills}</Text>
              <Btn title={item.applied ? 'Applied ✓' : 'Apply with one tap'} disabled={item.applied} onPress={() => apply(item.id)} />
            </Card>
          )}
        />
      )}

      {tab === 'apps' && (
        <FlatList
          data={apps} keyExtractor={(a) => String(a.id)} refreshing={busy} onRefresh={load}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: C.muted }}>You have not applied to any job yet</Text>}
          renderItem={({ item: a }) => (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={T.title}>{a.job.title}</Text>
                  <Text style={T.muted}>{a.job.company} · {a.job.location}</Text>
                </View>
                <Badge status={a.status} />
              </View>
              <Steps status={a.status} />
              {a.interview_at && (
                <Text style={T.line}>Interview: {fmt(a.interview_at)} · {a.interview_mode}</Text>
              )}
              {a.offer_status === 'sent' && (
                <View style={{ backgroundColor: '#E8F5EE', borderRadius: 10, padding: 12, marginTop: 8 }}>
                  <Text style={{ fontWeight: '800', color: C.primary }}>You have a job offer</Text>
                  <Text style={{ marginTop: 4 }}>{a.offer_text}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <Btn title="Accept" onPress={() => respond(a.id, true)} />
                    <Btn kind="ghost" title="Decline" onPress={() => respond(a.id, false)} />
                  </View>
                </View>
              )}
              {a.offer_status === 'accepted' && <Text style={[T.line, { color: C.primary, fontWeight: '700' }]}>Offer accepted ✓ — joining instructions will follow</Text>}
              {a.offer_status === 'declined' && <Text style={[T.line, { color: C.danger }]}>Offer declined</Text>}
            </Card>
          )}
        />
      )}

      {tab === 'me' && (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}>
          <Card>
            <Field label="Full name" value={form.name} onChangeText={set('name')} />
            <Field label="Skills (comma separated)" value={form.skills} onChangeText={set('skills')} placeholder="electrician, wiring" />
            <Field label="Experience (years)" value={String(form.experience_years ?? '')} onChangeText={set('experience_years')} keyboardType="numeric" />
            <Field label="Nationality" value={form.nationality} onChangeText={set('nationality')} />
            <Field label="Current city" value={form.location} onChangeText={set('location')} />
            <Field label="Expected salary (SAR / month)" value={String(form.expected_salary ?? '')} onChangeText={set('expected_salary')} keyboardType="numeric" />
            <Field label="Iqama status" value={form.iqama_status} onChangeText={set('iqama_status')} placeholder="Valid / Transferable / None" />
            <Field label="Languages" value={form.languages} onChangeText={set('languages')} />
            <Btn title="Save profile" onPress={save} />
            <Btn kind="ghost" title="Log out" onPress={onLogout} />
          </Card>
        </ScrollView>
      )}

      <TabBar tabs={[['jobs', 'Jobs'], ['apps', 'Applications'], ['me', 'Profile']]} active={tab} onChange={setTab} />
    </Screen>
  );
}
