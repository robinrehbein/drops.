import { render, screen } from '@testing-library/react-native';

import { SensoryRadar } from '@/ui/primitives/SensoryRadar';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

const axes = { mouthfeel: 4, acidity: 3, sweetness: 5, bitterness: 2, balance: 4 };

describe('SensoryRadar', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(
        <ThemeProvider>
          <SensoryRadar axes={axes} />
        </ThemeProvider>,
      ),
    ).not.toThrow();
  });

  it('renders all five axis labels', () => {
    render(
      <ThemeProvider>
        <SensoryRadar axes={axes} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('radar-label-FEEL')).toBeTruthy();
    expect(screen.getByTestId('radar-label-ACID')).toBeTruthy();
    expect(screen.getByTestId('radar-label-SWEET')).toBeTruthy();
    expect(screen.getByTestId('radar-label-BITTER')).toBeTruthy();
    expect(screen.getByTestId('radar-label-BALANCE')).toBeTruthy();
  });

  it('exposes an accessibility summary', () => {
    render(
      <ThemeProvider>
        <SensoryRadar axes={axes} />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText(/Sensory radar:/)).toBeTruthy();
  });

  it('renders with all-zero axes without crashing', () => {
    expect(() =>
      render(
        <ThemeProvider>
          <SensoryRadar axes={{ mouthfeel: 0, acidity: 0, sweetness: 0, bitterness: 0, balance: 0 }} />
        </ThemeProvider>,
      ),
    ).not.toThrow();
  });
});
