const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',  // 開発用は 'development', 本番用は 'production'
  entry: './src/scripts/game.ts',  // TypeScript のエントリファイル
  output: {
    filename: 'bundle.js',  // 出力ファイル名
    path: path.resolve(__dirname, 'dist'),  // 出力ファイルのディレクトリ
    publicPath: '/',  // 公開パス
  },
  module: {
    rules: [
      {
        test: /\.ts$/,  // .ts ファイルに適用
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpe?g|gif)$/i,  // 画像ファイルに適用
        type: 'asset/resource',  // file-loaderの代わりにasset/resourceを使用
        generator: {
          filename: 'assets/[name][ext]',  // 出力先のパスを指定
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],  // TypeScriptとJavaScriptの拡張子を解決
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',  // HTMLテンプレートファイル
      filename: 'index.html'
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),  // 以前のcontentBaseに相当
    },
    compress: true,
    port: 1234,
    historyApiFallback: true
  }
};