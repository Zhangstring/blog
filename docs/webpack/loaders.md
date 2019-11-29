# Loaders

## 解析 es6

使用 babel-loader,babel 配置文件.babelrc

babel 配置

- plugins：第三方插件，可以省略 eslint-plugin-前缀
- env：环境配置例如 browser，node，es6 等
- rules：规则
  - 关闭规则："off"和 0
  - 开启规则，使用警告级别错误："warn"或 1
  - 开启规则，使用错误级别错误："error"或 2

## 解析 css、less

- less-loader：用于 less 转成 css
- css-loader：用于加载.css 文件，并且转化成 commonJs 对象
- style-loader：将样式通过`<style>`标签插入 header 中

## 解析图片、字体

- file-loader：用于处理文件
- url-loader：（内部使用 file0-loader）处理字体图片，可以设置较小资源自动转化为 base64
