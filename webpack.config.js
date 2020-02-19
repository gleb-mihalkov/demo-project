const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const url = require('url');
const externals = require('webpack-node-externals');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = (_, args) => {
  const defaultEnv = {
    NODE_ENV: 'development',
    APP_TARGET: 'web',
    APP_PUBLIC_DIR: 'public',
    APP_OUTPUT_DIR: 'build',
    APP_SOURCE_DIR: 'src',
    APP_BASE_URL: 'http://localhost:8080',
    APP_EXTENSIONS: '.tsx,.ts,.jsx,.js'
  };

  const filterEnv = env => {
    const test = name => name === 'NODE_ENV' || /^APP_$/.test(name);
    const fill = (result, name) => ({ ...result, [name]: env[name] });

    return Object.keys(env)
      .filter(test)
      .reduce(fill, {});
  };

  const parseEnv = file => dotenv.config({ path: file }).parsed;

  const parseBoolean = value => {
    const text = String(value).toLowerCase();
    return text !== 'false' && text !== '0' && text !== 'off' && Boolean(value);
  };

  const parseNumber = value => {
    const number = Number(value);
    return Number.isNaN(number) ? undefined : number;
  };

  const parseArray = value =>
    value.split(',').map(item => item.replace(/^\s+|\s+$/g, ''));

  let env = filterEnv(process.env);

  const target = env.APP_TARGET || args.target || defaultEnv.APP_TARGET;
  const mode = env.NODE_ENV || args.mode || defaultEnv.NODE_ENV;

  env = {
    ...env,
    APP_ROOT_PATH: __dirname,
    APP_TARGET: target,
    BABEL_ENV: mode,
    NODE_ENV: mode
  };

  env = {
    ...parseEnv(path.join(env.APP_ROOT_PATH, '.env')),
    ...parseEnv(path.join(env.APP_ROOT_PATH, '.env.local')),
    ...parseEnv(path.join(env.APP_ROOT_PATH, `.env.${mode}`)),
    ...parseEnv(path.join(env.APP_ROOT_PATH, `.env.${mode}.local`)),
    ...env
  };

  let baseUrl;
  let protocol;
  let https;
  let host;
  let hostname;
  let port;
  let pathname;

  if (env.APP_BASE_URL) {
    baseUrl = url.parse(env.APP_BASE_URL);

    protocol = baseUrl.protocol;
    https = protocol === 'https:';
    host = baseUrl.host;
    hostname = baseUrl.hostname;
    port = parseNumber(baseUrl.port);
    pathname = baseUrl.pathname;
  } else {
    if (env.APP_URL_HTTPS) {
      https = parseBoolean(env.APP_ENV_HTTPS);
      protocol = https ? 'https:' : 'http';
    } else {
      protocol = env.APP_URL_PROTOCOL || 'http:';
      https = protocol === 'https:';
    }

    if (env.APP_URL_HOST) {
      host = env.APP_URL_HOST.split(':');
      hostname = host[0];
      port = parseNumber(host[1]) || 80;
    } else {
      hostname = env.APP_URL_HOSTNAME || 'localhost';
      port = parseNumber(env.APP_URL_PORT) || 8080;
    }

    host = `${hostname}${port !== 80 ? `:${port}` : ''}`;
    pathname = env.APP_URL_PATHNAME || '/';
  }

  baseUrl = `${protocol}//${host}${pathname !== '/' ? pathname : ''}`;

  env = {
    ...env,
    APP_BASE_URL: baseUrl,
    APP_HTTPS: https,
    APP_URL_PROTOCOL: protocol,
    APP_URL_HOST: host,
    APP_URL_HOSTNAME: hostname,
    APP_URL_PORT: port,
    APP_URL_PATHNAME: pathname
  };

  let publicPath;
  let sourcePath;
  let outputPath;
  let publicDir;
  let sourceDir;
  let outputDir;

  if (env.APP_PUBLIC_PATH) {
    publicPath = env.APP_PUBLIC_PATH;
    publicDir = path.relative(env.APP_ROOT_PATH, publicPath);
  } else {
    publicDir = env.APP_PUBLIC_DIR || defaultEnv.APP_PUBLIC_DIR;
    publicPath = path.resolve(env.APP_ROOT_PATH, publicDir);
  }
  if (env.APP_SOURCE_PATH) {
    sourcePath = env.APP_SOURCE_PATH;
    sourceDir = path.relative(env.APP_ROOT_PATH, sourcePath);
  } else {
    sourceDir = env.APP_SOURCE_DIR || defaultEnv.APP_SOURCE_DIR;
    sourcePath = path.resolve(env.APP_ROOT_PATH, sourceDir);
  }
  if (env.APP_OUTPUT_PATH) {
    outputPath = env.APP_OUTPUT_PATH;
    outputDir = path.relative(env.APP_ROOT_PATH, outputPath);
  } else {
    outputDir = env.APP_OUTPUT_DIR || defaultEnv.APP_OUTPUT_DIR;
    outputPath = path.resolve(env.APP_ROOT_PATH, outputDir);
  }

  env = {
    ...env,
    APP_SOURCE_PATH: sourcePath,
    APP_OUTPUT_PATH: outputPath,
    APP_PUBLIC_PATH: publicPath,
    APP_SOURCE_DIR: sourceDir,
    APP_OUTPUT_DIR: outputDir,
    APP_PUBLIC_DIR: publicDir
  };

  const extensions = env.APP_EXTENSIONS || defaultEnv.APP_EXTENSIONS;

  env = {
    ...env,
    APP_EXTENSIONS: extensions,
    APP_EXTENSIONS_LIST: parseArray(extensions)
  };

  env.APP_ENTRY = env.APP_EXTENSIONS_LIST.reduce(
    (result, extension) =>
      env.APP_TARGET === 'node'
        ? [
            ...result,
            `server${extension}`,
            `server${path.sep}index${extension}`
          ]
        : [...result, `index${extension}`],
    []
  )
    .map(file => path.join(env.APP_SOURCE_PATH, file))
    .find(fs.existsSync);

  return {
    mode: env.NODE_ENV,
    target: env.APP_TARGET,
    context: env.APP_ROOT_PATH,
    externals: env.APP_TARGET === 'node' ? [externals()] : undefined,
    devtool: env.NODE_ENV === 'development' ? 'source-map' : undefined,
    stats: { children: false },
    entry: { main: env.APP_ENTRY },
    output: {
      filename:
        env.APP_TARGET === 'node' ? 'server.js' : '[name].[chunkhash].js',
      path: env.APP_OUTPUT_PATH,
      publicPath: env.APP_URL_PATHNAME,
      library: env.APP_TARGET === 'node' ? 'main' : undefined,
      libraryTarget: env.APP_TARGET === 'node' ? 'commonjs2' : undefined
    },
    resolve: {
      extensions: env.APP_EXTENSIONS_LIST,
      plugins: [
        new TsConfigPathsPlugin({
          configFile: path.join(env.APP_ROOT_PATH, 'tsconfig.json')
        })
      ]
    }
  };
};
