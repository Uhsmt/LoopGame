const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin"); // CopyWebpackPluginをインポート
const webpack = require("webpack"); // これを追加
const isProduction = process.env.NODE_ENV === "production";
// itch.io は /html/<数字>/ 配下でゲームを配信するため、GitHub Pages 用の
// 絶対パス("/LoopGame/")のままだとアセットが全部 404 になる。
// DEPLOY_TARGET=itch のときだけ相対パスに切り替える。
const isItch = process.env.DEPLOY_TARGET === "itch";
const publicPath = isItch ? "auto" : isProduction ? "/LoopGame/" : "/";
const baseURL = isItch ? "" : isProduction ? "/LoopGame/" : "/";
// GitHub Pages 用の dist を上書きしないよう、itch ビルドは出力先を分ける。
const outputDir = isItch ? "dist-itch" : "dist";

module.exports = {
    mode: isProduction ? "production" : "development",
    entry: "./src/scripts/game.ts",
    output: {
        path: path.resolve(__dirname, outputDir),
        filename: "bundle.js",
        publicPath: publicPath,
        // 前回ビルドの残骸(削除済みアセット等)が混ざらないよう毎回出力先を空にする。
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: "ts-loader",
                    options: {
                        configFile: "tsconfig.build.json",
                    },
                },
                exclude: [/node_modules/, /tests/],
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
                {
                    from: "public/assets",
                    to: "assets",
                    // _generated はレビュー待ちの下書き置き場。採用したものだけ手動で
                    // public/assets へ移す運用なので、ビルド成果物には含めない。
                    globOptions: { ignore: ["**/_generated/**"] },
                },
                { from: "public/styles", to: "styles" }, // public/styles ディレクトリの内容を dist/styles にコピー
                { from: "favicon.ico", to: "" },
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
