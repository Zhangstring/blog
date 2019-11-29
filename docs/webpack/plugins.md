# Plugins

## 热更新

- webpack-dev-server

WDS 不刷新浏览器，不输出文件，而是存放在内存中，使用的是 HotModuleReplacementPlugin 插件

1. 开启 webpack-dev-server --open 命令
2. 在配置文件 webpack.config.js 中加入

```js
  devServer: {
    contentBase: './dist',
    hot: true
  }
```

## JS 压缩

webpack 内置 uglifyjs-webpack-plugin

## CSS 压缩

使用 optimize-css-webpack-plugin，同时使用 cssnano

## HTML 文件压缩

html-webpack-plugin 用于创建一个 html 文件

## 图片压缩

基于 node 库中 imagemin 或者 tinypng api，例如 image-webpack-loader,有点如下：

- 有很多定制选项
- 可以使用更多第三方优化插件，例如 pngquart
- 可以处理多种图片格式

imagemin 的压缩原理

- pngquant：是一款 png 压缩器，通过将图像转化为具有 alpha 通道（通常比 24/32 为 PNG 文件小 60%-80%）的更高效的 8 为 PNG 格式，可显著减少文件大小
- pngcrush：其主要目的是痛殴尝试不同的压缩级别和 PNG 过滤方法来降低 PNG IDAT 数据流的大小
- opting：其设计灵感来源于 pngcrush，opting 可讲图像重新压缩位更小的尺寸，而不丢失如何信息
- tinypng：也是将 24 为 png 文件转化为跟小有索引的 8 为图片，同时所有非必要的 metadata 也会被剥离掉

## 删除输出目录

clean-webpack-plugin 默认删除 output 的输出目录

## 去除无用 CSS

- PurifyCss:遍历代码，识别已经用到的 CSS class（不在维护）
- purgess-webpack-plugin 和 mini-css-extract-plugin 配合使用在 webpack4 中
- uncss：HTML 需要通过 jsDom 加载，所有的样式通过 PostCss 解析，通过 document.querySelector 来识别在 html 文件里面不存在的选择器

## 自动补全 CSS 前缀

使用 autoprefixer 插件和 postcss-loader，配置如下：

- rule 里添加 postcss-loader 处理 css 文件
- 新建 postcss.config.js 引入 autoprefixer

  ```
    module.exports = {
      plugins: [require('autoprefixer)]
    }
  ```

- package.json 中的 browserslist 添加浏览器规则或者 2 中的 require('autoprefixer')(...里面加添规则)

## 移动端 CSS px 自动转成 rem

使用 px2rem-loader 和 lib-flexble 库

## 资源内联

- 内联 HTML 和 JS 用 raw-loader
- css 内嵌
  - style-loader
  - html-inline-css-webpack-plugin

## 基础库分离

- html-webpack-externals-plugin:用于 cdn
- splitChunksPlugin

## 打包速度分析

使用 speed-measure-webpack-plugin，可以看到每个 loader 和插件执行耗时，作用：

- 分析整个打包总耗时
- 每个插件和 loader 的耗时情况

## 分析体积

使用 webpack-bundle-analyzer

- 分析依赖的第三方模块文件的大小
- 业务里面的组件代码大小

## 提升构建速度

### 多进程/多实例构建

- webpack3 使用 HappyPack，原理通过开多个 worker 线程
- webpack4 使用 thread-loader，原理 webpack 解析一个模块，thread-loader 会将它及它的依赖分配给 worker 线程中

### 并行压缩：多进程/多实例

- parallel-uglify-plugin
- uglifyjs-webpack-plugin 开启 parallel 参数，webpack3 采用，不支持 es6
- terser-webpack-plugin 开启 parallel 参数，webpack4 采用，支持 es6

### 缓存

提升二次构建速度，原理是上次构建的缓存到 node_modules 中

- babel-loader 开启缓存

```
  {
    loaders: ['babel-loader?cacheDirectory=true']
  }
```

- terser-webpack-plugin 开启缓存
- 使用 cache-loader 或者 hard-source-webpack-plugin
