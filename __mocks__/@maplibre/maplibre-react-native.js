// Jest mock for @maplibre/maplibre-react-native — native map view unavailable
// in Node. Renders plain Views so testIDs (map-view, map-marker, etc.) and
// children remain queryable in tests.
const React = require('react');
const { View } = require('react-native');

// Renders children plus, when the map wires gesture tracking, a hidden node
// tests can press to simulate a user pan (userInteraction: true).
const Map = ({ children, style, testID, onRegionIsChanging }) =>
  React.createElement(
    View,
    { style, testID: testID || 'map-view' },
    onRegionIsChanging
      ? React.createElement(View, {
          key: '__pan__',
          testID: 'map-pan-gesture',
          onPress: () => onRegionIsChanging({ nativeEvent: { userInteraction: true } }),
        })
      : null,
    children,
  );
const Camera = () => null;
const Marker = ({ children, testID, onPress }) =>
  React.createElement(View, { testID: testID || 'map-marker', onPress }, children);
const ViewAnnotation = ({ children, testID }) =>
  React.createElement(View, { testID }, children);
const Callout = ({ children }) => React.createElement(View, null, children);
const UserLocation = () => React.createElement(View, { testID: 'user-location' });

module.exports = {
  __esModule: true,
  Map,
  Camera,
  Marker,
  ViewAnnotation,
  Callout,
  UserLocation,
};
