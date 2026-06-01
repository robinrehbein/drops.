// Jest mock for @react-native-community/datetimepicker — native picker unavailable in Node.
const React = require('react');
const { View } = require('react-native');

module.exports = {
  __esModule: true,
  default: ({ testID }) => React.createElement(View, { testID: testID || 'date-picker' }),
};
