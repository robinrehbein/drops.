import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useBeansBySourcePlace } from '@/features/beans/hooks';
import { usePlace, useSetUserData, useToggleWishlist } from '@/features/places/hooks';
import { RatingStars } from '@/ui/primitives/RatingStars';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export function PlaceDetailScreen({ id }: { id: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: place } = usePlace(id);
  const toggle = useToggleWishlist();
  const setUserData = useSetUserData();
  const { data: linkedBeans = [] } = useBeansBySourcePlace(id);
  const [showPicker, setShowPicker] = useState(false);
  if (!place) return <View style={{ flex: 1, backgroundColor: theme.colors.paper }} />;

  const onWishlist = !!place.userData?.wishlisted;
  const visited = !!place.userData?.visitedAt;
  const mapsUrl =
    place.lat != null && place.lng != null
      ? Platform.select({
          // Android: geo: intent opens the user's default maps app; iOS: Apple Maps.
          android: `geo:${place.lat},${place.lng}?q=${encodeURIComponent(place.name)}`,
          default: `https://maps.apple.com/?ll=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}`,
        })
      : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.paper }}
      contentContainerStyle={{ padding: theme.space.lg, gap: theme.space.sm }}
    >
      <Text variant="title">{place.name}</Text>
      {place.address ? (
        <Text variant="caption" style={{ color: theme.colors.inkFaint }}>
          {place.address}
        </Text>
      ) : null}
      {place.openingHours ? <Text variant="caption">{place.openingHours}</Text> : null}
      {place.editorialNote ? <Text variant="body">{place.editorialNote}</Text> : null}

      {place.lat != null && place.lng != null ? (
        <View style={{ height: 160, borderRadius: theme.radii.sm, overflow: 'hidden' }}>
          <MapView
            style={{ flex: 1 }}
            testID="detail-map"
            pointerEvents="none"
            initialRegion={{
              latitude: place.lat,
              longitude: place.lng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            <Marker coordinate={{ latitude: place.lat, longitude: place.lng }} />
          </MapView>
        </View>
      ) : null}

      {place.website ? (
        <Pressable onPress={() => Linking.openURL(place.website!)}>
          <Text variant="bodyStrong" color={theme.colors.forest}>
            {t('explore.website')}
          </Text>
        </Pressable>
      ) : null}
      {mapsUrl ? (
        <Pressable onPress={() => Linking.openURL(mapsUrl)}>
          <Text variant="bodyStrong" color={theme.colors.forest}>
            {t('explore.openInMaps')}
          </Text>
        </Pressable>
      ) : null}

      <Pressable testID="toggle-wishlist" onPress={() => toggle.mutate(id)}>
        <Text variant="body">
          {onWishlist ? `★ ${t('explore.wishlistOn')}` : `☆ ${t('explore.wishlistAdd')}`}
        </Text>
      </Pressable>

      <Pressable
        testID="toggle-visited"
        onPress={() =>
          setUserData.mutate({ id, patch: { visitedAt: visited ? null : new Date() } })
        }
      >
        <Text variant="body">
          {visited
            ? `✓ ${t('explore.visited')} (${place.userData!.visitedAt!.toLocaleDateString()})`
            : t('explore.markVisited')}
        </Text>
      </Pressable>
      {visited ? (
        <Pressable testID="edit-visit-date" onPress={() => setShowPicker(true)}>
          <Text variant="caption" color={theme.colors.forest}>
            {t('explore.editDate')}
          </Text>
        </Pressable>
      ) : null}
      {showPicker ? (
        <DateTimePicker
          testID="date-picker"
          value={place.userData?.visitedAt ?? new Date()}
          mode="date"
          onChange={(_event, date) => {
            setShowPicker(false);
            if (date) setUserData.mutate({ id, patch: { visitedAt: date } });
          }}
        />
      ) : null}

      <Text variant="caption" style={{ color: theme.colors.inkFaint }}>
        {t('explore.yourRating')}
      </Text>
      <RatingStars
        value={place.userData?.rating ?? null}
        onChange={(n) => setUserData.mutate({ id, patch: { rating: n } })}
      />

      <TextInput
        placeholder={t('explore.notes')}
        defaultValue={place.userData?.notes ?? ''}
        onEndEditing={(e) => setUserData.mutate({ id, patch: { notes: e.nativeEvent.text } })}
        multiline
        style={{
          borderWidth: 1,
          borderColor: theme.colors.paperEdge,
          borderRadius: theme.radii.sm,
          padding: theme.space.md,
          minHeight: 80,
          color: theme.colors.ink,
          fontFamily: theme.fonts.sans,
        }}
      />

      <Text variant="caption" style={{ color: theme.colors.inkFaint, marginTop: theme.space.sm }}>
        {t('explore.linkedBeans')}
      </Text>
      {linkedBeans.length > 0 ? (
        linkedBeans.map((b) => (
          <Text key={b.id} variant="body">
            • {b.name}
          </Text>
        ))
      ) : (
        <Text variant="caption" style={{ color: theme.colors.inkFaint }}>
          {t('explore.noLinkedBeans')}
        </Text>
      )}
    </ScrollView>
  );
}
