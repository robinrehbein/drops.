import { render, screen, fireEvent } from '@testing-library/react-native';

import { Pill } from '@/ui/primitives/Pill';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

describe('Pill', () => {
  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    render(
      <ThemeProvider>
        <Pill label="Start Shot" onPress={onPress} testID="pill" />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByTestId('pill'));
    expect(onPress).toHaveBeenCalled();
  });
});
