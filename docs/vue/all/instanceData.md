# 实例方法 / 数据

vm.$watch、vm.$set、vm.\$delete 是在 stateMixin 中挂载到 Vue 构造函数的原型上。

```js
// src/core/instance/index.js
function Vue(options) {
  this._init(options)
}
// 给Vue添加了$data,$props,$set,$del,$watch
stateMixin(Vue)
```

```js
// src/core/instance/state.js
export function stateMixin(Vue: Class<Component>) {
  Vue.prototype.$set = set
  Vue.prototype.$delete = del
  Vue.prototype.$watch = function(
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    // ...
  }
}
```

## `vm.$watch`

vm.$watch其实是对Watcher的一种封装，但是vm.$watcher 中的参数是 deep 和 immediate 是 Watcher 所没有的。

新增功能：

- immediate: 判断 immediate 看是否需要立即执行回掉，使用了则立即执行一次回掉。
- deep: `traverse` 触发每个深层对象的依赖，追踪其变化
- 取消观察：用 deps 记录订阅了哪些 Dep，`teardown`可以通过 deps 里的 Dep 列表删除依赖项来取消观察

```js
Vue.prototype.$watch = function(
  expOrFn: string | Function,
  cb: any,
  options?: Object
): Function {
  const vm: Component = this
  if (isPlainObject(cb)) {
    // cb如果是对象，options设置为cb,cb为cb.handler,如果cb.handler是字符串，则从vm中获取cb（vm[handler]）
    return createWatcher(vm, expOrFn, cb, options)
  }
  options = options || {}
  options.user = true
  const watcher = new Watcher(vm, expOrFn, cb, options)
  // immediate为true时，立即执行一次cb
  if (options.immediate) {
    try {
      cb.call(vm, watcher.value)
    } catch (error) {
      handleError(
        error,
        vm,
        `callback for immediate watcher "${watcher.expression}"`
      )
    }
  }
  // 返回一个函数用于取消观察数据
  return function unwatchFn() {
    watcher.teardown()
  }
}

export default class Watcher {
  constructor(
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
    } else {
      this.deep = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression =
      process.env.NODE_ENV !== 'production' ? expOrFn.toString() : ''
    // parse expression for getter
    // expOrFn支持函数
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
    }
    this.value = this.lazy ? undefined : this.get()
  }
  get() {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // 如果存在deep，则触发每个深层对象的依赖，追踪其变化
      if (this.deep) {
        // 递归每一个对象或者数组，触发它们的getter，使得对象或数组的每一个成员都被依赖收集，形成一个“深（deep）”依赖关系
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }
  addDep(dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }
  // 从所有依赖项的Dep列表中将自己移除
  teardown() {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
```

## `vm.$set`

由于已经存在的属性的变化会被追踪到，新增的属性不会被追踪到，vm.\$set 是为了解决这个问题。

- 数组处理:先设置有效索引，然后使用 splice 方法可以将新增 val 值转化为响应式
- 对象处理
  - 如果已经存在，说明是响应式了，直接修改数据。
  - 新增属性
    - target 不能为 Vue 实例或者实例的根数据对象，直接返回 val
    - target 不是响应式，直接 target[key] = value
    - 上述条件都不是，则 defineReactive 将新增属性转换为 getter/setter 形式，并依赖触发通知，最后返回 val

```js
import { set } from '../observer/index'
Vue.prototype.$set = set
```

```js
// src/core/observer/index.js

export function set(target: Array<any> | Object, key: any, val: any): any {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 对数组处理
    // 设置有效索引
    target.length = Math.max(target.length, key)
    // 使用splice方法可以将新增val值转化为响应式
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    // 已经存在，说明是响应式了，直接修改数据
    target[key] = val
    return val
  }
  const ob = target.__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    // target不能为Vue实例或者实例的根数据对象，直接返回val
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  // 为对象defineProperty上在变化时通知的属性
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}
```

## `vm.$delete`

vm.$delete作用是删除数据中的某个属性。由于Vue的变化侦测使用Object.defineProperty实现的，所以如果数据使用delete关键字删除的，那么无法发现数据发生了变化。vm.$delete 就是为了解决这个问题。

- 数组：直接使用splice删除
- 对象：用delete删除并向依赖触发通知。

```js
import { del } from '../observer/index'
Vue.prototype.$delete = del
```

```js
export function del(target: Array<any> | Object, key: any) {

  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 如果是数组使用splice删除
    target.splice(key, 1)
    return
  }
  const ob = target.__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}
```
