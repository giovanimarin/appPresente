// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require('module');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const projectRoot = __dirname;

// Garante que nativewind (no root) consiga encontrar react-native (no mobile)
// adicionando apps/mobile/node_modules ao NODE_PATH antes do require
process.env.NODE_PATH = [
  path.resolve(projectRoot, 'node_modules'),
  process.env.NODE_PATH,
].filter(Boolean).join(path.delimiter);
Module._initPaths();

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(projectRoot);

// Intercepta resoluções de react/react-native para evitar conflito com
// React 18 do root do monorepo (web usa 18, mobile usa 19)
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts ?? []), 'css'],
  resolveRequest: (context, moduleName, platform) => {
    if (
      moduleName === 'react' ||
      moduleName === 'react-native' ||
      moduleName.startsWith('react/') ||
      moduleName.startsWith('react-native/')
    ) {
      const resolved = require.resolve(moduleName, {
        paths: [path.resolve(projectRoot, 'node_modules')],
      });
      return { filePath: resolved, type: 'sourceFile' };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
