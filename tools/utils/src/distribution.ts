import { PackageList, type PackageName } from './yarn';

export const PackageToDistribution = new Map<
  PackageName,
  BUILD_CONFIG_TYPE['distribution']
>([
  ['@affine/admin', 'admin'],
  ['@affine/web', 'web'],
  ['@affine/electron-renderer', 'desktop'],
  ['@affine/electron', 'desktop'],
  ['@affine/mobile', 'mobile'],
  ['@affine/ios', 'ios'],
  ['@affine/android', 'android'],
]);

export const AliasToPackage = new Map<string, PackageName>([
  ['@aevum/web', '@affine/web'],
  ['@affine/server', '@aevum/server' as any],
  ['@aevum/server', '@aevum/server' as any],
  ['aevum', '@affine/web'],
  ['aevum-web', '@affine/web'],
  ['aevum-server', '@aevum/server' as any],
  ['admin', '@affine/admin'],
  ['web', '@affine/web'],
  ['electron', '@affine/electron'],
  ['desktop', '@affine/electron-renderer'],
  ['renderer', '@affine/electron-renderer'],
  ['mobile', '@affine/mobile'],
  ['ios', '@affine/ios'],
  ['android', '@affine/android'],
  ['server', '@aevum/server' as any],
  ['gql', '@affine/graphql'],
  ...PackageList.map(
    pkg => [pkg.name.split('/').pop()!, pkg.name] as [string, PackageName]
  ),
]);
