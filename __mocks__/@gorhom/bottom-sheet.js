// Jest mock for @gorhom/bottom-sheet — native sheet unavailable in Node.
// Sheets and their scroll/view containers render children inline as Views so
// content stays queryable. The modal renders children (open or not) so detail
// content is testable once mounted.
const React = require('react');
const { View, ScrollView, TouchableOpacity } = require('react-native');

const Passthrough = ({ children, testID }) => React.createElement(View, { testID }, children);
const Scroll = ({ children, testID }) => React.createElement(ScrollView, { testID }, children);

const BottomSheet = Passthrough;
const BottomSheetModal = Passthrough;
const BottomSheetModalProvider = ({ children }) => React.createElement(View, null, children);
const BottomSheetView = Passthrough;
const BottomSheetScrollView = Scroll;
const BottomSheetBackdrop = () => null;

module.exports = {
  __esModule: true,
  default: BottomSheet,
  BottomSheet,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  TouchableOpacity,
};
