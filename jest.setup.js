// AsyncStorage is a native module, so it throws the moment it is imported in a
// test. The package ships an in-memory stand-in; registering it here means any
// screen that reads or writes storage can be tested without each suite having
// to remember to mock it.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
