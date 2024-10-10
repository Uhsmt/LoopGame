const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin"); // CopyWebpackPluginをインポート
const webpack = require("webpack"); // これを追加
const isProduction = process.env.NODE_ENV === "production";
const publicPath = isProduction ? "/LoopGame/" : "/";
const baseURL = isProduction ? "/LoopGame/" : "/";

module.exports = {
    mode: isProduction ? "production" : "development",
    entry: "./src/scripts/game.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
        publicPath: publicPath,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.(png|jpg|jpeg|gif)$/i,
                type: "asset/resource",
                generator: {
                    filename: "assets/[name][ext]", // 画像ファイルをassetsフォルダに出力
                },
            },
            {
                test: /\.css$/,
                use: [
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            url: (url, resourcePath) => {
                                // 本番環境の場合にBASE_URLをURLに追加
                                if (process.env.NODE_ENV === "production") {
                                    return `${process.env.BASE_URL}/${url}`;
                                }
                                return url;
                            },
                        },
                    },
                ],
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js", "json"],
        fallback: {
            fs: false,
            path: false,
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./index.html",
        }),
        new CopyPlugin({
            patterns: [
                { from: "public/assets", to: "assets" }, // public/assets ディレクトリの内容を dist/assets にコピー
                { from: "public/styles", to: "styles" }, // public/styles ディレクトリの内容を dist/styles にコピー
                { from: 'favicon.ico', to: 'dist' }               
            ],
        }),
        new webpack.DefinePlugin({
            BASE_URL: JSON.stringify(baseURL),
            DEBUG_MODE: process.env.DEBUG_MODE,
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, "public"),
        },
        historyApiFallback: true,
        compress: true,
        port: 1234,
    },
    stats: {
        errorDetails: true,
        children: true, // 子情報も詳細に出力する
    },
};
