// Jest mock for react-native-gesture-handler — native gestures unavailable in
// Node. GestureHandlerRootView passes through; the rest are inert stubs.
const React = require('react');
const { View } = require('react-native');

const GestureHandlerRootView = ({ children, style, testID }) =>
  React.createElement(View, { style, testID }, children);

module.exports = {
  __esModule: true,
  GestureHandlerRootView,
  gestureHandlerRootHOC: (c) => c,
  Gesture: { Pan: () => ({}), Tap: () => ({}) },
  GestureDetector: ({ children }) => children,
};
