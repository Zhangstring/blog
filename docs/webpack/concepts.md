# 概念

## 开始

webpack 默认配置文件:webpack.config.js。可以通过 webpack --config 指定配置文件。

## mode

用来指定当前构建环境是：none、development 或者 production
设置 mode 可以使用 webpack 内置函数，mode 默认值 production

- development

  - 开启 NamedChunkPlugin（固化 chunk id）
  - NamedModulesPlugin（固化 module id）

相当于默认内置了

```js
// webpack.dev.config.js
module.exports = {
  devtool: 'eval',
  cache: true,
  performance: {
    // 性能设置,文件打包过大时，不报错和警告，只做提示
    hints: false
  },
  output: {
    // 打包时，在包中包含所属模块的信息的注释
    pathinfo: true
  },
  optimization: {
    // 使用可读的模块标识符进行调试
    namedModules: true,
    // 使用可读的块标识符进行调试
    namedChunks: true,
    // 设置 process.env.NODE_ENV 为 development
    nodeEnv: 'development',
    // 不标记块是否是其它块的子集
    flagIncludedChunks: false,
    // 不标记模块的加载顺序
    occurrenceOrder: false,
    // 不启用副作用
    sideEffects: false,
    usedExports: false,
    concatenateModules: false,
    splitChunks: {
      hidePathInfo: false,
      minSize: 10000,
      maxAsyncRequests: Infinity,
      maxInitialRequests: Infinity
    },
    // 当打包时，遇到错误编译，仍把打包文件输出
    noEmitOnErrors: false,
    checkWasmTypes: false,
    // 不使用 optimization.minimizer || TerserPlugin 来最小化包
    minimize: false,
    removeAvailableModules: false
  },
  plugins: [
    // 当启用 HMR 时，使用该插件会显示模块的相对路径
    // 建议用于开发环境
    new webpack.NamedModulesPlugin(),
    // webpack 内部维护了一个自增的 id，每个 chunk 都有一个 id。
    // 所以当增加 entry 或者其他类型 chunk 的时候，id 就会变化，
    // 导致内容没有变化的 chunk 的 id 也发生了变化
    // NamedChunksPlugin 将内部 chunk id 映射成一个字符串标识符（模块的相对路径）
    // 这样 chunk id 就稳定了下来
    new webpack.NamedChunksPlugin(),
    // 定义环境变量
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development')
    })
  ]
}
```

- production

  - 开启 FlagDependencyUsagePlugin（编译时标记依赖），
  - FlagIncludedChunksPlugin（标记子 chunks，防子 chunks 多次加载），
  - ModuleConcatenationPlugin（作用域提升(scope hosting),预编译功能,提升或者预编译所有模块到一个闭包中，提升代码在浏览器中的执行速度），
  - NoEmitOnErrorPlugin（在输出阶段时，遇到编译错误跳过），
  - OccurrenceOrderPlugin（给经常使用的 ids 更短的值），
  - SideEffectsFlagPlugin（识别 package.json 或者 module.rules 的 sideEffects 标志（纯的 ES2015 模块)，安全地删除未用到的 export 导出）
  - TerserPlugin（压缩 js 代码）

相当于默认内置了

```js
module.exports = {
  performance: {
    // 性能设置,文件打包过大时，会报警告
    hints: 'warning'
  },
  output: {
    // 打包时，在包中不包含所属模块的信息的注释
    pathinfo: false
  },
  optimization: {
    // 不使用可读的模块标识符进行调试
    namedModules: false,
    // 不使用可读的块标识符进行调试
    namedChunks: false,
    // 设置 process.env.NODE_ENV 为 production
    nodeEnv: 'production',
    // 标记块是否是其它块的子集
    // 控制加载块的大小（加载较大块时，不加载其子集）
    flagIncludedChunks: true,
    // 标记模块的加载顺序，使初始包更小
    occurrenceOrder: true,
    // 启用副作用
    sideEffects: true,
    // 确定每个模块的使用导出，
    // 不会为未使用的导出生成导出
    // 最小化的消除死代码
    // optimization.usedExports 收集的信息将被其他优化或代码生成所使用
    usedExports: true,
    // 查找模块图中可以安全的连接到其它模块的片段
    concatenateModules: true,
    // SplitChunksPlugin 配置项
    splitChunks: {
      // 默认 webpack4 只会对按需加载的代码做分割
      chunks: 'async',
      // 表示在压缩前的最小模块大小,默认值是30kb
      minSize: 30000,
      minRemainingSize: 0,
      // 旨在与HTTP/2和长期缓存一起使用
      // 它增加了请求数量以实现更好的缓存
      // 它还可以用于减小文件大小，以加快重建速度。
      maxSize: 0,
      // 分割一个模块之前必须共享的最小块数
      minChunks: 1,
      // 按需加载时的最大并行请求数
      maxAsyncRequests: 6,
      // 入口的最大并行请求数
      maxInitialRequests: 4,
      // 界定符
      automaticNameDelimiter: '~',
      // 块名最大字符数
      automaticNameMaxLength: 30,
      cacheGroups: {
        // 缓存组
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    },
    // 当打包时，遇到错误编译，将不会把打包文件输出
    // 确保 webpack 不会输入任何错误的包
    noEmitOnErrors: true,
    checkWasmTypes: true,
    // 使用 optimization.minimizer || TerserPlugin 来最小化包
    minimize: true
  },
  plugins: [
    // 使用 terser 来优化 JavaScript
    new TerserPlugin(/* ... */),
    // 定义环境变量
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    // 预编译所有模块到一个闭包中，提升代码在浏览器中的执行速度
    new webpack.optimize.ModuleConcatenationPlugin(),
    // 在编译出现错误时，使用 NoEmitOnErrorsPlugin 来跳过输出阶段。
    // 这样可以确保输出资源不会包含错误
    new webpack.NoEmitOnErrorsPlugin()
  ]
}
```

