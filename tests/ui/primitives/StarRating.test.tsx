import { render } from '@testing-library/react-native';

import { StarRating } from '@/ui/primitives/StarRating';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('StarRating', () => {
  it('renders one filled star per rating point', () => {
    const { getAllByTestId } = wrap(<StarRating value={3} />);
    expect(getAllByTestId('icon-star')).toHaveLength(3);
  });

  it('renders nothing for a zero/empty rating', () => {
    const { queryAllByTestId } = wrap(<StarRating value={0} />);
    expect(queryAllByTestId('icon-star')).toHaveLength(0);
  });
});
