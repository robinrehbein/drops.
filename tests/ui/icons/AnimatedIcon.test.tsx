import { render } from '@testing-library/react-native';

import { AnimatedIcon } from '@/ui/icons/AnimatedIcon';

describe('AnimatedIcon', () => {
  it('renders the underlying icon by name', () => {
    const { getByTestId } = render(<AnimatedIcon name="star" animation="pop" trigger={0} />);
    expect(getByTestId('icon-star')).toBeTruthy();
  });

  it('re-renders without crashing when its trigger changes', () => {
    const { rerender, getByTestId } = render(
      <AnimatedIcon name="check" animation="pop" trigger={0} />,
    );
    rerender(<AnimatedIcon name="check" animation="pop" trigger={1} />);
    expect(getByTestId('icon-check')).toBeTruthy();
  });
});
