import { render } from '@testing-library/react-native';

import { Icon } from '@/ui/icons/line';

describe('Icon', () => {
  it('renders an icon wrapper with a stable testID for the name', () => {
    const { getByTestId } = render(<Icon name="cup" />);
    expect(getByTestId('icon-cup')).toBeTruthy();
  });

  it('renders distinct icons for distinct names', () => {
    const { getByTestId } = render(
      <>
        <Icon name="pin" />
        <Icon name="star" />
      </>,
    );
    expect(getByTestId('icon-pin')).toBeTruthy();
    expect(getByTestId('icon-star')).toBeTruthy();
  });

  it('forwards color/size/fill to the underlying glyph', () => {
    // The svg mock renders the Lucide <Svg> as a View carrying stroke (from
    // color), width/height (from size) and fill. Query that inner node.
    const { getByTestId } = render(<Icon name="pin" color="#123456" size={32} fill="#abc" />);
    const wrapper = getByTestId('icon-pin');
    const svg = wrapper.findAllByProps({ stroke: '#123456' })[0];
    expect(svg.props.width).toBe(32);
    expect(svg.props.height).toBe(32);
    expect(svg.props.fill).toBe('#abc');
  });
});
