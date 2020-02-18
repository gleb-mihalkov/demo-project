const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const externals = require('webpack-node-externals');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

/**
 * Преобразует строковое значение в логическое.
 * @param  {String} value Значение.
 * @return {Boolean}       Логическое значение.
 */
const parseBoolean = value => {
  const text = String(value).toLowerCase();
  return text !== 'false' && text !== '0' && text !== 'off' && Boolean(value);
};

/**
 * Преобразует строковое значение в число.
 * @param  {String} value Строка.
 * @return {Number}       Число.
 */
const parseNumber = value => {
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
};

/**
 * Возвращает первый из аргументов, который нельзя привести к null.
 * @param  {any[]} args Массив значений.
 * @return {any}        Значение.
 */
const getFirstDefined = (...args) => args.find(value => value != null);

module.exports = (_, args) => {
  const byRoot = (...args) => path.resolve(__dirname, ...args);

  const mode = getFirstDefined(process.env.NODE_ENV, args.mode, 'development');
  const target = getFirstDefined(process.env.APP_TARGET, args.target, 'web');

  const parseEnv = name => dotenv.config({ path: byRoot(name) }).parsed;

  const fileEnv = {
    ...parseEnv('.env'),
    ...parseEnv('.env.local'),
    ...parseEnv(`.env.${mode}`),
    ...parseEnv(`.env.${mode}.local`)
  };

  const systemEnv = Object.keys(process.env)
    .filter(key => /^APP_/.test(key))
    .reduce((env, key) => ({ ...env, [key]: process.env[key] }), {});

  const https = parseBoolean(
    getFirstDefined(systemEnv.APP_HTTPS, args.https, fileEnv.APP_HTTPS, false)
  );
  const host = getFirstDefined(
    systemEnv.APP_HOST,
    args.host,
    fileEnv.APP_HOST,
    'localhost'
  );
  const port = parseNumber(
    getFirstDefined(systemEnv.APP_PORT, args.port, fileEnv.APP_PORT, 8080)
  );
  const protocol = https ? 'https' : 'http';

  let pathname = getFirstDefined(
    systemEnv.APP_PATHNAME,
    args.pathname,
    fileEnv.APP_PATHNAME,
    '/'
  );

  if (pathname !== '/') {
    pathname = pathname.replace(/\/$/, '');
  }

  let baseUrl = `${protocol}://${host}`;

  if (port !== 80) {
    baseUrl += `:${port}`;
  }

  if (pathname !== '/') {
    baseUrl += pathname;
  }

  const publicFolder = getFirstDefined(
    systemEnv.APP_PUBLIC,
    args.public,
    fileEnv.APP_PUBLIC,
    'public'
  );
  const outputFolder = getFirstDefined(
    systemEnv.APP_OUTPUT,
    args.output,
    fileEnv.APP_OUTPUT,
    'build'
  );
  const sourceFolder = getFirstDefined(
    systemEnv.APP_SOURCE,
    args.source,
    fileEnv.APP_SOURCE,
    'src'
  );
  const byOutput = (...args) => byRoot(outputFolder, ...args);
  const bySource = (...args) => byRoot(sourceFolder, ...args);
  const byPublic = (...args) => byRoot(publicFolder, ...args);
  const byPathname = (...args) => path.join(pathname, ...args);

  const isProd = mode === 'production';
  const isDev = mode === 'development';
  const isNode = target === 'node';
  const isWeb = target === 'web';

  const exts = ['.tsx', '.ts', '.jsx', '.js'];

  const entryName = isWeb ? '' : 'server';
  const entry = exts
    .reduce((list, ext) => {
      const self = entryName && `${entryName}.${ext}`;
      const file = `${entryName}${entryName ? '/' : ''}index${ext}`;
      const item = [self, file].filter(Boolean).map(file => bySource(file));
      return [...list, ...item];
    }, [])
    .find(fs.existsSync);

  const env = {
    ...systemEnv,
    ...fileEnv,
    NODE_ENV: mode,
    APP_TARGET: target,
    APP_SOURCE: byOutput(),
    APP_OUTPUT: bySource(),
    APP_PUBLIC: byPublic(),
    APP_HOST: host,
    APP_PORT: port,
    APP_PATHNAME: pathname,
    APP_BASE_URL: baseUrl,
    APP_ENTRY: entry
  };

  return {
    mode,
    target,
    context: byRoot(),
    externals: isNode ? [externals()] : undefined,
    devtool: isDev ? 'source-map' : undefined,
    stats: { children: false },
    entry: { main: entry },
    output: {
      filename: isNode ? 'server.js' : '[name].[chunkhash].js',
      path: byOutput(),
      publicPath: byPathname(),
      library: isNode ? 'main' : undefined,
      libraryTarget: isNode ? 'commonjs2' : undefined
    },
    resolve: {
      extensions: exts,
      plugins: [
        new TsConfigPathsPlugin({ configFile: byRoot('tsconfig.json') })
      ]
    }
  };
};
