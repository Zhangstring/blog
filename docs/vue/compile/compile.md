# 模版编译

模版通过编译转换成渲染函数，渲染函数执行生成 vnode 用于虚拟 DOM 的渲染。

<img src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/vue%20%E6%A8%A1%E7%89%88%E7%BC%96%E8%AF%91.png">

模版编译分为三个部分内容：

- 将模版解析为 AST（解析器）
- 遍历 AST 标记静态节点（优化器）
- 使用 AST 生成渲染函数（代码生成器）

模版编译的整体流程：

<img src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/vue%20%E6%A8%A1%E7%89%88%E7%BC%96%E8%AF%91%E6%95%B4%E4%BD%93%E6%B5%81%E7%A8%8B.png">

源码：

```js
// src/compiler/index.js

export const createCompiler = createCompilerCreator(function baseCompile(
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 将模版解析为 AST
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    // 遍历 AST 标记静态节点
    optimize(ast, options)
  }
  // 使用 AST 生成渲染函数
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
```
