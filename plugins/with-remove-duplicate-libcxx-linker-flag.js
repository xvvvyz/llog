const { withXcodeProject } = require('@expo/config-plugins');

function removeDuplicateLibcxxFlag(flags) {
  if (!Array.isArray(flags)) {
    return flags;
  }

  return flags.filter((flag) => {
    if (typeof flag !== 'string') {
      return true;
    }

    return flag.replace(/^"|"$/g, '') !== '-lc++';
  });
}

module.exports = function withRemoveDuplicateLibcxxLinkerFlag(config) {
  return withXcodeProject(config, (config) => {
    const configurations = config.modResults.pbxXCBuildConfigurationSection();

    const shellScriptBuildPhases =
      config.modResults.hash.project.objects.PBXShellScriptBuildPhase;

    for (const value of Object.values(configurations)) {
      if (!value || typeof value !== 'object' || !value.buildSettings) {
        continue;
      }

      value.buildSettings.OTHER_LDFLAGS = removeDuplicateLibcxxFlag(
        value.buildSettings.OTHER_LDFLAGS
      );
    }

    for (const value of Object.values(shellScriptBuildPhases)) {
      if (
        !value ||
        typeof value !== 'object' ||
        typeof value.name !== 'string'
      ) {
        continue;
      }

      const phaseName = value.name.replace(/^"|"$/g, '');
      if (
        phaseName === '[Expo Dev Launcher] Strip Local Network Keys for Release'
      ) {
        value.alwaysOutOfDate = 1;
      }
    }

    return config;
  });
};
