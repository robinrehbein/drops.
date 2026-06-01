import { render, screen } from '@testing-library/react-native';

import type { DailyPick } from '@/domain/daily-place';
import type { PlaceWithUserData } from '@/features/places/types';
import { DailyPlaceCard } from '@/ui/primitives/DailyPlaceCard';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

const pick = (over: Partial<PlaceWithUserData> = {}): DailyPick<PlaceWithUserData> => ({
  place: {
    name: 'Mókuska Caffè',
    kind: 'roaster',
    editorialNote: 'Tiny Balkan roaster with a cult following.',
    ...over,
  } as PlaceWithUserData,
  distanceKm: 2.34,
});

describe('DailyPlaceCard', () => {
  it('renders the suggested place with kind and distance', () => {
    wrap(<DailyPlaceCard pick={pick()} />);
    expect(screen.getByText('Mókuska Caffè')).toBeTruthy();
    expect(screen.getByText('Roaster · 2.3 km')).toBeTruthy();
    expect(screen.getByText(/Balkan roaster/)).toBeTruthy();
  });

  it('omits the distance when it is unknown', () => {
    wrap(<DailyPlaceCard pick={{ ...pick(), distanceKm: null }} />);
    expect(screen.getByText('Roaster')).toBeTruthy();
  });

  it('renders nothing when there is no pick', () => {
    wrap(<DailyPlaceCard pick={null} />);
    expect(screen.queryByTestId('daily-place-card')).toBeNull();
  });
});
