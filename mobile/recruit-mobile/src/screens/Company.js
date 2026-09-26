import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { Badge, Btn, C, Card, Chips, Field, Match, Screen, Stat, T, TabBar, fmt } from '../ui';

const EMPTY = {
  title: '', skills: '', workers_needed: '1', min_experience: '0', salary_min: '', salary_max: '',
  location: '', duty_hours: '8', skill_level: 'Skilled', contract_type: 'Monthly', auto_reject: false,
};
const FIELDS = [
  ['title', 'Job title', 'default'], ['skills', 'Required skills (comma separated)', 'default'],
  ['workers_needed', 'Workers needed', 'numeric'], ['min_experience', 'Minimum experience (years)', 'numeric'],
  ['salary_min', 'Salary min (SAR)', 'numeric'], ['salary_max', 'Salary max (SAR)', 'numeric'],
  ['location', 'Location', 'default'], ['duty_hours', 'Duty hours per day', 'numeric'],
];

const makeSlots = () =>
  [[1, 10], [1, 14], [2, 11], [3, 9]].map(([d, h]) => {
    const x = new Date();
    x.setDate(x.getDate() + d);
    x.setHours(h, 0, 0, 0);
    return x;
  });

export default function Company({ profile, onLogout }) {

  const insets = useSafeAreaInsets();   

  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({});
  const [job, setJob] = useState(null); // selected job -> applicants view
  const [apps, setApps] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [sched, setSched] = useState(null);
  const [mode, setMode] = useState('online');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setJobs(await api('/jobs'));
      setStats(await api('/stats'));
      if (job) setApps(await api(`/applications?job=${job.id}`));
    } catch (e) { Alert.alert('Error', e.message); }
    setBusy(false);
  }, [job]);
  useEffect(() => { load(); }, [load]);

  const act = async (id, body) => {
    try { await api(`/applications/${id}`, 'PATCH', body); setSched(null); load(); } catch (e) { Alert.alert('Error', e.message); }
  };

  const post = async () => {
    try {
      await api('/jobs', 'POST', form);
      setForm(EMPTY);
      setTab('jobs');
      Alert.alert('Job posted', 'Matching candidates can now see and apply to this job.');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const actions = (a) => {
    const out = [];
    if (a.status === 'applied') out.push(<Btn key="r" title="Start review" onPress={() => act(a.id, { status: 'under_review' })} />);
    if (['applied', 'under_review'].includes(a.status)) out.push(<Btn key="s" kind="ghost" title="Shortlist" onPress={() => act(a.id, { status: 'shortlisted' })} />);
    if (a.status === 'shortlisted') out.push(<Btn key="i" title="Schedule interview" onPress={() => setSched(a)} />);
    if (a.status === 'interview_scheduled') out.push(<Btn key="o" title="Select & send offer" onPress={() => act(a.id, { status: 'selected' })} />);
    if (!['selected', 'rejected'].includes(a.status)) out.push(<Btn key="x" kind="danger" title="Reject" onPress={() => act(a.id, { status: 'rejected' })} />);
    return out;
  };

  const titles = { jobs: job ? job.title : 'Dashboard', post: 'Post a job', me: 'Company profile' };

  return (
    <Screen title={titles[tab]} subtitle={job && tab === 'jobs' ? 'Applicants ranked by match score' : profile.company_name || profile.name}>
      {tab === 'jobs' && !job && (
        <FlatList
          data={jobs} keyExtractor={(j) => String(j.id)} refreshing={busy} onRefresh={load}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={
            <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginTop: 12 }}>
              <Stat label="Jobs" value={stats.jobs ?? 0} />
              <Stat label="Applicants" value={stats.applicants ?? 0} />
              <Stat label="Shortlisted" value={stats.shortlisted ?? 0} />
              <Stat label="Hired" value={stats.hired ?? 0} />
            </View>
          }
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: C.muted }}>No jobs yet. Post your first requirement.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setJob(item)}>
              <Card>
                <Text style={T.title}>{item.title}</Text>
                <Text style={T.muted}>{item.location} · {item.contract_type} · {item.workers_needed} workers</Text>
                <Text style={T.line}>SAR {item.salary_min}–{item.salary_max} · {item.min_experience}+ yrs{item.auto_reject ? ' · auto-reject ON' : ''}</Text>
                <Text style={[T.line, { color: C.primary, fontWeight: '700' }]}>{item.applicant_count} applicants →</Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {tab === 'jobs' && job && (
        <FlatList
          data={apps} keyExtractor={(a) => String(a.id)} refreshing={busy} onRefresh={load}
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
          ListHeaderComponent={<Btn kind="ghost" title="← Back to jobs" onPress={() => { setJob(null); setApps([]); }} style={{ marginHorizontal: 16 }} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: C.muted }}>No applicants yet</Text>}
          renderItem={({ item: a }) => (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={T.title}>{a.candidate.name}</Text>
                  <Text style={T.muted}>{a.candidate.nationality} · {a.candidate.location} · Iqama: {a.candidate.iqama_status || 'n/a'}</Text>
                </View>
                <Badge status={a.status} />
              </View>
              <View style={{ marginTop: 8 }}><Match score={a.match_score} /></View>
              <Text style={T.line}>{a.candidate.skills} · {a.candidate.experience_years} yrs</Text>
              <Text style={T.line}>Expects SAR {a.candidate.expected_salary} · {a.candidate.languages}</Text>
              {a.interview_at && <Text style={T.line}>Interview: {fmt(a.interview_at)} · {a.interview_mode}</Text>}
              {a.offer_status !== 'none' && <Text style={[T.line, { fontWeight: '700' }]}>Offer {a.offer_status}</Text>}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{actions(a)}</View>
            </Card>
          )}
        />
      )}

      {tab === 'post' && (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}>
          <Card>
            {FIELDS.map(([k, label, kb]) => (
              <Field key={k} label={label} value={form[k]} keyboardType={kb} onChangeText={(v) => setForm({ ...form, [k]: v })} />
            ))}
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>Skill level</Text>
            <Chips options={['Basic', 'Skilled', 'Expert']} value={form.skill_level} onChange={(v) => setForm({ ...form, skill_level: v })} />
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>Contract type</Text>
            <Chips options={['Daily', 'Monthly', 'Project-based']} value={form.contract_type} onChange={(v) => setForm({ ...form, contract_type: v })} />
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>Auto-reject candidates below minimum experience</Text>
            <Chips options={['On', 'Off']} value={form.auto_reject ? 'On' : 'Off'} onChange={(v) => setForm({ ...form, auto_reject: v === 'On' })} />
            <Btn title="Publish job" onPress={post} />
          </Card>
        </ScrollView>
      )}

      {tab === 'me' && (
        <Card>
          <Text style={T.title}>{profile.company_name || profile.name}</Text>
          <Text style={T.muted}>CR number: {profile.cr_number || 'not provided'}</Text>
          <Text style={[T.line, { color: profile.verified ? C.primary : C.warn, fontWeight: '700' }]}>
            {profile.verified ? 'CR verified ✔' : 'Verification pending'}
          </Text>
          <Btn kind="ghost" title="Log out" onPress={onLogout} />
        </Card>
      )}

      <Modal visible={!!sched} transparent animationType="slide" onRequestClose={() => setSched(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <Text style={T.title}>Schedule interview</Text>
            <Text style={[T.muted, { marginBottom: 8 }]}>{sched ? sched.candidate.name : ''}</Text>
            <Chips options={['online', 'in-person']} value={mode} onChange={setMode} />
            {makeSlots().map((d) => (
              <Btn key={d.toISOString()} kind="ghost" title={fmt(d)}
                onPress={() => act(sched.id, { status: 'interview_scheduled', interview_at: d.toISOString(), interview_mode: mode })} />
            ))}
            <Btn kind="ghost" title="Cancel" onPress={() => setSched(null)} />
          </View>
        </View>
      </Modal>

      <View
  	style={{
  	  position: 'absolute',
 	  left: 0,
  	  right: 0,
 	  bottom: 0,
  	  zIndex: 999,
 	   elevation: 999,
 	 }}
	>
 	 <TabBar
 	   tabs={[
 	     ['jobs', 'Jobs'],
 	     ['post', 'Post job'],
 	     ['me', 'Profile'],
 	   ]}
 	   active={tab}
 	   onChange={(t) => {
  	    setTab(t);
  	    if (t !== 'jobs') setJob(null);
 	   }}
 	 />
	</View>    

</Screen>
  );
}
