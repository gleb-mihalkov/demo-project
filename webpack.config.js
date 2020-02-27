const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const url = require('url');
const externals = require('webpack-node-externals');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const TsCheckerPlugin = require('fork-ts-checker-webpack-plugin');
const {
  NamedModulesPlugin,
  HotModuleReplacementPlugin,
  DefinePlugin
} = require('webpack');

/**
 * Настройка сборки происходит через переменные окружения.
 *
 * Настройки:
 *
 * NODE_ENV - Режим сборки проекта. По умолчанию 'development'.
 *
 * APP_SOURCE_PATH - Путь к каталогу с исходным кодом относительно корня
 * проекта. По умолчанию './src'.
 *
 * APP_OUTPUT_PATH - Путь к каталогу, в который происходит сборка, относительно
 * корня проекта. По умолчанию './public'.
 *
 * APP_PUBLIC_PATH - Путь к статическим файлам проекта, которые будут
 * скопированы в целевой каталог (APP_OUTPUT_PATH) без каких-либо изменений. По
 * умолчанию './public'.
 *
 * APP_BASE_URL - Адрес сайта (например, https://domain.com:8080/subpath). По
 * умолчанию 'http://localhost:8080'.
 *
 * APP_EXTENSIONS - Список расширений у файлов скриптов (например, .jsx,.js). По
 * умолчанию '.tsx,.ts,.jsx,.js'.
 *
 * APP_CLIENT_ENTRY - Имя точки сборки клиентской стороны сайта без расширения
 * относительно каталога с исходным кодом. По умолчанию './index'.
 *
 * APP_SERVER_ENTRY - Имя точки сборки серверной части сайта без расширения
 * относительно каталога с исходным кодом. По умолчанию './server/index'.
 *
 * process.env:
 *
 * NODE_ENV - Режим сборки проекта (development или production).
 *
 * APP_TARGET - Целевая среда сборки проекта (node или web).
 *
 * APP_ROOT_PATH - Абсолютный путь к корневому каталогу проекта.
 *
 * APP_SOURCE_PATH - Абсолютный путь к каталогу с исходным кодом.
 *
 * APP_OUTPUT_PATH - Абсолютный путь к каталогу, в который происходит сборка.
 *
 * APP_PUBLIC_PATH - Абсолютный путь к каталогу со статическими файлами сайта.
 *
 * APP_BASE_URL - Адрес сайта.
 *
 * APP_HTTPS - True, если сайт работает по протоколу https.
 *
 * APP_HOST - Имя хоста сайта.
 *
 * APP_PORT - Номер порта сайта.
 *
 * APP_PATHNAME - Базовый путь в URL сайта.
 *
 * APP_EXTENSIONS - Массив расширений у файлов скриптов.
 *
 * APP_ENTRY - Абсолютный путь к файла точки сборки сайта.
 *
 * APP_* - Прочие переменные окружения, чьё имя начинается с префикса 'APP_'.
 */

