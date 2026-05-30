import { render, screen } from '@testing-library/react-native';

import { CoachCard } from '@/ui/primitives/CoachCard';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import type { DialingAdvice } from '@/domain/dialing';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

const sour: DialingAdvice = {
  verdict: 'sour',
  primary: { lever: 'grind-finer', magnitude: 'medium', text: 'Grind ~2 steps finer' },
  confidence: 'high',
  rationale: '1:2.0 · 22s · tastes sour → under-extracted (time agrees)',
};

describe('CoachCard', () => {
  it('renders the primary action and rationale for advice', () => {
    wrap(<CoachCard advice={sour} />);
    expect(screen.getByText('Grind ~2 steps finer')).toBeTruthy();
    expect(screen.getByText(/under-extracted/)).toBeTruthy();
  });

  it('shows the general espresso tip when advice is null', () => {
    wrap(<CoachCard advice={null} />);
    expect(screen.getByTestId('coach-empty-tip')).toBeTruthy();
  });

  it('marks low-confidence advice', () => {
    wrap(<CoachCard advice={{ ...sour, confidence: 'low' }} />);
    expect(screen.getByTestId('coach-low-confidence')).toBeTruthy();
  });

  it('renders a secondary suggestion when present', () => {
    wrap(
      <CoachCard
        advice={{
          verdict: 'dialed-in',
          primary: { lever: 'dialed-in', magnitude: 'small', text: 'Dialed in — nice shot' },
          secondary: { lever: 'ratio-up', text: 'To explore: try a longer ratio (e.g. 1:2.5)' },
          confidence: 'high',
          rationale: '1:2.0 · 27s — in the zone',
        }}
      />,
    );
    expect(screen.getByText(/longer ratio/)).toBeTruthy();
  });
});
