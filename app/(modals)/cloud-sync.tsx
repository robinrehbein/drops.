import Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useIsCloudSyncActive,
  useSubscriptionStore,
  type SyncEntitlement,
} from '@/state/subscription';
import { useConnectedDevices, useSyncStatus, useTriggerSync } from '@/features/sync/hooks';
import { getLastSyncDate } from '@/features/sync/service';
import { Icon } from '@/ui/icons/line';
import { Pill } from '@/ui/primitives/Pill';
import { Sheet } from '@/ui/primitives/Sheet';
import { Surface } from '@/ui/primitives/Surface';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function CloudSyncScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isActive = useIsCloudSyncActive();
  const { entitlement, activate, deactivate } = useSubscriptionStore();

  return (
    <Sheet>
      <Text variant="title">Cloud Sync</Text>
      <ScrollView
        contentContainerStyle={{ gap: t.space.lg, marginTop: t.space.lg, paddingBottom: insets.bottom + t.space.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {isActive ? (
          <ActiveView entitlement={entitlement!} deactivate={deactivate} />
        ) : (
          <PaywallView onActivate={activate} />
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.back()}
        style={{ alignItems: 'center', padding: t.space.md, marginTop: t.space.md }}
      >
        <Text variant="bodyStrong" color={t.colors.forest}>Done</Text>
      </Pressable>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Active view — paid user is connected
// ---------------------------------------------------------------------------

function ActiveView({
  entitlement,
  deactivate,
}: {
  entitlement: SyncEntitlement;
  deactivate: () => void;
}) {
  const t = useTheme();
  const lastSyncAt = getLastSyncDate();
  const triggerSync = useTriggerSync();
  const { devices, isLoading: devicesLoading } = useConnectedDevices();

  const syncLabel = lastSyncAt
    ? `Last synced ${lastSyncAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Never synced';

  return (
    <>
      {/* Status banner */}
      <Surface bg="paperDeep" padding="md" radius="md" bordered>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
          <Icon name="cloud" color={t.colors.forest} size={20} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Cloud Sync active</Text>
            <Text variant="caption">{syncLabel}</Text>
          </View>
          {triggerSync.isPending ? (
            <ActivityIndicator size="small" color={t.colors.forest} />
          ) : (
            <Pressable
              onPress={() => triggerSync.mutate()}
              accessibilityLabel="Sync now"
            >
              <Icon name="refresh" color={t.colors.forest} size={20} />
            </Pressable>
          )}
        </View>
        {triggerSync.isError ? (
          <Text variant="caption" color={t.colors.danger} style={{ marginTop: t.space.xs }}>
            {(triggerSync.error as Error)?.message ?? 'Sync failed'}
          </Text>
        ) : null}
        {triggerSync.isSuccess ? (
          <Text variant="caption" color={t.colors.forest} style={{ marginTop: t.space.xs }}>
            Sync complete
          </Text>
        ) : null}
      </Surface>

      {/* Server info */}
      <Surface bg="paper" padding="md" radius="md" bordered>
        <Text variant="label">SERVER</Text>
        <Text variant="caption" style={{ marginTop: t.space.xs }}>
          {entitlement.serverUrl}
        </Text>
        <Text variant="label" style={{ marginTop: t.space.md }}>THIS DEVICE</Text>
        <Text variant="caption" style={{ marginTop: t.space.xs }}>
          {Device.deviceName ?? entitlement.deviceId}
        </Text>
      </Surface>

      {/* Connected devices */}
      <Surface bg="paper" padding="md" radius="md" bordered>
        <Text variant="label">CONNECTED DEVICES</Text>
        {devicesLoading ? (
          <ActivityIndicator size="small" color={t.colors.inkFaint} style={{ marginTop: t.space.md }} />
        ) : devices.length === 0 ? (
          <Text variant="caption" style={{ marginTop: t.space.sm }}>
            Only this device is paired.
          </Text>
        ) : (
          devices.map((d) => (
            <View
              key={d.deviceId}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: t.space.sm,
                borderBottomWidth: 1,
                borderBottomColor: t.colors.paperEdge,
              }}
            >
              <Text variant="body">{d.deviceName}</Text>
              <Text variant="caption">
                {d.lastSeenAt instanceof Date
                  ? d.lastSeenAt.toLocaleDateString()
                  : String(d.lastSeenAt)}
              </Text>
            </View>
          ))
        )}
      </Surface>

      {/* Sync now + disconnect */}
      <Pill
        label="Sync now"
        leftIcon="refresh"
        onPress={() => triggerSync.mutate()}
        disabled={triggerSync.isPending}
      />
      <Pill
        label="Disconnect Cloud Sync"
        variant="ghost"
        onPress={deactivate}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Paywall view — free user
// ---------------------------------------------------------------------------

function PaywallView({ onActivate }: { onActivate: (e: SyncEntitlement) => void }) {
  const t = useTheme();
  const [showSetup, setShowSetup] = useState(false);

  return (
    <>
      {/* What sync does */}
      <Surface bg="paperDeep" padding="md" radius="md" bordered>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
          <Icon name="cloudOff" color={t.colors.inkFaint} size={20} />
          <Text variant="bodyStrong">Offline mode</Text>
        </View>
        <Text variant="body" style={{ marginTop: t.space.sm }}>
          Your data is stored locally. Everything works offline, for free, forever.
        </Text>
      </Surface>

      <Surface bg="paper" padding="md" radius="md" bordered>
        <Text variant="label">WHAT CLOUD SYNC ADDS</Text>
        {[
          'Sync beans, sessions, and notes across phone and tablet',
          'Restore your data on a new device',
          'Hosted on your own Coolify VPS — your data stays yours',
        ].map((item) => (
          <View
            key={item}
            style={{ flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm, alignItems: 'flex-start' }}
          >
            <Icon name="check" color={t.colors.forest} size={16} />
            <Text variant="body" style={{ flex: 1 }}>{item}</Text>
          </View>
        ))}
      </Surface>

      {showSetup ? (
        <SetupForm onActivate={onActivate} onCancel={() => setShowSetup(false)} />
      ) : (
        <Pill
          label="Connect to Cloud Sync"
          leftIcon="cloud"
          onPress={() => setShowSetup(true)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Setup form — enter server URL and token
// ---------------------------------------------------------------------------

function SetupForm({
  onActivate,
  onCancel,
}: {
  onActivate: (e: SyncEntitlement) => void;
  onCancel: () => void;
}) {
  const t = useTheme();
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    fontFamily: t.fonts.sans,
    fontSize: 15,
    color: t.colors.ink,
    paddingVertical: t.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.paperEdge,
    marginTop: t.space.xs,
  } as const;

  async function save() {
    const url = serverUrl.trim().replace(/\/$/, '');
    const tok = token.trim();

    if (!url) { setError('Server URL is required'); return; }
    if (!url.startsWith('https://')) { setError('URL must start with https://'); return; }
    if (!tok) { setError('Sync token is required'); return; }

    setSaving(true);
    setError(null);

    try {
      // Verify the token is valid by hitting the health endpoint
      const res = await fetch(`${url}/api/sync/health`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) {
        setError(`Server responded with ${res.status}. Check the URL and token.`);
        setSaving(false);
        return;
      }

      const body = (await res.json()) as { deviceId: string };
      onActivate({
        token: tok,
        deviceId: body.deviceId ?? `device-${Date.now()}`,
        serverUrl: url,
        expiresAt: 0,
      });
    } catch (e) {
      setError('Could not reach server. Check the URL and your connection.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Surface bg="paper" padding="md" radius="md" bordered>
      <Text variant="label">CONNECT YOUR SERVER</Text>

      <Text variant="caption" style={{ marginTop: t.space.sm }}>
        Server URL (your Coolify deployment)
      </Text>
      <TextInput
        style={inputStyle}
        value={serverUrl}
        onChangeText={setServerUrl}
        placeholder="https://sync.yourserver.com"
        placeholderTextColor={t.colors.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        accessibilityLabel="Server URL"
      />

      <Text variant="caption" style={{ marginTop: t.space.md }}>
        Sync token
      </Text>
      <TextInput
        style={inputStyle}
        value={token}
        onChangeText={setToken}
        placeholder="Paste your sync token here"
        placeholderTextColor={t.colors.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        accessibilityLabel="Sync token"
      />

      {error ? (
        <Text variant="caption" color={t.colors.danger} style={{ marginTop: t.space.sm }}>
          {error}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: t.space.sm, marginTop: t.space.lg }}>
        <Pill label="Cancel" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Pill
          label={saving ? 'Connecting…' : 'Connect'}
          onPress={save}
          disabled={saving}
          style={{ flex: 2 }}
        />
      </View>
    </Surface>
  );
}
