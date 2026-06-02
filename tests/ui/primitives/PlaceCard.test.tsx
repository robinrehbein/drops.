import { fireEvent, render, screen } from '@testing-library/react-native';

import { PlaceCard } from '@/ui/primitives/PlaceCard';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

const place = {
  id: 'p1',
  name: 'Mókuska',
  kind: 'cafe',
  city: 'Stuttgart',
  curated: true,
  address: 'Johannesstr. 34',
  userData: null,
};

it('shows name and fires onPress', () => {
  const onPress = jest.fn();
  render(
    <ThemeProvider>
      <PlaceCard place={place as never} onPress={onPress} />
    </ThemeProvider>,
  );
  expect(screen.getByText('Mókuska')).toBeTruthy();
  fireEvent.press(screen.getByText('Mókuska'));
  expect(onPress).toHaveBeenCalled();
});

it('falls back to the kind badge when the image fails to load', () => {
  const withImage = { ...place, imageUrl: 'https://example.com/broken.jpg' };
  render(
    <ThemeProvider>
      <PlaceCard place={withImage as never} onPress={() => {}} />
    </ThemeProvider>,
  );
  // Image shown initially, badge hidden.
  const img = screen.getByTestId('place-image');
  expect(screen.queryByText('C')).toBeNull();
  // Simulate a load failure → badge replaces the image.
  fireEvent(img, 'error');
  expect(screen.queryByTestId('place-image')).toBeNull();
  expect(screen.getByText('C')).toBeTruthy();
});
