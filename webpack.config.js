//@ts-check

'use strict';

const path = require('path');

/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // Target Node.js for the extension runtime
  mode: 'none', // Leave unminified for easier debugging during development
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2', // VS Code uses CommonJS for extensions
  },
  externals: {
    vscode: 'commonjs vscode', // Prevent bundling the VS Code module
  },
  resolve: {
    // alias: {
    //   '@vscode/webview-ui-toolkit': path.resolve(
    //     __dirname,
    //     'node_modules',
    //     '@vscode',
    //     'webview-ui-toolkit'
    //   ),
    // },
    extensions: [".ts", ".js", ".tsx", ".jsx"], // Support TS and JSX/TSX
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [{ loader: 'ts-loader' }], // Use ts-loader for TypeScript
      },
    ],
  },
  devtool: 'source-map', // Generate source maps for easier debugging
  infrastructureLogging: {
    level: 'log',
  },
};

/** @type WebpackConfig */
const webviewConfig = {
  target: 'web', // Target browsers for the webview
  mode: 'production', // Minify and optimize for production
  entry: './src/webview/App.tsx', // Entry point for the React webview
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'webview.js',
    libraryTarget: 'module', // Use ECMAScript modules for modern browsers
  },
  externals :{
    vscode:"vscode",// Add ReactDOM as external
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx'], // Support TS and JSX/TSX
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [{ loader: 'ts-loader' }], // Use ts-loader for TypeScript
      },
    ],
  },
  experiments: {
    outputModule: true, // Enable ECMAScript module output
  },
  devtool: 'nosources-source-map', // Avoid exposing original source in production
};

module.exports = [extensionConfig, webviewConfig];
