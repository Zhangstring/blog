# 优化器

## 作用

优化器的作用是在 AST 中找到静态子树并打上标记，这样有两个好处：

- 每次重新渲染的时候，不需要为静态子树创建节点。
- 在虚拟 DOM 中打补丁的过程可以跳过。

## 实现

优化器内部实现其实主要分为两个步骤：

- 在 AST 中找出所以静态节点并打上标记。
- 在 AST 中找出所有静态根节点并打上标记。

```js
export function optimize(root: ?ASTElement, options: CompilerOptions) {
  if (!root) return
  // 标记是否为静态属性
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  // 标记是否为平台保留标签
  isPlatformReservedTag = options.isReservedTag || no
  // first pass: mark all non-static nodes.
  // 标记所有静态节点
  markStatic(root)
  // second pass: mark static roots.
  // 标记所有静态根节点
  markStaticRoots(root, false)
}
```

### 静态节点

通过递归的方式从上向下标记静态节点，如果一个节点被标记为静态节点，但它的子节点却被标记为动态节点，说明该节点不是静态节点，可以将它改成动态节点。静态节点的特征它的子节点必须是静态节点。

```js
function markStatic(node: ASTNode) {
  // 标记该节点是否为静态节点
  node.static = isStatic(node)

  if (node.type === 1) {
    // 当节点为元素节点
    // 不要使组件slot成为静态的，避免下面这两种情况：
    // 1.组件无法更改插槽节点
    // 2.静态slot组件无法热加载
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      return
    }
    // 遍历子节点
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      markStatic(child)
      // 如果子节点不是静态的，则本身也不是静态的
      if (!child.static) {
        node.static = false
      }
    }
    // ifConditions存储了if条件。
    // 是一个数组，格式为[{exp: xxx, block:xxx}, {exp: xxx, block:xxx}, {exp: xxx, block:xxx}]
    // block存储了element，exp存储了表达式。
    // 遍历ifConditions中的节点
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

function isStatic(node: ASTNode): boolean {
  // 带变量的动态文本节点，不是静态节点
  if (node.type === 2) {
    // expression
    return false
  }
  // 不带变量的纯文本节点， 是静态节点
  if (node.type === 3) {
    // text
    return true
  }
  return !!(
    node.pre || // 元素使用了v-pre指令，是静态节点
    // 不能使用动态绑定语法，不能使用v-if,v-for或者v-else指令，不能是内置标签（slot或者component），
    // 当前节点的父节点不能是带有v-for指令的template节点，节点不存在动态节点才会有的属性，满足这些是静态节点
    (!node.hasBindings && // no dynamic bindings
    !node.if &&
    !node.for && // not v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // not a built-in
    isPlatformReservedTag(node.tag) && // not a component
      !isDirectChildOfTemplateFor(node) &&
      Object.keys(node).every(isStaticKey))
  )
}
```

### 静态根节点

标记完静态节点之后需要标记静态节点，其标记方式也是使用递归的方式从上向下寻找，在寻找的过程中遇到的第一个静态节点就为静态根节点，同时不再向下继续查找。但是有两种情况比较特殊：一种如果一个静态根节点的子节点只有一个文本节点，那么不会将它标记为静态根节点，即使它也属于静态根节点；另一种如果找到的静态根节点是一个没有子节点的静态节点，那么也不会将它标记为静态根节点。因为在这两种情况下，优化大于收益。

```js
function markStaticRoots(node: ASTNode, isInFor: boolean) {
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor
    }
    // 要使节点符合静态根节点的要求，它必须要有子节点。
    // 这个子节点不能是只有一个静态文本的子节点，否则优化成本大于将超过收益
    if (
      node.static &&
      node.children.length &&
      !(node.children.length === 1 && node.children[0].type === 3)
    ) {
      node.staticRoot = true
      return
    } else {
      node.staticRoot = false
    }
    // 遍历子节点
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    // ifConditions存储了if条件。
    // 是一个数组，格式为[{exp: xxx, block:xxx}, {exp: xxx, block:xxx}, {exp: xxx, block:xxx}]
    // block存储了element，exp存储了表达式。
    // 遍历ifConditions中的节点
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}
```
