import { render, screen } from '@testing-library/react-native';

import { MetricTile } from '@/ui/primitives/MetricTile';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

describe('MetricTile', () => {
  it('renders label and value', () => {
    render(
      <ThemeProvider>
        <MetricTile label="DOSE" value="18.0 g" />
      </ThemeProvider>,
    );
    expect(screen.getByText('DOSE')).toBeTruthy();
    expect(screen.getByText('18.0 g')).toBeTruthy();
  });
});
