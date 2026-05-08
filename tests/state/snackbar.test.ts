import { useSnackbarStore } from '@/state/snackbar';

describe('snackbar store', () => {
  beforeEach(() => useSnackbarStore.setState({ message: null, action: null }));

  it('show sets a message', () => {
    useSnackbarStore.getState().show('Hello');
    expect(useSnackbarStore.getState().message).toBe('Hello');
  });

  it('show with action stores both', () => {
    const onPress = jest.fn();
    useSnackbarStore.getState().show('Deleted', { label: 'Undo', onPress });
    expect(useSnackbarStore.getState().action?.label).toBe('Undo');
  });

  it('dismiss clears message and action', () => {
    useSnackbarStore.getState().show('Hi');
    useSnackbarStore.getState().dismiss();
    expect(useSnackbarStore.getState().message).toBeNull();
    expect(useSnackbarStore.getState().action).toBeNull();
  });
});