module.exports = (_, args) => {
  const defaultOptions = {
    NODE_ENV: 'development',
    APP_TARGET: 'web',
    APP_PUBLIC_PATH: './public',
    APP_OUTPUT_PATH: './build',
    APP_SOURCE_PATH: './src',
    APP_BASE_URL: 'http://localhost:8080',
    APP_EXTENSIONS: '.tsx,.ts,.jsx,.js',
    APP_CLIENT_ENTRY: './index',
    APP_SERVER_ENTRY: './server/index'
  };

  const filterEnv = env => {
    const test = name => name === 'NODE_ENV' || /^APP_$/.test(name);
    const fill = (result, name) => ({ ...result, [name]: env[name] });

    return Object.keys(env)
      .filter(test)
      .reduce(fill, {});
  };

  const parseEnv = file => dotenv.config({ path: file }).parsed;

  const parseNumber = value => {
    const number = Number(value);
    return Number.isNaN(number) ? undefined : number;
  };

  const parseArray = value =>
    value.split(',').map(item => item.replace(/^\s+|\s+$/g, ''));

  const findEntry = (extensions, name) =>
    extensions.map(extension => `${name}${extension}`).find(fs.existsSync);

  const target =
    process.env.APP_TARGET || args.target || defaultOptions.APP_TARGET;
  const mode = process.env.NODE_ENV || args.mode || defaultOptions.NODE_ENV;

  const systemEnv = filterEnv(process.env);
  const rootPath = __dirname;

  const fileEnv = filterEnv({
    ...parseEnv(path.join(rootPath, '.env')),
    ...parseEnv(path.join(rootPath, '.env.local')),
    ...parseEnv(path.join(rootPath, `.env.${mode}`)),
    ...parseEnv(path.join(rootPath, `.env.${mode}.local`))
  });

  const options = {
    ...defaultOptions,
    ...fileEnv,
    ...systemEnv
  };

  let baseUrl = url.parse(options.APP_BASE_URL);

  const protocol = baseUrl.protocol || 'http:';
  const pathname = baseUrl.pathname || '/';
  const hostname = baseUrl.hostname || 'localhost';
  const port = parseNumber(baseUrl.port || 80);
  const https = protocol === 'https:';

  baseUrl = `${protocol}//${hostname}:${port}${pathname}`
    .replace(/\/$/, '')
    .replace(/:80(\/.*)?$/, '$1');

  const sourcePath = path.resolve(rootPath, options.APP_SOURCE_PATH);
  const outputPath = path.resolve(rootPath, options.APP_OUTPUT_PATH);
  const publicPath = path.resolve(rootPath, options.APP_PUBLIC_PATH);

  const extensions = parseArray(options.APP_EXTENSIONS);

  const entry = findEntry(
    extensions,
    path.join(
      sourcePath,
      target === 'node' ? options.APP_SERVER_ENTRY : options.APP_CLIENT_ENTRY
    )
  );

  env = {
    ...fileEnv,
    ...systemEnv,
    APP_ROOT_PATH: rootPath,
    APP_TARGET: target,
    BABEL_ENV: mode,
    NODE_ENV: mode,
    APP_SOURCE_PATH: sourcePath,
    APP_OUTPUT_PATH: outputPath,
    APP_PUBLIC_PATH: publicPath,
    APP_BASE_URL: baseUrl,
    APP_HTTPS: https,
    APP_HOST: hostname,
    APP_PORT: port,
    APP_PATHNAME: pathname,
    APP_ENTRY: entry,
    APP_EXTENSIONS: extensions
  };

  const isDevelopment = mode === 'development';
  const isProduction = mode === 'production';
  const isNode = target === 'node';
  const isWeb = target === 'web';

  return {
    mode,
    target,
    context: rootPath,
    devtool: isDevelopment ? 'source-map' : undefined,
    externals: isNode ? [externals()] : undefined,
    stats: 'errors-warnings',
    entry: entry,
    output: {
      filename: isNode ? 'server.js' : '[name].[hash].js',
      path: outputPath,
      publicPath: pathname,
      libraryTarget: isNode ? 'commonjs2' : undefined,
      library: isNode ? 'main' : undefined
    },
    resolve: {
      extensions,
      modules: [sourcePath, path.resolve(rootPath, 'node_modules')],
      plugins: [
        new TsConfigPathsPlugin({
          configFile: path.resolve(rootPath, 'tsconfig.json')
        })
      ]
    },
    plugins: [
      new DefinePlugin(
        Object.keys(env).reduce(
          (previous, key) => ({
            ...previous,
            [`process.env.${key}`]: JSON.stringify(env[key])
          }),
          {}
        )
      ),
      new TsCheckerPlugin({
        tsconfig: path.resolve(rootPath, 'tsconfig.json'),
        reportFiles: path.relative(
          rootPath,
          path.join(sourcePath, '**/*.{ts,tsx}')
        ),
        silent: true
      }),
      ...(isDevelopment
        ? [new HotModuleReplacementPlugin(), new NamedModulesPlugin()]
        : []),
      ...(isWeb
        ? [
            new CopyPlugin([
              {
                from: publicPath,
                to: outputPath
              }
            ]),
            new CompressionPlugin(),
            new HtmlPlugin({
              template: path.resolve(publicPath, 'index.html')
            })
          ]
        : [])
    ]
  };
};
