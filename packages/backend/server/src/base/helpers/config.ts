import serverNativeModule from '@aevum/server-native';

import { defineNativeModuleConfig } from '../config';

declare global {
  interface AppConfigSchema {
    crypto: {
      privateKey: string;
    };
  }
}

defineNativeModuleConfig(
  'crypto',
  serverNativeModule.appConfigDescriptors('crypto'),
  serverNativeModule.validateAppConfigValue
);
