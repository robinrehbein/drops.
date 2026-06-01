import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { LatLng } from '@/domain/places';
import type { PlaceInput } from '@/domain/validators/place';
import { useAddPlace } from '@/features/places/hooks';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const KINDS: PlaceInput['kind'][] = ['cafe', 'coffee_shop', 'roaster'];

export function AddPlaceScreen({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const add = useAddPlace();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [kind, setKind] = useState<PlaceInput['kind']>('cafe');
  const [coords, setCoords] = useState<LatLng | null>(null);

  async function useCurrentLocation() {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({});
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.colors.paperEdge,
    borderRadius: theme.radii.sm,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
    color: theme.colors.ink,
    fontFamily: theme.fonts.sans,
  } as const;

  async function save() {
    if (!name.trim()) return;
    const tags = tagsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await add.mutateAsync({
      name: name.trim(),
      kind,
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
      ...(tags.length ? { tags } : {}),
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    });
    onDone();
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.paper }}
      contentContainerStyle={{ padding: theme.space.lg }}
    >
      <Text variant="title" style={{ marginBottom: theme.space.md }}>
        {t('explore.addPlace')}
      </Text>
      <TextInput
        placeholder={t('explore.placeName')}
        value={name}
        onChangeText={setName}
        style={inputStyle}
      />
      <TextInput
        placeholder={t('explore.placeCity')}
        value={city}
        onChangeText={setCity}
        style={inputStyle}
      />
      <TextInput
        placeholder={t('explore.placeAddress')}
        value={address}
        onChangeText={setAddress}
        style={inputStyle}
      />
      <TextInput
        placeholder={t('explore.placeTags')}
        value={tagsText}
        onChangeText={setTagsText}
        style={inputStyle}
      />
      <View style={{ flexDirection: 'row', gap: theme.space.sm, marginBottom: theme.space.lg }}>
        {KINDS.map((k) => (
          <Pressable
            key={k}
            onPress={() => setKind(k)}
            style={{
              borderRadius: theme.radii.pill,
              paddingHorizontal: theme.space.md,
              paddingVertical: theme.space.sm,
              backgroundColor: kind === k ? theme.colors.forest : theme.colors.paperEdge,
            }}
          >
            <Text
              variant="caption"
              style={{ color: kind === k ? theme.colors.paper : theme.colors.ink }}
            >
              {k}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={useCurrentLocation}
        testID="use-location"
        style={{
          alignSelf: 'flex-start',
          borderRadius: theme.radii.pill,
          paddingHorizontal: theme.space.md,
          paddingVertical: theme.space.sm,
          backgroundColor: theme.colors.paperEdge,
          marginBottom: theme.space.sm,
        }}
      >
        <Text variant="caption">
          {coords
            ? `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
            : t('explore.useCurrentLocation')}
        </Text>
      </Pressable>
      <Text
        variant="caption"
        style={{ color: theme.colors.inkFaint, marginBottom: theme.space.xs }}
      >
        {t('explore.tapMapHint')}
      </Text>
      <View
        style={{
          height: 200,
          borderRadius: theme.radii.sm,
          overflow: 'hidden',
          marginBottom: theme.space.lg,
        }}
      >
        <MapView
          style={{ flex: 1 }}
          testID="add-map"
          initialRegion={
            coords
              ? {
                  latitude: coords.lat,
                  longitude: coords.lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
              : { latitude: 51.16, longitude: 10.45, latitudeDelta: 6, longitudeDelta: 6 }
          }
          onPress={(e) =>
            setCoords({
              lat: e.nativeEvent.coordinate.latitude,
              lng: e.nativeEvent.coordinate.longitude,
            })
          }
        >
          {coords ? <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} /> : null}
        </MapView>
      </View>

      <Pressable
        onPress={save}
        style={{
          backgroundColor: theme.colors.forest,
          borderRadius: theme.radii.sm,
          padding: theme.space.md,
          alignItems: 'center',
        }}
      >
        <Text variant="bodyStrong" color={theme.colors.paper}>
          {t('common.save')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
