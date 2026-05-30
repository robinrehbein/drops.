import { render, screen } from '@testing-library/react-native';

import { BeanCard } from '@/ui/primitives/BeanCard';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

describe('BeanCard', () => {
  it('renders the bean name and subtitle', () => {
    render(
      <ThemeProvider>
        <BeanCard name="Konga" subtitle="Ethiopia · washed" remainingPct={80} />
      </ThemeProvider>,
    );

    expect(screen.getByText('Konga')).toBeTruthy();
    expect(screen.getByText('Ethiopia · washed')).toBeTruthy();
  });

  it('shows the buy-again badge when marked', () => {
    render(
      <ThemeProvider>
        <BeanCard name="Konga" wouldBuyAgain />
      </ThemeProvider>,
    );

    expect(screen.getByText('BUY AGAIN')).toBeTruthy();
  });
});

