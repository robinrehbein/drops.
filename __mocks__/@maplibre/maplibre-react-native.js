// Jest mock for @maplibre/maplibre-react-native — native map view unavailable
// in Node. Renders plain Views so testIDs (map-view, map-marker, etc.) and
// children remain queryable in tests.
const React = require('react');
const { View } = require('react-native');

const Map = ({ children, style, testID }) =>
  React.createElement(View, { style, testID: testID || 'map-view' }, children);
const Camera = () => null;
const Marker = ({ children, testID, onPress }) =>
  React.createElement(View, { testID: testID || 'map-marker', onPress }, children);
const ViewAnnotation = ({ children, testID }) =>
  React.createElement(View, { testID }, children);
const Callout = ({ children }) => React.createElement(View, null, children);

module.exports = { __esModule: true, Map, Camera, Marker, ViewAnnotation, Callout };