- none

  - 不开启任何优化选项

相当于内置了

```js
module.exports = {
  performance: {
    // 性能设置,文件打包过大时，不报错和警告，只做提示
    hints: false
  },
  optimization: {
    // 不标记块是否是其它块的子集
    flagIncludedChunks: false,
    // 不标记模块的加载顺序
    occurrenceOrder: false,
    // 不启用副作用
    sideEffects: false,
    usedExports: false,
    concatenateModules: false,
    splitChunks: {
      hidePathInfo: false,
      minSize: 10000,
      maxAsyncRequests: Infinity,
      maxInitialRequests: Infinity
    },
    // 当打包时，遇到错误编译，仍把打包文件输出
    noEmitOnErrors: false,
    checkWasmTypes: false,
    // 不使用 optimization.minimizer || TerserPlugin 来最小化包
    minimize: false
  },
  plugins: []
}
```

三种模式对比

|                                                                                                                                            mode                                                                                                                                             |                                  production                                   |                        development                        | none |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------: | :-------------------------------------------------------: | :--: |
|                                                                                                                                    process.env.NODE_ENV                                                                                                                                     |                                  production                                   |                        development                        | none |
|                                                                                                                      devtool（控制是否⽣成，以及如何⽣成 source map）                                                                                                                       |                                      no                                       |       eval (打包更慢，包体积更大；但更好的调试体验)       |  no  |
|                                                                                                     cache（缓存模块，避免在未更改时重新构建它们，改善构建速度，只在 watch 模式下有⽤）                                                                                                      |                                      no                                       |            yes（内存占⽤更多；更快的增量打包）            |  no  |
|                                                                                                                        output.pathinfo(输出包中是否包含模块注释信息)                                                                                                                        |                                      no                                       |    yes(包更大，并且泄露路径信息；提高了包代码的可读性)    |  no  |
|                                                                                                                                    performance(性能设置)                                                                                                                                    |                       yes（算法成本；包过大时，会警告）                       |                            no                             |  no  |
|                                                                                                       optimization.removeAvailableModules（删除已可⽤模块； 算法成本；减⼩包体积；）                                                                                                        |                                      yes                                      |                            yes                            | yes  |
|                                                                                                             optimization.removeEmptyChunks（删除空模块;算法成本；减⼩包体积；）                                                                                                             |                                      yes                                      |                            yes                            | yes  |
|                                                                                                        optimization.mergeDuplicateChunks（合并相等块;算法成本；更少的请求与下载；）                                                                                                         |                                      yes                                      |                            yes                            | yes  |
|                                                                                         optimization.flagIncludedChunks（标记块是否是其它块的⼦集， 控制加载块的⼤⼩，加载较⼤块时，不加载其⼦集）                                                                                          |                      yes（算法成本；更少的请求与下载；）                      |                            no                             |  no  |
|                                                                                                              optimization.occurrenceOrder（标记模块的加载顺序，使初始包更⼩）                                                                                                               |                        yes（算法成本；更⼩的包体积；）                        |                            no                             |  no  |
|                                                                                               optimization.providedExports（尽可能确定每个模块的导出信息;算法成本；包体积及其它优化的需求；）                                                                                               |                                      yes                                      |                            yes                            | yes  |
|                                                                                           optimization.usedExports(不会为未使⽤的导出⽣成导出，最⼩化的消除死代码，可被其他优化或代码⽣成所使⽤)                                                                                            |                         yes(算法成本；更⼩的包体积；)                         |                            no                             |  no  |
| optimization.sideEffects（识别 package.json 或者 module.rules 的 sideEffects 标志（纯的 ES2015 模块)，安全地删除未⽤到的 export 导出。 这取决于 optimization.providedExports 和 optimization.usedExports。 这些依赖性有⼀定的成本，但是由于减少了代码⽣成，因此消除模块会对能产⽣积极影响） |                  yes(算法成本；更⼩的包体积；更小的代码生产)                  |                                                           |  no  |
|                                                                        optimization.concatenateModules(查找模块图中可以安全的连接到其它模块的⽚段，取决于 optimization.providedExports 和 optimization.usedExports)                                                                         | yes(额外的解析，范围分析和标识符重命名（性能）；提升运⾏时性能，减⼩包⼤⼩；) |                            no                             |  no  |
|                                                                                 optimization.splitChunks(拆分块，默认只针对异步块进⾏拆分； 算法成本，额外的请求；更少的代码⽣成，更好的缓存，更少的下载；)                                                                                 |                                      yes                                      |                            yes                            | yes  |
|                                                                                optimization.runtimeChunk(为 webpack 运⾏时代码和块清单创建⼀个单独的块。该块应内联到 HTML 中;更⼤的 HTML ⽂件；更好的缓存；)                                                                                |                                      yes                                      |                            yes                            | yes  |
|                                                                                                                      optimization.noEmitOnErrors(不输出编译错误的包）)                                                                                                                      |                       yes(⽆法使⽤应⽤程序的⼯作部分；)                       |                            no                             |  no  |
|                                                                                                                       optimization.nameModules(以名称固化 module id)                                                                                                                        |                                      no                                       |          yes(更⼤包体积；更好的错误报告和调试；)          |  no  |
|                                                                                                                        optimization.namedChunks(以名称固化 chunk id)                                                                                                                        |                                      no                                       |          yes(更⼤包体积；更好的错误报告和调试；)          |  no  |
|                                                                                                                      optimization.nodeEnv（设置 process.env.NODE_ENV）                                                                                                                      |           production(区别开发环境与⽣产环境；包⼤⼩，运⾏时性能；)            | development(区别开发环境与⽣产环境；包⼤⼩，运⾏时性能；) |  no  |
|                                                                                                       optimization.minimize(使⽤ optimization.minimizer 或者 TerserPlugin 来最⼩化包)                                                                                                       |                             yes( 更慢；包体积；)                              |                            no                             |  no  |
|                                                                                              optimization.ModuleConcatenationPlugin(预编译所有模块到⼀个闭包中，提升代码在浏览器中的执⾏速度)                                                                                               |                                      yes                                      |                            no                             |  no  |

