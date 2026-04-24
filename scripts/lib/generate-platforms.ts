export type AssetPlatform = 'android' | 'ios' | 'web';
export type AssetPlatformSelection = Record<AssetPlatform, boolean>;

const platformFlags = {
  '--android': 'android',
  '--ios': 'ios',
  '--web': 'web',
} as const satisfies Record<string, AssetPlatform>;

export function parseAssetPlatforms(
  args = process.argv.slice(2)
): AssetPlatformSelection {
  const selected: AssetPlatformSelection = {
    android: false,
    ios: false,
    web: false,
  };

  for (const arg of args) {
    if (arg === '--') continue;
    const platform = platformFlags[arg as keyof typeof platformFlags];

    if (platform == null) {
      throw new Error(
        `Unknown asset generation flag "${arg}". Expected --web, --ios, or --android.`
      );
    }

    selected[platform] = true;
  }

  if (!selected.android && !selected.ios && !selected.web) {
    return { android: true, ios: true, web: true };
  }

  return selected;
}

export function formatAssetPlatforms(platforms: AssetPlatformSelection) {
  return (['web', 'ios', 'android'] as const)
    .filter((platform) => platforms[platform])
    .join(', ');
}
