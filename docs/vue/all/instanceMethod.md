# 实例方法 / 方法

vm.$on、vm.$once、vm.\$off、vm.\$emit 是在 eventsMixin 中挂载到 Vue 构造函数的原型上。

```js
// src/core/instance/index.js
function Vue(options) {
  this._init(options)
}
// 给Vue添加了$data,$props,$set,$del,$watch
eventsMixin(Vue)
```

```js
// src/core/instance/event.js
export function eventsMixin(Vue: Class<Component>) {
  const hookRE = /^hook:/
  Vue.prototype.$on = function(
    event: string | Array<string>,
    fn: Function
  ): Component {
    // ...
  }

  Vue.prototype.$once = function(event: string, fn: Function): Component {
    // ...
  }

  Vue.prototype.$off = function(
    event?: string | Array<string>,
    fn?: Function
  ): Component {
    // ...
  }

  Vue.prototype.$emit = function(event: string): Component {
    // ...
  }
}
```

## `vm.$on`

事件的实现方式，在注册事件时将回调函数收集起来，在触发事件时将收集起来的回调函数依次调用。

```js
Vue.prototype.$on = function(
  event: string | Array<string>,
  fn: Function
): Component {
  const vm: Component = this
  if (Array.isArray(event)) {
    // 当event时数组时，遍历数组，递归调用vm.$on
    for (let i = 0, l = event.length; i < l; i++) {
      vm.$on(event[i], fn)
    }
  } else {
    // 用_events存储事件。使用事件名(event)从vm._events中取出事件列表，如果事件列表不存在则初始化为空数组。
    // 然后将回调函数放入事件列表中。
    ;(vm._events[event] || (vm._events[event] = [])).push(fn)
    // 这里在注册事件的时候标记bool值也就是个标志位来表明存在钩子，而不需要通过哈希表的方法来查找是否有钩子，这样做可以减少不必要的开销，优化性能。
    if (hookRE.test(event)) {
      vm._hasHookEvent = true
    }
  }
  return vm
}
```

## `vm.$once`

vm.$once只触发一次。实现方法：在vm.$once 中调用 vm.\$on 来实现监听自定义事件的功能，当自定义事件触发后会执行拦截器，将监听事件从事件列表中删除

```js
Vue.prototype.$once = function(event: string, fn: Function): Component {
  const vm: Component = this
  function on() {
    // 在第一次执行的时候将该事件销毁
    vm.$off(event, on)
    // 执行注册的方法
    fn.apply(vm, arguments)
  }
  on.fn = fn
  vm.$on(event, on)
  return vm
}
```

## `vm.$off`

注销一个事件，如果不传参则注销所有事件，如果只传 event 名则注销该 event 下的所有方法

```js
Vue.prototype.$off = function(
  event?: string | Array<string>,
  fn?: Function
): Component {
  const vm: Component = this
  // 如果不传参数则注销所有事件
  if (!arguments.length) {
    vm._events = Object.create(null)
    return vm
  }
  // 如果event是数组则递归注销事件
  if (Array.isArray(event)) {
    for (let i = 0, l = event.length; i < l; i++) {
      vm.$off(event[i], fn)
    }
    return vm
  }
  // 通过事件名获取事件列表
  const cbs = vm._events[event]
  // 本身不存在该事件则直接返回
  if (!cbs) {
    return vm
  }
  // 如果只传了event参数则注销该event方法下的所有方法
  if (!fn) {
    vm._events[event] = null
    return vm
  }
  // 遍历寻找对应方法并删除
  let cb
  let i = cbs.length
  while (i--) {
    cb = cbs[i]
    if (cb === fn || cb.fn === fn) {
      cbs.splice(i, 1)
      break
    }
  }
  return vm
}
```

## `vm.$emit`

vm.\$emit 作用时触发事件。所有的事件监听器回调函数都会存在 vm.\_event 中，所以触发事件的实现是使用事件名从 vm.\_events 中取出对应的事件监听器回调函数列表，然后依次执行列表中的监听器回调函数并将参数传递给监听器回调。

```js
Vue.prototype.$emit = function(event: string): Component {
  const vm: Component = this
  // vm._events中取出对应的回调列表
  let cbs = vm._events[event]
  if (cbs) {
    // 将类数组转成数组
    cbs = cbs.length > 1 ? toArray(cbs) : cbs
    const args = toArray(arguments, 1)
    const info = `event handler for "${event}"`
    // 遍历执行
    for (let i = 0, l = cbs.length; i < l; i++) {
      // 执行回调函数错误提示
      invokeWithErrorHandling(cbs[i], vm, args, vm, info)
    }
  }
  return vm
}

export function invokeWithErrorHandling(
  handler: Function,
  context: any,
  args: null | any[],
  vm: any,
  info: string
) {
  let res
  try {
    res = args ? handler.apply(context, args) : handler.call(context)
    if (isPromise(res)) {
      res.catch(e => handleError(e, vm, info + ` (Promise/async)`))
    }
  } catch (e) {
    handleError(e, vm, info)
  }
  return res
}
```
