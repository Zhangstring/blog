# VNode

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
