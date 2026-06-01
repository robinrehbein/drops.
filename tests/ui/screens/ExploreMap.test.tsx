import { fireEvent, render, screen } from '@testing-library/react-native';

import { ExploreMap } from '@/ui/screens/ExploreMap';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

const places = [
  { id: 'p1', name: 'A', lat: 48.77, lng: 9.18, curated: true, userData: null },
  { id: 'p2', name: 'B', lat: null, lng: null, curated: false, userData: null },
];

it('renders a marker per place with coordinates', () => {
  render(
    <ThemeProvider>
      <ExploreMap places={places as never} onSelect={() => {}} />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('map-view')).toBeTruthy();
  expect(screen.getAllByTestId('map-marker')).toHaveLength(1);
});

it('selects a place when its marker is pressed', () => {
  const onSelect = jest.fn();
  render(
    <ThemeProvider>
      <ExploreMap places={places as never} onSelect={onSelect} />
    </ThemeProvider>,
  );
  fireEvent.press(screen.getByTestId('map-marker'));
  expect(onSelect).toHaveBeenCalledWith('p1');
});