## Entry

用来指定 webpack 的打包入，依赖图的入口是 entry，对于非代码如图片、字体依赖也会不断的加入到依赖图中。

- 单入口

```js
module.exports = {
  entry: './src/index'
}
```

- 多入口

```js
module.exports = {
  entry: {
    app: './src/app.js',
    index: './src/index.js'
  }
}
```

- 多页面打包

每个页面对于一个 entry，一个 html-webpack-plugin，动态获取 entry，设置 html-webpack-plugin 数量，利用 glob.sync

```js
module.exports = {
  entry: glob.sync(path.join(__dirname, './src/*/index.js'))
}
```

## Output

用来告诉 webpack 入口编译好的文件输出到磁盘上。

- 单入口

```
  module.exports = {
    entry: "./src/index",
    output: {
      filename: "bundle.js",
      path: __dirname + "/dist"
    }
  }
```

- 多入口

```
  module.exports = {
    entry: {
      index: "./src/index.js",
      app: "./src/app.js"
    },
    output: {
      filename: "[name].js",
      path: __dirname + "/dist"
    }
  }
```

## Loader

webpack 开箱即用只支持 js 和 json 两种文件类型。例如 css、预处理器、vue 指令等不支持，需要通过 loader 支持其他文件类型并且转化成有效的模块，并且可以添加到依赖图中，它本身是一个函数，接收源文件作为参数，返回转化的结构

|     名称      |              描述              |
| :-----------: | :----------------------------: |
| babel-loader  | 转化 ES6、ES7 等 JS 新特性语法 |
|  css-loader   |   支持.css 文件的加载和解析    |
|  less-loader  |     将 less 文件转化成 css     |
|   ts-loader   |        将 TS 转化为 JS         |
|  file-loader  |     进行图片、字体等的打包     |
|  raw-loader   |    将文件以字符串的形式导入    |
| thread-loader |      多进程打包 JS 和 CSS      |

## Plugins

插件用户 bundle 文件的优化，资源管理和环境变量注入，作用于整个构建过程，loader 无法完成的，用 plugin 完成

