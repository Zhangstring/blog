# 解析器

## 概念

解析器的作用就是将模版解析为 AST。在解析器的内部，分成了很多小解析起，其中包括了过滤器解析器、文本解析器和 HTML 解析器。然后通过一条主线将这些解析器组装在一起。

<img style="width: 60%" src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/vue%20%E8%A7%A3%E6%9E%90%E5%99%A8.png">

- 过滤器解析器：用来解析过滤器的。
- 文本解析器：用来解析文本，主要解析带变量的文本。
- HTML 解析器：是解析器中的最核心模块。作用就是解析模块，每当解析到 HTML 标签的开始位置、结束位置、文本或者注释时，都会触发钩子函数，然后将相关信息通过参数传出来。
- 主线：监听 HTML 解析器。每当触发钩子函数时，就会生成一个对应的 AST 节点。生成 AST 前，会根据类型使用不同方式生成不同的 AST，例如是文本节点，就会生成文本类型的 AST。

## 运行原理

解析器实现的功能是将模版解析成 AST。AST 其实是一个用对象描述的节点树。

HTML 解析器的作用是解析 HTML，它在解析 HTML 的过程中会不断触发各种钩子函数。这些钩子函数包括开始标签钩子函数，结束标签钩子函数、文本钩子函数以及注释钩子函数。

```js
  parseHTML(template, {
    start (tag, attrs, unary, start) {
      // 每当解析到标签的开始位置时，触发该函数
      ...
    },

    end (tag, start, end) {
      // 每当解析到标签的结束位置时，触发该函数
      ...
    },

    chars (text: string, start: number, end: number) {
      // 每当解析到文本时，触发该函数
      ...
    },
    comment (text: string, start, end) {
      // 每当解析到注释时，触发该函数
      ...
    }
  })

```

例如这个模版`<div><p>模版</p></div>`被 HTML 解析器解析时，所触发的钩子函数一次为:start、start、chars、end、end。

钩子函数的参数：

- start 有四个参数，分别是 tag, attrs, unary, start，它们分别说明了标签名，标签的属性，是否为自闭和标签，开始位置。
- end 有三个参数，分别是 tag, start, end，它们分别说明了标签名，开始位置，结束位置。
- chars 和 comment 都有三个参数，分别是 text, start, end， 它们分别说明了文本内容，开始位置，结束位置。
