import { render, screen } from '@testing-library/react-native';

import { CupsRow } from '@/ui/primitives/CupsRow';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

describe('CupsRow', () => {
  it('renders goal cups total', () => {
    render(
      <ThemeProvider>
        <CupsRow progress={{ filled: 2, total: 4, overshoot: 0 }} />
      </ThemeProvider>,
    );
    expect(screen.getAllByTestId('cup-filled')).toHaveLength(2);
    expect(screen.getAllByTestId('cup-empty')).toHaveLength(2);
    expect(screen.getByText('2 of 4')).toBeTruthy();
  });

  it('renders overshoot cups', () => {
    render(
      <ThemeProvider>
        <CupsRow progress={{ filled: 4, total: 4, overshoot: 2 }} />
      </ThemeProvider>,
    );
    expect(screen.getAllByTestId('cup-filled')).toHaveLength(4);
    expect(screen.getAllByTestId('cup-overshoot')).toHaveLength(2);
  });
});
