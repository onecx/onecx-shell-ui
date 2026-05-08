import {
  ModuleFederationConfig,
  SharedLibraryConfig,
} from "@nx/module-federation";
import { getOneCXSharedRecommendations } from "@onecx/accelerator";

import * as pkg from "package.json";

// nx since 22.2.4 is not generating project graph with dependencies from package.json, so we need to manually add them as shared dependencies in the module federation config until its fixed. Removing this without the fix will cause several packages to not be included in remoteEntry file
const additionalShared = Object.keys(pkg.dependencies)
  .map((d) => {
    return {
      libraryName: d,
      sharedConfig: getOneCXSharedRecommendations(d, {}),
    };
  })
  .filter(
    (
      config,
    ): config is { libraryName: string; sharedConfig: SharedLibraryConfig } =>
      !!config.sharedConfig,
  );

console.log("aS", additionalShared);


const config: ModuleFederationConfig = {
  name: 'onecx-angular-21-loader',
  exposes: {
    ['./Angular21Loader']: 'src/main.ts'
  },
  shared: (libraryName, sharedConfig) => {
    const config = getOneCXSharedRecommendations(libraryName, sharedConfig)
    // Add custom shared configurations to the config object if needed
    return config
  },
  additionalShared: additionalShared
}

export default config;
