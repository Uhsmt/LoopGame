const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin'); // CopyWebpackPluginをインポート

const isProduction = process.env.NODE_ENV === 'production';
const publicPath = isProduction ? '/LoopGame/' : '/';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: './src/scripts/game.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: publicPath
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]'  // 画像ファイルをassetsフォルダに出力
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public/assets', to: 'assets' },  // public/assets ディレクトリの内容を dist/assets にコピー
        { from: 'public/styles', to: 'styles' }  // public/styles ディレクトリの内容を dist/styles にコピー
      ]
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    historyApiFallback: true,
    compress: true,
    port: 1234
  }
};
