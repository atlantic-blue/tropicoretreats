import { RuleSetRule } from 'webpack'
import MiniCssExtractPlugin from "mini-css-extract-plugin"

const cssRule: RuleSetRule = {
  test: /\.css$/i,
  use: [
    'style-loader',
    'css-loader',
    {
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins: [
            require('@tailwindcss/postcss'),
            require('autoprefixer'),
          ],
        },
      },
    },
  ],
};

export default cssRule;

