import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { Text } from '@/ui/primitives/Text';

const wrap = (ui: React.ReactNode) => <ThemeProvider>{ui}</ThemeProvider>;

describe('Text', () => {
  it('renders children', () => {
    render(wrap(<Text variant="body">Hello</Text>));
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('applies the title variant style', () => {
    render(wrap(<Text variant="title" testID="t">Drop</Text>));
    const el = screen.getByTestId('t');
    expect(el.props.style).toEqual(expect.objectContaining({ fontSize: 24 }));
  });
});
