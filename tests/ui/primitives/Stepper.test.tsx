import { render, screen, fireEvent } from '@testing-library/react-native';

import { Stepper } from '@/ui/primitives/Stepper';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

describe('Stepper', () => {
  it('increments and decrements within bounds', () => {
    const onChange = jest.fn();
    render(
      <ThemeProvider>
        <Stepper label="Dose" unit="g" min={1} max={30} step={0.1} value={18} onChange={onChange} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByLabelText('Dose increase'));
    expect(onChange).toHaveBeenCalledWith(18.1);
    fireEvent.press(screen.getByLabelText('Dose decrease'));
    expect(onChange).toHaveBeenCalledWith(17.9);
  });

  it('clamps to bounds', () => {
    const onChange = jest.fn();
    render(
      <ThemeProvider>
        <Stepper label="Dose" unit="g" min={1} max={30} step={0.1} value={30} onChange={onChange} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByLabelText('Dose increase'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
