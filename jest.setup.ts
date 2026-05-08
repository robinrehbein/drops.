// Silence noisy logs in unit tests; per-test code may override.
jest.spyOn(console, 'error').mockImplementation(() => undefined);
