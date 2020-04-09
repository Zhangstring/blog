# 变化侦测

Vue 核心就是响应式原理，基于响应式原理一步步完善成现有的生态。响应式系统赋予框架重新渲染的能力，当数据变化时，会通知视图进行相应的更新。

Vue.js 会自动通过状态生产 DOM，并将其输出到页面上显示，这个过程叫渲染。Vue 的渲染过程是声明式的，通过模版来描述状态和 DOM 之间的映射关系。

通常，在运行时应用内部的状态会不断发生变化，此时需要不停的重新渲染。这时如何确定状态中发生了什么变化？通过变化侦测可以解决这个问题。

变化侦测分为两种：一种是“推“（push）,另一种是“拉”（pull）。

“拉”，React 和 Angular 的变化侦测就属于这种，当状态发生变化时，它不知道哪个状态变了，只知道状态变了，然后通知框架，框架收到之后，会进行一个暴力对比来找出哪些 DOM 节点需要重新渲染。这在 Angular 中是脏检查，在 React 中是使用虚拟 DOM。

“推”，Vue 使用的这种。当状态变化时，Vue 立刻就能知道，而且在一定程度上知道哪些状态变了。因此，它知道的信息更多，也就可以更细颗粒度的更新。

所谓更细颗粒度更新：假如有一个状态绑定了很多个依赖，每个依赖表示一个具体的 DOM 节点，那么当这个状态发生了变化时，向这个状态的所有依赖发送通知，让它们进行 DOM 更新操作。相比较而言，“拉”的颗粒度最粗的。

但是这个是有一定的代价的，因为颗粒度越细，每个状态所绑定的依赖就越多，依赖追踪在内存上的开销就越大。因此，Vue.js2.0 开始,引入了虚拟 DOM，并将颗粒度调整为中等粒度，即一个状态所绑定的依赖不再是具体的 DOM 节点，而是一个组件。这样状态变化了，会通知到组件，组件内部使用虚拟 DOM 进行对比。这样大大降低了依赖数量，从而降低依赖追踪所消耗的内存。并且 Vue 之所以能随意调颗粒度，本质上还是变化侦测。通过变化侦测可以随意调整颗粒度。

通过 Object.defineProperty 和 ES6 中的 Proxy 这两种方式可以实现变化侦测，但是由于 Proxy 在浏览器支持度不够理想。2.x 版本的 vue 还是使用了 Object.defineProperty 来实现。3.x 版本里使用 Proxy 来侦测。现在使用 Object.defineProperty 来实现。

## observe

Object 通过 Object.defineProperty 将属性转化为 getter/setter 的形式来追踪变化。读取数据时会触发 getter，修改数据时会触发 setter。因此在 getter 中收集依赖，在 setter 中触发依赖。

## Dep

收集依赖需要为依赖找一个存储依赖的地方，为此创建了 Dep，用来收集依赖，删除依赖和向依赖发送消息等。

## Watcher

所谓的依赖就是 Watcher，只有 Watcher 触发的 getter 才会收集依赖，哪个 Watcher 触发的了 getter，就把哪个 Watcher 收集到 Dep 中，当数据发生变化时，会遍历依赖列表，将所有 Watcher 都通知一遍。

Watcher 原理是把自己设置到全局唯一指定的位置（Dep.target），然后编译模版和渲染时会读取数据，因为读取了数据，所以会触发这个数据的 getter。接着，在 getter 中会把 Dep.target 读书获取数据的 Watcher，并把这个 Watcher 收集到这个数据的 Dep 中。当数据发生了变化会触发 setter，从而向数据的 Dep 中的依赖 Watcher 发送通知，Watcher 接受到通知后，会向外界发送通知，变化通知到外界后可能会触发视图更新，也可能触发用户的某个回掉函数等（`Watcher（vm,expOrFn,cb`）。

<img src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/%E5%93%8D%E5%BA%94%E5%BC%8F.png" />

## 简单实现

简单实现了一个响应式，很多细节没有处理例如数组的变化侦测（需要拦截数组的原型方法），Watcher 中的参数 expOrFn 现只支持函数,不支持表达式并且没有支持\$watcher 等功能，因为 Vue 的核心是响应式所以需要处理和支持很多功能，并不是以下那么简单。

observe:

```js
// observe.js

import { Dep } from './dep.js'
export function observe(obj) {
  new Observe(obj)
}

function Observe(obj) {
  Object.keys(obj).forEach(key => {
    defineReactive(obj, key, obj[key])
  })
}

function defineReactive(obj, key, value) {
  const dep = new Dep()
  value && observe(value)
  Object.defineProperty(obj, key, {
    get: function() {
      if (Dep.target) {
        dep.depend()
      }
      return value
    },
    set: function(newVal) {
      val = newVal
      dep.notify()
    }
  })
}
```

Dep:

```js
// dep.js

export class Dep {
  constructor() {
    this.subs = []
  }
  addSub(sub) {
    this.subs.push(sub)
  }
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
  notify() {
    this.subs.forEach(sub => sub.update())
  }
}

Dep.target = null
const targetStack = []
export function pushTarget(watcher) {
  targetStack.push(watcher)
  Dep.target = watcher
}
export function popTarget() {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
```

Watcher:

```js
// watcher.js

import { pushTarget, popTarget } from './dep.js'
export default class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm
    this.getter = expOrFn
    this.cb = cb
    this.value = this.get()
  }
  get() {
    pushTarget(this)
    const value = this.getter.call(this.vm, this.vm)
    popTarget()
    return value
  }
  addDep(dep) {
    dep.addSub(this)
  }
  update() {
    const value = this.get()
    const oldValue = this.value
    this.value = value
    this.cb.call(this.vm, value, oldValue)
  }
}
```

demo:

```js
// demo.js

import { observe } from './observe.js'
import Watcher from './watcher.js'
const vm = {
  data: {
    a: 1
  },
  methods: {
    start: () => {
      console.log('success')
    }
  }
}
observe(vm.data)
new Watcher(
  vm,
  vm => {
    console.log('render', vm.data.a)
  },
  () => {
    console.log('cb')
  }
)
vm.data.a = 2
```
