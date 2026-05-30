import { render, screen } from '@testing-library/react-native';

import { StatusBadge } from '@/ui/primitives/StatusBadge';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

it('renders the curated label', () => {
  render(
    <ThemeProvider>
      <StatusBadge variant="curated" />
    </ThemeProvider>,
  );
  expect(screen.getByText(/curated/i)).toBeTruthy();
});
