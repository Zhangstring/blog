# 概念

## 开始

webpack 默认配置文件:webpack.config.js。可以通过 webpack --config 指定配置文件。

## mode

用来指定当前构建环境是：none、development 或者 production
设置 mode 可以使用 webpack 内置函数，mode 默认值 production

- development

设置 process.env.NODE_ENV 的值为 development，开启 NamedChunkPlugin 和 NamedModulesPlugin

- production

设置 process.env.NODE_ENV 的值为 production，开启 FlagDependencyUsagePlugin，FlagIncludedChunksPlugin，ModuleConcatenationPlugin，NoEmitOnErrorPlugin，OccurrenceOrderPlugin，SideEffectsFlagPlugin 和 TerserPlugin

- none

不开启任何优化选项

## Entry

用来指定 webpack 的打包入，依赖图的入口是 entry，对于非代码如图片、字体依赖也会不断的加入到依赖图中。

- 单入口

```
  module.exports = {
    entry: "./src/index"
  }
```

- 多入口

```
  module.exports = {
    entry: {
      app: "./src/app.js",
      index: "./src/index.js"
    }
  }
```

- 多页面打包

每个页面对于一个 entry，一个 html-webpack-plugin，动态获取 entry，设置 html-webpack-plugin 数量，利用 glob.sync

```
module.exports = {
  entry: glob.sync(path.join(__dirname, "./src/*/index.js"))
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
