import path from 'path'
import { Configuration } from 'webpack'
import CssMinimizerPlugin from "css-minimizer-webpack-plugin"
import TerserPlugin from 'terser-webpack-plugin'

import jsRule from './rules/jsRules'
import cssRule from './rules/cssRule'

import createWebpackEnv from './utils/createWebpackEnv'
import createWebpackPlugins from './utils/createWebpackPlugins'
import createWebpackPaths from './utils/createWebpackPaths'

import { WebpackArgs } from './types'

const PATH_ROOT = path.resolve(__dirname, '..', '..')

const createWebpackConfig = (args: WebpackArgs): Configuration => {
    const env = createWebpackEnv(args)
    const paths = createWebpackPaths(PATH_ROOT)

    return {
        mode: env.isProduction() ? 'production' : 'development',
        entry: paths.src,
        output: {
            chunkFilename: env.isProduction() ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
            path: paths.build,
            filename: env.isProduction() ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
            publicPath: '/',
            clean: true,
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', 'jsx'],
        },
        module: {
            rules: [jsRule, cssRule],
        },
        plugins: createWebpackPlugins(env, paths),
        devtool: env.isProduction() ? 'source-map' : 'cheap-module-source-map',
        cache: env.isProduction() ? false : true,
        optimization: {
            runtimeChunk: 'single',
            usedExports: true,
            sideEffects: true,
            splitChunks: {
                chunks: 'all',
                maxInitialRequests: 25,
                minSize: 20000,
                cacheGroups: {
                    react: {
                        test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
                        name: 'react',
                        chunks: 'all',
                        priority: 40,
                    },
                    lucide: {
                        test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
                        name: 'icons',
                        chunks: 'all',
                        priority: 30,
                    },
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                        priority: 20,
                    },
                },
            },
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    terserOptions: {
                        parse: {
                            ecma: 2020,
                        },
                        compress: {
                            ecma: 2020,
                            comparisons: false,
                            inline: 2,
                            drop_console: true,
                            drop_debugger: true,
                            pure_funcs: ['console.log', 'console.info', 'console.debug'],
                            passes: 2,
                        },
                        mangle: {
                            safari10: true,
                        },
                        output: {
                            ecma: 2020,
                            comments: false,
                            ascii_only: true,
                        },
                    },
                }),
                new CssMinimizerPlugin({
                    minimizerOptions: {
                        preset: [
                            'default',
                            {
                                discardComments: { removeAll: true },
                                normalizeWhitespace: true,
                            },
                        ],
                    },
                }),
            ],
            minimize: env.isProduction()
        },
        ...(env.isDevelopment() && {
            devServer: {
                compress: true,
                hot: true,
                port: 3000,
                historyApiFallback: true,
            },
        }),
    }
}

export default createWebpackConfig
