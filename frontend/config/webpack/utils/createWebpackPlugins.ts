import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from "mini-css-extract-plugin"
import path from 'path'
import webpack from 'webpack'
import { EnvironmentPlugin, WebpackPluginInstance } from 'webpack'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import Dotenv from "dotenv-webpack"

import { WebpackEnv, WebpackPaths } from '../types'

const createWebpackPlugins = (
    env: WebpackEnv,
    paths: WebpackPaths
): WebpackPluginInstance[] => {
    const plugins: WebpackPluginInstance[] = [
        new EnvironmentPlugin(env),
        new Dotenv() as any,

        /**
         * Provide HTML template
         */
        new HtmlWebpackPlugin({
            template: path.join(paths.root, 'public', 'index.html'),
        }),
        /**
         * Add assets to dist
         */
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(paths.root, 'public'),
                    to: path.join(paths.root, 'dist', 'public'),
                },
            ],
        }),

        /**
         * Add robots.txt
         */
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(paths.root, 'public', 'robots.txt'),
                    to: path.join(paths.root, 'dist'),
                },
            ],
        }),

        new MiniCssExtractPlugin({
            filename: "css/[name][contenthash].css",
        }),
    ]

    if (env.ANALYSE) {
        plugins.push(
            new BundleAnalyzerPlugin({
                openAnalyzer: true,
            }) as any
        )
    }

    if (env.isDevelopment()) {
        plugins.push(new webpack.HotModuleReplacementPlugin())
    }

    return plugins
}

export default createWebpackPlugins
