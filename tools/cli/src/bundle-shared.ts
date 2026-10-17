import type { Configuration as RspackDevServerConfiguration } from '@rspack/dev-server';

export const RSPACK_SUPPORTED_PACKAGES = [
  '@affine/admin',
  '@affine/web',
  '@aevum/web',
  '@affine/mobile',
  '@affine/ios',
  '@affine/android',
  '@affine/electron-renderer',
  '@affine/server',
  '@aevum/server',
  '@affine/reader',
] as const;

const rspackSupportedPackageSet = new Set<string>(RSPACK_SUPPORTED_PACKAGES);

export function isRspackSupportedPackageName(name: string) {
  return rspackSupportedPackageSet.has(name);
}

export function assertRspackSupportedPackageName(name: string) {
  if (isRspackSupportedPackageName(name)) {
    return;
  }

  throw new Error(
    `Rspack bundling currently supports: ${Array.from(RSPACK_SUPPORTED_PACKAGES).join(', ')}. Unsupported package: ${name}.`
  );
}

export const DEFAULT_DEV_SERVER_CONFIG: RspackDevServerConfiguration = {
  host: '0.0.0.0',
  allowedHosts: 'all',
  hot: true,
  liveReload: true,
  compress: !process.env.CI,
  setupExitSignals: true,
  client: {
    overlay: process.env.DISABLE_DEV_OVERLAY === 'true' ? false : undefined,
    logging: process.env.CI ? 'none' : 'error',
    // see: https://webpack.js.org/configuration/dev-server/#websocketurl
    // In Electron, custom protocols (e.g. assets://) need explicit ws endpoint.
    // In Web browser mode, omit webSocketURL so client connects to current window.location.port.
    webSocketURL:
      process.env.BUILD_TYPE === 'electron'
        ? 'ws://0.0.0.0:8080/ws'
        : undefined,
  },
  historyApiFallback: {
    rewrites: [
      {
        from: /.*/,
        to: () => {
          return process.env.SELF_HOSTED === 'true'
            ? '/selfhost.html'
            : '/index.html';
        },
      },
    ],
  },
  proxy: [
    {
      context: '/api',
      target: 'http://localhost:3010',
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    },
    {
      context: '/socket.io',
      target: 'http://localhost:3010',
      ws: true,
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    },
    {
      context: '/graphql',
      target: 'http://localhost:3010',
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    },
  ],
};
