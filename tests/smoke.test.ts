/**
 * Always-on infrastructure smoke test. Asserts that the Jest pipeline,
 * `setupFilesAfterEnv`, and `transformIgnorePatterns` all wire up cleanly.
 *
 * If this file fails, do NOT delete it — fix `jest.config.js` instead.
 */

describe('jest infra smoke test', () => {
  it('runs', () => {
    expect(1).toBe(1);
  });

  it('has the jest globals available (proves the framework is installed before setup runs)', () => {
    expect(typeof jest).toBe('object');
    expect(typeof beforeEach).toBe('function');
  });
});