|           名称           |                       描述                       |
| :----------------------: | :----------------------------------------------: |
|    CommonsChunkPlugin    |      将 chunks 相同的模块代码提取成公共 js       |
|    CleanWebpackPlugin    |                   清理构建目录                   |
| ExtractTextWebpackPlugin | 将 css 从 bundle 文件里提取成一个独立的 css 文件 |
|    CopyWebpackPlugin     |       将文件或者文件夹拷贝到构建的输出目录       |
|    HtmlWebpackPlugin     |         创建 HTML 文件去承载输出 bundle          |
|   UglifyWebpackPlugin    |                     压缩 js                      |
|     ZipWebpackPlugin     |           将打包的资源生成一个 zip 包            |

## stats

构建的统计信息，颗粒度比较粗

|    模式     |               描述               |
| :---------: | :------------------------------: |
|   verbose   |             全部输出             |
|   normal    |             标准输出             |
|    none     |             没有输出             |
|   minimal   | 只有发生错误或者有新的编译时输出 |
| errors-only |        只有发生错误时输出        |

## source map

通过 source map 定位到源代码，开发环境开启，线上环境关闭，在线上排查问题的时候可以通过 source map 上传到监控系统中。

关键字：

- eval：使用 eval 包裹模块代码
- source map：产生.map 文件
- cheap：不包含列信息
- inline：将.map 作为 DataURI 嵌入，不单独生成.map 文件
- module：包含 loader 的 source map

source map 类型

|            devtool             | 是否适合生产环境 |             可以定位的代码             |
| :----------------------------: | :--------------: | :------------------------------------: |
|              none              |       yes        |             最终输出的代码             |
|              eval              |        no        |   webpack 生产的代码（一个个的模块）   |
|     cheap-eval-source-map      |        no        | 经过 loader 转化后的代码（只能看到行） |
|  cheap-module-eval-source-map  |        no        |          源代码（只能看到行）          |
|        eval-source-map         |        no        |                 源代码                 |
|        cheap-source-map        |       yes        | 经过 loader 转化后的代码（只能看到行） |
|    cheap-module-source-map     |       yes        |          源代码（只能看到行）          |
|    inline-cheap-source-map     |        no        | 经过 loader 转化后的代码（只能看到行） |
| inline-cheap-module-source-map |        no        |          源代码（只能看到行）          |
|           source-map           |       yes        |                 源代码                 |
|       inline-source-map        |        no        |                 源代码                 |
|       hidden-source-map        |       yes        |                 源代码                 |

## tree shaking

一个模块可能有多个方法，只要其中的某个方法用到了，则整个文件都会被打包到 bundle 里面去，tree shaking 就是只把用到的方法打入 bundle，没用到的方法会在 uglify 阶段被擦除掉。

使用：webpack 默认支持，在.babelrc 里面设置 modules:false 即可
要求：必须使用 es6 语法，CommonJS 方法不支持

DCE（Elimination）

- 方法不会被执行，不可达到
- 代码执行的结构不会被用到
- 代码只会影响死变量（只写不读）

原理：

- 利用来 es6 模块的特点
  - 只能作为模块顶层的语句出现
  - import 的模块名只能是字符串变量
  - import binding 是 immutable 的
- 代码擦除：uglify 阶段删除无用代码

## scope hoisting

构建后代码存在大量的闭包代码，导致体积增大、运行代码时创建的函数作用域变多，内存开销变大。

原理： 将所有模块的代码按照应用的顺序放在一个函数作用域里，然后适当的重命名一些变量以防止变量名冲突，通过 scope hoisting 可以减少函数声明代码和内存开销。

在 webpack3 中需要手动开启，在 webpack4 中为 production 默认开启，使用必须要用 es6 语法。

## 文件指纹

打包后输出的文件名类型

- hash：和整个项目的构建相关，只要项目文件有修改，整个项目构建的 hash 值就会改变
- chunkhash：和 webpack 打包的 chunk 有关，不同的 entry 会生成不同的 chunkhash 值
- contenthash：根据文件内容来定义 hash，文件的内容不变，则 contenthash 不变

## 代码分割和动态 import

### 代码分割

对于大的 web 应用来说，将所有的代码都放入一个文件中显然是不够有效的，特别是你的某些代码是在某些特殊的时候才会被用到。webpack 有一个功能就是将你的代码分割成 chunks，当代码运行到需要它们的时候再进行加载。操作：

- 抽离相同的代码到一个共享块
- 脚本懒加载，是的初始化下载的代码更小

### 动态 import

方法：

- commonJS： require.ensure
- es6：动态 import（原生不支持，需要 babel 转化，babel 插件：plugin-syntax-dynamic-import）
