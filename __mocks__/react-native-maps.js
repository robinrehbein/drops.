// Jest mock for react-native-maps — native map view unavailable in Node.
const React = require('react');
const { View } = require('react-native');

const MapView = ({ children, style, testID }) =>
  React.createElement(View, { style, testID: testID || 'map-view' }, children);
const Marker = ({ children, testID }) =>
  React.createElement(View, { testID: testID || 'map-marker' }, children);
const Callout = ({ children }) => React.createElement(View, null, children);

module.exports = { __esModule: true, default: MapView, Marker, Callout, PROVIDER_GOOGLE: 'google' };
