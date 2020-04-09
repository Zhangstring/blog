# 项目结构

## 目录结构

Vue.js 的目录结构如下：

```
.
├── dist                           ## 构建后文件
├── examples                       ## demo
├── flow                           ## Flow的类型声明
├── packages                       ## vue-server-render和vue-template-compiler,它们作为单独的npm包发布
├── scripts                        ## 构建相关的脚本和配置文件
├── src                            ## 源代码
│   ├── compiler                   ## 与模版编译相关的代码
│   │   ├── codeframe.js
│   │   ├── codegen                ## 将ast转为render函数
│   │   ├── create-compiler.js     ## 编译配置处理
│   │   ├── directives             ## 指令代码代码
│   │   ├── error-detector.js      ## 检测模版错误代码
│   │   ├── helpers.js
│   │   ├── index.js               ## 模版编译核心代码
│   │   ├── optimizer.js           ## 优化ast代码
│   │   ├── parser                 ## template解析成ast代码
│   │   └── to-function.js
│   ├── core                         ## 通用的、与平台无关的运行时代码
│   │   ├── components               ## 通用的抽象组件
│   │   ├── config.js                ## 配置文件
│   │   ├── global-api               ## 全局api的代码
│   │   ├── index.js                 ## 初始化原型和挂载全局api的Vue
│   │   ├── instance                 ## Vue.js实例的构造函数和原型方法
│   │   ├── observer                 ## 变化侦测
│   │   ├── util                     ## 工具函数
│   │   └── vdom                     ## 实现虚拟DOM的代码
│   ├── platforms                    ## 不同平台的支持
│   │   ├── web                      ## web平台
│   │   └── weex                     ## weex平台
│   ├── server                       ## 服务端渲染
│   ├── sfc                          ## 单文件组件（*.vue文件）逻辑解析
│   └── shared                       ## 整个项目的公用工具代码
├── test                             ## 测试代码
├── types                            ## TypeScript类型定义
```

- packages 目录中包含的 vue-server-render 和 vue-template-compiler 会作为单独的 NPM 包发布，自动从源码中生成，并且始终与 Vue.js 具有相同的版本。
- scr/compiler 目录包含 Vue.js 所有编译相关的代码。它包括把模板解析成 ast 语法树，ast 语法树优化，代码生成等功能。
- scr/core 目录下是 Vue.js 的核心代码，这部分逻辑是于平台无关，它们是可以在任何 JavaScript 环境下运行，比如浏览器、Node.js 或者嵌入原生应用中。包含了 Vue.js 的核心代码，包括内置组件、全局 API 封装，Vue 实例化、观察者、虚拟 DOM、工具函数等等。
- src/platforms 目录中包含特定平台的代码，可以跑在 web 上，也可以配合 weex 跑在 native 客户端上
- dist 存放构建后的文件，在这个文件下会有很多不同的 Vue.js 构建版本。
  - 完整版：构建后文件同时包含编译器和运行时。
  - 编译器：负责将模版字符串编译成 JavaScript 渲染函数。
  - 运行时：负责创建 Vue.js 实例，渲染视图和使用虚拟 DOM 实现重新渲染，基本上包括除编译器外的所有部分。
  - UMD：UMD 版本文件可以通过`<script>`标签直接在浏览器上使用。UMD 的实现：
    - 先判断了是否支持 CommonJS(exports 和 module 是否存在)，支持则使用 CommonJS.
    - 然后判断了是否支持 AMD（define 是否存在）,支持使用 AMD 方式加载模块。
    - 最后都不支持以上模式，将模块挂在到全局上（global 或 window）。
  - ESM：ES Module 版本用来配合现代打包工具，例如 webpack 和 Rollup,这些打包工具默认文件只包含运行时的 ES Module 版本（vue.runtime.esm.js）

不同的 Vue.js 构建版本的区别：

|           版本类型           |        UMD         |       CommonJs        |        ESM         |
| :--------------------------: | :----------------: | :-------------------: | :----------------: |
|            完整版            |       vue.js       |     vue.common.js     |     vue.esm.js     |
|       只包含运行时版本       |   vue.runtime.js   | vue.runtime.common.js | vue.runtime.esm.js |
|      完整版（生产环境）      |     vue.min.js     |           -           |         -          |
| 只包含运行时版本（生产环境） | vue.runtime.min.js |           -           |         -          |

## 开发环境与生产环境模式

对于 UMD 版本来说，开发环境和生产环境二者的模式时硬编码的：开发环境下使用未压缩代码，生产环境使用压缩后的代码。

CommonJS 和 ES Module 版本用于打包工具。因此 Vue.js 不提供压缩后的版本，需要自行将最终的包进行压缩。
