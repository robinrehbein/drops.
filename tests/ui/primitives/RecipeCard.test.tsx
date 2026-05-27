import { render, screen } from '@testing-library/react-native';

import { RecipeCard } from '@/ui/primitives/RecipeCard';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import type { RecipeRow } from '@/features/recipes/types';

const now = new Date();
const recipe: RecipeRow = {
  id: 'r1',
  beanId: 'b1',
  sourceSessionId: null,
  doseG: 18,
  targetYieldG: 36,
  durationTargetS: 27,
  grinderLabel: 'Niche',
  grindSetting: '20',
  waterTempC: 93,
  ratioTarget: 2,
  notes: null,
  savedAt: now,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

describe('RecipeCard', () => {
  it('renders recipe values', () => {
    render(
      <ThemeProvider>
        <RecipeCard recipe={recipe} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('recipe-card')).toBeTruthy();
    expect(screen.getByText(/18.0 g Dose/)).toBeTruthy();
    expect(screen.getByText(/36.0 g Yield/)).toBeTruthy();
  });

  it('renders empty state when no recipe', () => {
    render(
      <ThemeProvider>
        <RecipeCard recipe={null} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('recipe-card-empty')).toBeTruthy();
    expect(screen.getByText(/No recipe yet/)).toBeTruthy();
  });
});
