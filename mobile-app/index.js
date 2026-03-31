import 'expo-dev-client';
import Constants from 'expo-constants';

const executionEnvironment =
  Constants.executionEnvironment ||
  (Constants.appOwnership === 'expo' ? 'storeClient' : 'standalone');

if (executionEnvironment === 'storeClient') {
  const message = 'This app requires a Development Build. Expo Go is not supported.';
  console.error(message);
  throw new Error(message);
}

require('expo-router/entry');
