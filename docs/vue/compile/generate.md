# 代码生成器

## 作用

代码生成器是模版编译的最后一步。作用是将 AST 转换成渲染函数中的内容，这个内容可以被称为代码字符串。代码字符串可以被包装在函数中执行，这个函数就是渲染函数。渲染函数执行后，生成一份 VNode，虚拟 DOM 通过 VNode 来渲染视图。

AST 节点有三种类型，分别对应这三种不同的创建方式和别名：

|   类型   |     创建方式     | 别名 |
| :------: | :--------------: | :--: |
| 元素节点 |  createElement   | \_c  |
| 文本节点 | createTextVNode  | \_v  |
| 注释节点 | createEmptyVNode | \_e  |

## 实现

通过递归 AST 来生成字符串，最先生成根节点，然后在子节点字符串生成后，将其拼接到根节点的参数中，子节点的子节点拼接到子节点的参数中，这样一层层地拼接，直到最后拼接成完整字符串。

```js
// 将AST语法树转化成render以及staticRenderFns的字符串
export function generate(
  ast: ASTElement | void,
  options: CompilerOptions
): CodegenResult {
  const state = new CodegenState(options)
  const code = ast ? genElement(ast, state) : '_c("div")'
  return {
    render: `with(this){return ${code}}`,
    staticRenderFns: state.staticRenderFns
  }
}

export function genElement(el: ASTElement, state: CodegenState): string {
  if (el.parent) {
    el.pre = el.pre || el.parent.pre
  }
  // 处理element，分别处理static静态节点、v-once、v-for、v-if、template、slot以及组件或元素
  if (el.staticRoot && !el.staticProcessed) {
    // 处理static静态节点
    return genStatic(el, state)
  } else if (el.once && !el.onceProcessed) {
    // 处理v-once
    return genOnce(el, state)
  } else if (el.for && !el.forProcessed) {
    // 处理v-for
    return genFor(el, state)
  } else if (el.if && !el.ifProcessed) {
    // 处理v-if
    return genIf(el, state)
  } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
    // 处理template
    return genChildren(el, state) || 'void 0'
  } else if (el.tag === 'slot') {
    // 处理slot
    return genSlot(el, state)
  } else {
    // component or element
    // 处理组件或元素
    let code
    if (el.component) {
      // 处理组件
      code = genComponent(el.component, el, state)
    } else {
      // 处理元素
      let data
      // plain是编译时设置的，如果节点没有属性，则plain为true，通过plain判断是否需要获取节点的属性。
      if (!el.plain || (el.pre && state.maybeComponent(el))) {
        // 获取data字符串
        data = genData(el, state)
      }
      // 获取children字符串，通过循环子节点列表，根据不同的子节点类型生成不同的节点字符串并将其拼接到一起
      const children = el.inlineTemplate ? null : genChildren(el, state, true)
      // 拼接tag、data、children
      code = `_c('${el.tag}'${
        data ? `,${data}` : '' // data
      }${
        children ? `,${children}` : '' // children
      })`
    }
    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code)
    }
    return code
  }
}
```
