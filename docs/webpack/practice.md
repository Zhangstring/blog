# 实践

<img src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/webpack/1.png">

## 通用模块

entry 相同，output 不相同，因为在生成模式需要 hash 来缓存文件。对 js，图片，字体，vue 文件进行处理，由于开发和生产配置不同，就不放入通用，根据模版文件生成 html 文件，由于要单独分离样式文件，

```js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
module.exports = {
  entry: './src/main.js',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader'
      },
      {
        test: /\.(png|svs|jpg|gif)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              esModule: false
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              esModule: false
            }
          }
        ]
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    // 根据index.html模版生成html文件
    new HtmlWebpackPlugin({
      template: 'index.html'
    })
  ]
}
```

## 开发模式

主要是 2 个功能，1:开启 source-map 功能，2:开启热更新。

```js
const merge = require('webpack-merge')
const common = require('./webpack.common.js')
const webpack = require('webpack')
// 开启source-map
module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './dist',
    hot: true,
    open: true,
    progress: true,
    stats: 'minimal'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader']
      },
      {
        test: /\.s[ac]ss$/,
        use: ['vue-style-loader', 'css-loader', 'sass-loader']
      }
    ]
  },
  plugins: [new webpack.HotModuleReplacementPlugin()]
})
```

## 生产模式

`mode` 为 `production`，默认使用`TerserPlugin`进行压缩代码，开启 `source-map`。对生成的文件名 `contenthash`命名，用`splitChunks`对第三方代码进行分离，到`vendors`文件，使用`MiniCssExtractPlugin`分离 css 文件

```js
const merge = require('webpack-merge')
const common = require('./webpack.common.js')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const data = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  output: {
    filename: 'static/js/[name].[contenthash].js'
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.s[ac]ss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
      }
    ]
  },
  plugins: [
    // 清除dist目录
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash].css'
    })
  ]
})
module.exports = data
```
