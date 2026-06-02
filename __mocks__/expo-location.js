// Jest mock for expo-location — no native geolocation in Node.
module.exports = {
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 0, longitude: 0 } })),
  getLastKnownPositionAsync: jest.fn(async () => null),
};
