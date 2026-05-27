// Jest mock for @shopify/react-native-skia — JSI bindings unavailable in Node.
const React = require('react');
const { View } = require('react-native');

const Noop = () => null;

const Skia = {
  Path: {
    Make: () => ({
      moveTo: () => {},
      lineTo: () => {},
      close: () => {},
      addCircle: () => {},
    }),
  },
};

module.exports = {
  Canvas: ({ children, style }) => React.createElement(View, { style }, children),
  Path: Noop,
  Circle: Noop,
  Group: ({ children }) => React.createElement(React.Fragment, null, children),
  Skia,
};
