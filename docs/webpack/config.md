# 配置文件

## 入口

webpack默认配置文件:webpack.config.js。可以通过webpack --config指定配置文件。

## Entry

用来指定webpack的打包入，依赖图的入口是entry，对于非代码如图片、字体依赖也会不断的加入到依赖图中。
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

## Output

用来告诉webpack入口编译好的文件输出到磁盘上。
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

webpack开箱即用只支持js和json两种文件类型。例如css、预处理器、vue指令等不支持，需要通过loader支持其他文件类型并且转化成有效的模块，并且可以添加到依赖图中，它本身是一个函数，接收源文件作为参数，返回转化的结构

|     名称      |            描述            |
| :-----------: | :------------------------: |
| babel-loader  | 转化ES6、ES7等JS新特性语法 |
|  css-loader   |  支持.css文件的加载和解析  |
|  less-loader  |    将less文件转化成css     |
|   ts-loader   |        将TS转化为JS        |
|  file-loader  |   进行图片、字体等的打包   |
|  raw-loader   |  将文件以字符串的形式导入  |
| thread-loader |     多进程打包JS和CSS      |

