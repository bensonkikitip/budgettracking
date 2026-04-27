import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { AccountType, CsvFormat, insertAccount } from '../../src/db/queries';

const ACCOUNT_TYPES: { label: string; value: AccountType }[] = [
  { label: 'Checking', value: 'checking' },
  { label: 'Credit Card', value: 'credit_card' },
];

const CSV_FORMATS: { label: string; value: CsvFormat; forType: AccountType }[] = [
  { label: 'Bank of America – Checking', value: 'boa_checking_v1', forType: 'checking' },
  { label: 'Citi – Credit Card', value: 'citi_cc_v1', forType: 'credit_card' },
];

export default function AddAccountScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [csvFormat, setCsvFormat] = useState<CsvFormat>('boa_checking_v1');
  const [saving, setSaving] = useState(false);

  const availableFormats = CSV_FORMATS.filter((f) => f.forType === type);

  function handleTypeChange(newType: AccountType) {
    setType(newType);
    const defaultFormat = CSV_FORMATS.find((f) => f.forType === newType);
    if (defaultFormat) setCsvFormat(defaultFormat.value);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this account.');
      return;
    }
    setSaving(true);
    try {
      const id = Crypto.randomUUID();
      await insertAccount({ id, name: name.trim(), type, csv_format: csvFormat, created_at: Date.now() });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not save account. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>ACCOUNT NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. BoA Checking, Citi Rewards"
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="done"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>ACCOUNT TYPE</Text>
        {ACCOUNT_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={styles.option}
            onPress={() => handleTypeChange(t.value)}
          >
            <Text style={styles.optionLabel}>{t.label}</Text>
            {type === t.value && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>CSV FORMAT</Text>
        {availableFormats.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={styles.option}
            onPress={() => setCsvFormat(f.value)}
          >
            <Text style={styles.optionLabel}>{f.label}</Text>
            {csvFormat === f.value && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}
        <Text style={styles.hint}>
          This tells the app how to parse your bank's CSV export format.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Add Account'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  section: { marginTop: 24 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d1d6',
    color: '#1c1c1e',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d1d6',
  },
  optionLabel: { fontSize: 16, color: '#1c1c1e' },
  check: { fontSize: 16, color: '#007aff', fontWeight: '600' },
  hint: { fontSize: 13, color: '#8e8e93', paddingHorizontal: 16, paddingTop: 8 },
  saveButton: {
    margin: 24,
    backgroundColor: '#007aff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
