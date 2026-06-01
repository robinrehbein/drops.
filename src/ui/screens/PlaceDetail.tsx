import { Marker } from '@maplibre/maplibre-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Linking, Platform, Pressable, TextInput, View } from 'react-native';

import { useBeansBySourcePlace } from '@/features/beans/hooks';
import { usePlace, useSetUserData, useToggleWishlist } from '@/features/places/hooks';
import { AnimatedIcon } from '@/ui/icons/AnimatedIcon';
import type { IconName } from '@/ui/icons/line';
import { BaseMap } from '@/ui/maps/BaseMap';
import { RatingStars } from '@/ui/primitives/RatingStars';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

const KIND_LABEL: Record<string, string> = {
  roaster: 'Roaster',
  coffee_shop: 'Coffee shop',
  cafe: 'Café',
};

/**
 * Detail body for a place. Renders content only (no scroll container) so it can
 * live inside either a ScrollView (legacy route) or the detail sheet.
 * Identity + quick actions come first so they show in the
 * sheet's compact (peek) snap; the rest is revealed on expand.
 */
export function PlaceDetail({ id }: { id: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: place } = usePlace(id);
  const toggle = useToggleWishlist();
  const setUserData = useSetUserData();
  const { data: linkedBeans = [] } = useBeansBySourcePlace(id);
  const [showPicker, setShowPicker] = useState(false);
  if (!place) return null;

  const onWishlist = !!place.userData?.wishlisted;
  const visited = !!place.userData?.visitedAt;
  const mapsUrl =
    place.lat != null && place.lng != null
      ? Platform.select({
          android: `geo:${place.lat},${place.lng}?q=${encodeURIComponent(place.name)}`,
          default: `https://maps.apple.com/?ll=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}`,
        })
      : null;

  const action = (
    testID: string,
    label: string,
    onPress: () => void,
    icon?: { name: IconName; active: boolean },
  ) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        gap: theme.space.xs,
        borderWidth: 1,
        borderColor: theme.colors.paperEdge,
        borderRadius: theme.radii.sm,
        paddingVertical: theme.space.sm,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon ? (
        <AnimatedIcon
          name={icon.name}
          animation="pop"
          trigger={icon.active}
          size={16}
          color={theme.colors.forest}
          fill={icon.active ? theme.colors.forest : 'none'}
        />
      ) : null}
      <Text variant="caption" color={theme.colors.forest}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ gap: theme.space.sm }}>
      {/* Peek zone: identity + quick actions */}
      {place.imageUrl ? (
        <Image
          source={{ uri: place.imageUrl }}
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          style={{
            width: '100%',
            height: 180,
            borderRadius: theme.radii.sm,
            backgroundColor: theme.colors.paperDeep,
          }}
        />
      ) : null}
      <Text variant="title">{place.name}</Text>
      <Text variant="caption" style={{ color: theme.colors.inkFaint }}>
        {KIND_LABEL[place.kind] ?? place.kind}
        {place.city ? ` · ${place.city}` : ''}
      </Text>
      {place.address ? (
        <Text variant="caption" style={{ color: theme.colors.inkFaint }}>
          {place.address}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: theme.space.sm, marginTop: theme.space.xs }}>
        {action(
          'toggle-wishlist',
          onWishlist ? t('explore.wishlistOn') : t('explore.wishlistAdd'),
          () => toggle.mutate(id),
          { name: 'star', active: onWishlist },
        )}
        {action(
          'toggle-visited',
          visited ? t('explore.visited') : t('explore.markVisited'),
          () => setUserData.mutate({ id, patch: { visitedAt: visited ? null : new Date() } }),
          { name: 'check', active: visited },
        )}
        {mapsUrl
          ? action('open-maps', t('explore.openInMaps'), () => Linking.openURL(mapsUrl))
          : null}
      </View>

      {/* Expanded zone */}
      {place.openingHours ? <Text variant="caption">{place.openingHours}</Text> : null}
      {place.editorialNote ? <Text variant="body">{place.editorialNote}</Text> : null}

      {place.tags && place.tags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs }}>
          {place.tags.map((tag) => (
            <View
              key={tag}
              style={{
                backgroundColor: theme.colors.paperEdge,
                borderRadius: theme.radii.sm,
                paddingHorizontal: theme.space.sm,
                paddingVertical: 2,
              }}
            >
              <Text variant="caption" color={theme.colors.forest}>
                {tag.replace(/-/g, ' ')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {place.lat != null && place.lng != null ? (
        <View
          pointerEvents="none"
          style={{ height: 160, borderRadius: theme.radii.sm, overflow: 'hidden' }}
        >
          <BaseMap
            testID="detail-map"
            center={{ lat: place.lat, lng: place.lng }}
            zoom={13}
            interactive={false}
          >
            <Marker lngLat={[place.lng, place.lat]} anchor="bottom">
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#c0392b',
                  borderWidth: 2,
                  borderColor: '#fff',
                }}
              />
            </Marker>
          </BaseMap>
        </View>
      ) : null}

      {place.website ? (
        <Pressable onPress={() => Linking.openURL(place.website!)}>
          <Text variant="bodyStrong" color={theme.colors.forest}>
            {t('explore.website')}
          </Text>
        </Pressable>
      ) : null}

      {visited ? (
        <Pressable testID="edit-visit-date" onPress={() => setShowPicker(true)}>
          <Text variant="caption" color={theme.colors.forest}>
            {t('explore.editDate')} ({place.userData!.visitedAt!.toLocaleDateString()})
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
    </View>
  );
}
