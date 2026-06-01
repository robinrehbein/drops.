import { fireEvent, render } from '@testing-library/react-native';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressAnimation } from '@/ui/icons/animations';

function Probe({ onPress }: { onPress: () => void }) {
  const { style, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={style}>
      <Pressable testID="probe" onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} />
    </Animated.View>
  );
}

describe('usePressAnimation', () => {
  it('returns an animated style and press handlers', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Probe onPress={onPress} />);
    const node = getByTestId('probe');
    fireEvent(node, 'pressIn');
    fireEvent(node, 'pressOut');
    fireEvent.press(node);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
