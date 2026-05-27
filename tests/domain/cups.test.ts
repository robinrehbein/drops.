import { cupsTowardGoal } from '@/domain/cups';

describe('cupsTowardGoal', () => {
  it('none yet', () => {
    expect(cupsTowardGoal(0, 4)).toEqual({ filled: 0, total: 4, overshoot: 0 });
  });
  it('partway', () => {
    expect(cupsTowardGoal(2, 4)).toEqual({ filled: 2, total: 4, overshoot: 0 });
  });
  it('exactly goal', () => {
    expect(cupsTowardGoal(4, 4)).toEqual({ filled: 4, total: 4, overshoot: 0 });
  });
  it('overshoot', () => {
    expect(cupsTowardGoal(6, 4)).toEqual({ filled: 4, total: 4, overshoot: 2 });
  });
  it('coerces goal below 1 to 1', () => {
    expect(cupsTowardGoal(0, 0)).toEqual({ filled: 0, total: 1, overshoot: 0 });
  });
  it('coerces negative shots to 0 and floors fractionals', () => {
    expect(cupsTowardGoal(-3, 4)).toEqual({ filled: 0, total: 4, overshoot: 0 });
    expect(cupsTowardGoal(2.9, 4.9)).toEqual({ filled: 2, total: 4, overshoot: 0 });
  });
});
