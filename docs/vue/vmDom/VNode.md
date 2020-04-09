# VNode

## 什么是 VNode

VNode 是一个类，可以生成不同的 VNode 实例，而不同类型的 vnode 表示不同类型的真实 DOM 元素。

vnode 只是一个名字，本质上其实是一个 JavaScript 中一个普通的对象，是从 VNode 类实例化的对象。我们用 vnode 来描述一个真实 DOM 元素的话，那么该 DOM 元素上所有属性在 VNode 这个对象上都存在对应的属性。简单的说，vnode 可以理解成节点描述对象，它描述了应该去怎样去创建真实的 DOM 节点。例如，tag 表示一个元素节点的名称，text 表示一个文本节点的文本，children 表示子节点等。

VNode 类代码：

```js
export default class VNode {
  tag: string | void
  data: VNodeData | void
  children: ?Array<VNode>
  text: string | void
  elm: Node | void
  ns: string | void
  context: Component | void // rendered in this component's scope
  key: string | number | void
  componentOptions: VNodeComponentOptions | void
  componentInstance: Component | void // component instance
  parent: VNode | void // component placeholder node

  // strictly internal
  raw: boolean // contains raw HTML? (server only)
  isStatic: boolean // hoisted static node
  isRootInsert: boolean // necessary for enter transition check
  isComment: boolean // empty comment placeholder?
  isCloned: boolean // is a cloned node?
  isOnce: boolean // is a v-once node?
  asyncFactory: Function | void // async component factory function
  asyncMeta: Object | void
  isAsyncPlaceholder: boolean
  ssrContext: Object | void
  fnContext: Component | void // real context vm for functional nodes
  fnOptions: ?ComponentOptions // for SSR caching
  devtoolsMeta: ?Object // used to store functional render context for devtools
  fnScopeId: ?string // functional scope id support

  constructor(
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.fnContext = undefined
    this.fnOptions = undefined
    this.fnScopeId = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child(): Component | void {
    return this.componentInstance
  }
}
```

## VNode 的作用

由于每次渲染视图时都是先创建 vnode，然后使用它创建真实 DOM 插入到页面中，所以可以将上次渲染视图所创建 vnode 缓存起来，之后每当需要重新渲染视图时，将新创建的 vnode 和上次缓存起来的 vnode 进行对比，找出不相同的地方基于此去修改真实的 DOM。

Vue.js 目前对状态的侦测策略采用了中等粒度。当状态发生变化时，只通知到组件级别，然后组件内使用虚拟 DOM 来渲染视图。如果没有使用缓存，当组件使用的众多状态中有一个发生变化，那么整个组件就要重新渲染，明显会造成很大的性能浪费。因此，对 vnode 进行缓存，并将上一次缓存的 vnode 和当前新创建的 vnode 进行对比，只更新发生变化的节点就变得尤为重要。

## VNode 类型

VNode 的类型有以下几种：

- 注释节点
- 文本节点
- 元素节点
- 组件节点
- 函数式节点
- 克隆节点

### 注释节点

注释节点有两个有效属性：`text`和`isComment`

```js
export const createEmptyVNode = (text: string = '') => {
  const node = new VNode()
  node.text = text
  node.isComment = true
  return node
}
```

所对应的 vnode 是这样的

```js
{
  text: '注释节点',
  isComment: true
}
```

### 文本节点

只有一个有效属性 text

```js
export function createTextVNode(val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}
```

对应的 vnode

```js
{
  text: '文本内容'
}
```

### 克隆节点

克隆节点是将现有节点的属性复制到新的节点，让新创建的节点和被克隆的节点的属性保持一致，从而实现克隆效果。它的作用优化静态节点和插槽节点。克隆节点和被克隆节点之间唯一区别是 isCloned 属性。

```js
export function cloneVNode(vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // a child.
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.fnContext = vnode.fnContext
  cloned.fnOptions = vnode.fnOptions
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true
  return cloned
}
```

### 元素节点

元素节点通常有四种属性：

- tag： 节点名称，例如 p、ul、li 和 div 等。
- data：包含了一些节点上的属性，比如 attrs、class 和 style 等。
- children：当前节点的子节点列表。
- context：当前组件的 Vue 实例

```js
vnode = new VNode(tag, data, children, undefined, undefined, context)
```

### 组件节点

组件节点和元素节点类似，但有以下两个独有属性：

- componentOptions：组件节点的选项参数，其中包含  了 propsData、tag 和 children 等信息。
- componentInstance：组件的实例。每个组件都是一个 Vue 实例

```js
const vnode = new VNode(
  `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
  data,
  undefined,
  undefined,
  undefined,
  context,
  { Ctor, propsData, listeners, tag, children },
  asyncFactory
)

vnode.componentInstance = createComponentInstanceForVnode(vnode, activeInstance)
```
