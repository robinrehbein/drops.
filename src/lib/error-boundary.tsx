import { Component, type ReactNode } from 'react';
import { View } from 'react-native';

import { captureException } from './sentry';
import { Pill } from '@/ui/primitives/Pill';
import { Text } from '@/ui/primitives/Text';

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error): void {
    captureException(error);
  }
  reset = () => this.setState({ error: null });
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="title" align="center">Something went wrong</Text>
          <Text variant="caption" align="center" style={{ marginVertical: 12 }}>
            {this.state.error.message}
          </Text>
          <Pill label="Reload Drop" onPress={this.reset} />
        </View>
      );
    }
    return this.props.children;
  }
}
