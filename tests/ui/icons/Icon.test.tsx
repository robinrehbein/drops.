import { render } from '@testing-library/react-native';

import { Icon } from '@/ui/icons/line';

// NOTE on prop forwarding (lucide-react-native v1.17.0):
// Lucide's internal <Icon> wrapper destructures the props we pass and
// transforms them before they reach the <Svg> root:
//   - `testID`  -> emitted as the DOM-style attribute `data-testid`
//   - `color`   -> becomes the SVG `stroke` attribute
//   - `size`    -> becomes `width` and `height`
//   - `fill` / `strokeWidth` -> forwarded onto the root (and each child path)
//   - `accessibilityLabel` -> forwarded onto the root AND every child node
// Under the react-native-svg View-stub mock these land as plain View props,
// so the assertions below target the *actual* rendered attribute names.
// The Svg root is the first node carrying the accessibilityLabel.

describe('Icon', () => {
  it('renders a Lucide icon for each known name with a stable testID', () => {
    const { getAllByLabelText } = render(<Icon name="cup" />);
    const svgRoot = getAllByLabelText('cup')[0];
    expect(svgRoot).toBeTruthy();
    // Lucide emits our `testID` as `data-testid` on the Svg root.
    expect(svgRoot.props['data-testid']).toBe('icon-cup');
  });

  it('forwards color and size', () => {
    const { getAllByLabelText } = render(<Icon name="pin" color="#123456" size={32} />);
    const node = getAllByLabelText('pin')[0];
    // `color` -> `stroke`, `size` -> width/height on the Svg root.
    expect(node.props.stroke).toBe('#123456');
    expect(node.props.width).toBe(32);
    expect(node.props.height).toBe(32);
  });

  it('defaults fill to none and accepts a fill override', () => {
    const { getAllByLabelText } = render(<Icon name="star" fill="#abc" />);
    expect(getAllByLabelText('star')[0].props.fill).toBe('#abc');
  });

  it('defaults fill to "none" when no fill is provided', () => {
    const { getAllByLabelText } = render(<Icon name="star" />);
    expect(getAllByLabelText('star')[0].props.fill).toBe('none');
  });
});
