const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const externals = require('webpack-node-externals');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = (_, args) => {
  const bln = value => {
    const text = String(value).toLowerCase();
    return text !== 'false' && text !== '0' && text !== 'off' && Boolean(value);
  };

  const nbr = value => {
    const item = Number(value);
    return Number.isNaN(item) ? undefined : item;
  };

  const fst = (...args) => args.find(item => item !== undefined);
  const rt = (...args) => path.resolve(__dirname, ...args);

  const mode = fst(process.env.NODE_ENV, args.mode, 'development');
  const target = fst(process.env.APP_TARGET, args.target, 'web');

  const cmEnv = dotenv.config({ path: rt(`.env.${mode}`) }).parsed;
  const cEnv = dotenv.config({ path: rt('.env') }).parsed;
  const lmEnv = dotenv.config({ path: rt(`.env.${mode}.local`) }).parsed;
  const lEnv = dotenv.config({ path: rt('.env.local') }).parsed;
  const fEnv = { ...cEnv, ...lEnv, ...cmEnv, ...lmEnv };

  const sEnv = Object.keys(process.env)
    .filter(key => /^APP_/.test(key))
    .reduce((env, key) => ({ ...env, [key]: process.env[key] }), {});

  const https = bln(fst(sEnv.APP_HTTPS, args.https, fEnv.APP_HTTPS, false));
  const host = fst(sEnv.APP_HOST, args.host, fEnv.APP_HOST, 'localhost');
  const port = nbr(fst(sEnv.APP_PORT, args.port, fEnv.APP_PORT, 8080));
  const protocol = https ? 'https' : 'http';

  let pathname = fst(sEnv.APP_PATHNAME, args.pathname, fEnv.APP_PATHNAME, '/');

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

  const pblDir = fst(sEnv.APP_PUBLIC, args.public, fEnv.APP_PUBLIC, 'public');
  const dstDir = fst(sEnv.APP_OUTPUT, args.output, fEnv.APP_OUTPUT, 'build');
  const srcDir = fst(sEnv.APP_SOURCE, args.source, fEnv.APP_SOURCE, 'src');
  const dst = (...args) => rt(dstDir, ...args);
  const src = (...args) => rt(srcDir, ...args);
  const pbl = (...args) => rt(pblDir, ...args);
  const pth = (...args) => path.join(pathname, ...args);

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
      const item = [self, file].filter(Boolean).map(file => src(file));
      return [...list, ...item];
    }, [])
    .find(fs.existsSync);

  const env = {
    ...sEnv,
    ...fEnv,
    NODE_ENV: mode,
    APP_TARGET: target,
    APP_SOURCE: dst(),
    APP_OUTPUT: src(),
    APP_PUBLIC: pbl(),
    APP_HOST: host,
    APP_PORT: port,
    APP_PATHNAME: pathname,
    APP_BASE_URL: baseUrl,
    APP_ENTRY: entry
  };

  return {
    mode,
    target,
    context: rt(),
    externals: isNode ? [externals()] : undefined,
    devtool: isDev ? 'source-map' : undefined,
    stats: { children: false },
    entry: { main: entry },
    output: {
      filename: isNode ? 'server.js' : '[name].[chunkhash].js',
      path: dst(),
      publicPath: pth(),
      library: isNode ? 'main' : undefined,
      libraryTarget: isNode ? 'commonjs2' : undefined
    },
    resolve: {
      extensions: exts,
      plugins: [new TsConfigPathsPlugin({ configFile: rt('tsconfig.json') })]
    }
  };
};
