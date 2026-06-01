import { render, screen, fireEvent } from '@testing-library/react-native';

import { RatingStars } from '@/ui/primitives/RatingStars';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

describe('RatingStars', () => {
  it('renders five star icons and no glyphs', () => {
    render(
      <ThemeProvider>
        <RatingStars value={3} />
      </ThemeProvider>,
    );
    expect(screen.getAllByTestId('icon-star')).toHaveLength(5);
    expect(screen.queryByText('★')).toBeNull();
    expect(screen.queryByText('☆')).toBeNull();
  });

  it('calls onChange with the tapped star value', () => {
    const onChange = jest.fn();
    render(
      <ThemeProvider>
        <RatingStars value={null} onChange={onChange} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByTestId('star-4'));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
