// Jest mock for react-native-svg — native rendering is unavailable in Node.
// Every export is a View that forwards props so Lucide icons keep their
// testID / accessibilityLabel in the rendered tree.
const React = require('react');
const { View } = require('react-native');

const Stub = (name) => {
  const C = ({ children, ...props }) => React.createElement(View, props, children);
  C.displayName = name;
  return C;
};

const Svg = Stub('Svg');

module.exports = new Proxy(
  {
    __esModule: true,
    default: Svg,
    Svg,
    Path: Stub('Path'),
    Circle: Stub('Circle'),
    Rect: Stub('Rect'),
    Line: Stub('Line'),
    Polyline: Stub('Polyline'),
    Polygon: Stub('Polygon'),
    G: Stub('G'),
    Defs: Stub('Defs'),
    LinearGradient: Stub('LinearGradient'),
    Stop: Stub('Stop'),
  },
  {
    get: (target, prop) =>
      prop in target ? target[prop] : (target[prop] = Stub(String(prop))),
  },
);
