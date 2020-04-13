# 实例方法 / 生命周期

vm.$mount、vm.$nextTick、vm.\$destroy、vm.\$forceUpdate 是在 eventsMixin 中挂载到 Vue 构造函数的原型上。

```js
// src/core/instance/index.js
function Vue(options) {
  this._init(options)
}
// 给Vue添加了_update,$forceUpdate,$destroy
lifecycleMixin(Vue)
// 给Vue添加了$nextTick,_render
renderMixin(Vue)
```

```js
// src/core/instance/lifecycle.js
export function lifecycleMixin(Vue: Class<Component>) {
  Vue.prototype._update = function(vnode: VNode, hydrating?: boolean) {
    // ...
  }

  Vue.prototype.$forceUpdate = function() {
    // ...
  }

  Vue.prototype.$destroy = function() {
    // ...
  }
}

// src/core/instance/render.js
export function renderMixin(Vue: Class<Component>) {
  Vue.prototype.$nextTick = function(fn: Function) {
    return nextTick(fn, this)
  }

  Vue.prototype._render = function(): VNode {
    // ...
  }
}

// src/platforms/web/runtime/index.js
Vue.prototype.$mount = function(el, hydrating) {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

// src/core/instance/lifecycle.js
export function mountComponent(vm, el, hydrating) {
  vm.$el = el
  callHook(vm, 'beforeMount')
  let updateComponent
  /* istanbul ignore if */
  updateComponent = () => {
    vm._update(vm._render(), hydrating)
  }
  new Watcher(
    vm,
    updateComponent,
    noop,
    {
      before() {
        if (vm._isMounted && !vm._isDestroyed) {
          callHook(vm, 'beforeUpdate')
        }
      }
    },
    true /* isRenderWatcher */
  )
  // ...
}
```

## `vm.$forceUpdate`

vm.\$forceUpdate 作用是迫使 Vue 实例重新渲染。只需要执行实例 watcher 的 update 方法，就可以让实例重新渲染。

```js
Vue.prototype.$forceUpdate = function() {
  const vm: Component = this
  if (vm._watcher) {
    vm._watcher.update()
  }
}
```

## `vm.$destroy`

完全销毁一个实例，它会清理该实例与其他实例的链接，并解绑其全部指令和监听器，同时会触发 beforeDestroy 和 destroy 的钩子函数。

```js
Vue.prototype.$destroy = function() {
  const vm: Component = this
  // 通过_isBeingDestroyed防止vm.$destroy被反复执行
  if (vm._isBeingDestroyed) {
    return
  }
  // 触发beforeDestroy钩子
  callHook(vm, 'beforeDestroy')
  vm._isBeingDestroyed = true
  // 删除自己和父级的链接
  const parent = vm.$parent
  if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
    remove(parent.$children, vm)
  }
  // 从watcher监听的所有状态的依赖列表中移除watcher
  if (vm._watcher) {
    vm._watcher.teardown()
  }
  let i = vm._watchers.length
  while (i--) {
    vm._watchers[i].teardown()
  }
  // remove reference from data ob
  // frozen object may not have observer.
  if (vm._data.__ob__) {
    vm._data.__ob__.vmCount--
  }
  // call the last hook...
  vm._isDestroyed = true
  // 从vnode树上触发destroy钩子函数解绑指令
  vm.__patch__(vm._vnode, null)
  // 触发destroyed钩子
  callHook(vm, 'destroyed')
  // 移除所有的事件监听器
  vm.$off()
  // remove __vue__ reference
  if (vm.$el) {
    vm.$el.__vue__ = null
  }
  // release circular reference (#6759)
  if (vm.$vnode) {
    vm.$vnode.parent = null
  }
}
```

## `vm.$nextTick`

nextTick 接收一个回调函数作为参数，它的作用是将回调延迟到下次 DOM 更新周期之后执行。它与全局方法 Vue.nextTick 一样，不同的是回调的 this 自动绑定到调用它的实例上。

nextTick 的实现根据环境的支持，优先使用微任务 Promise,然后使用宏任务 setImmediate，但由于它存在兼容性问题，只能在 IE 中使用，所以使用 MutationChannel 作为备选方案。最后使用 setTimeout。

```js
// 是否使用微任务
export let isUsingMicroTask = false
// 存放异步执行的回调
const callbacks = []
// 一个标记位，如果已经有timerFunc被推送到任务队列中去则不需要重复推送
let pending = false
// 下一个tick时的回调
function flushCallbacks() {
  // 一个标记位，标记等待状态（即函数已经被推入任务队列或者主线程，已经在等待当前栈执行完毕去执行），这样就不需要在push多个回调到callbacks时将timerFunc多次推入任务队列或者主线程
  pending = false
  // 执行所有callback
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}
let timerFunc
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  // 使用Promise
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (
  !isIE &&
  typeof MutationObserver !== 'undefined' &&
  (isNative(MutationObserver) ||
    MutationObserver.toString() === '[object MutationObserverConstructor]')
) {
  // 使用MutationChannel
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // 使用setImmediate
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // 使用setTimeout
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}
export function nextTick(cb?: Function, ctx?: Object) {
  let _resolve
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  if (!pending) {
    pending = true
    timerFunc()
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
```

## `vm.$mount`

vm.\$mount 由于 Vue 版本的差异，在只包含运行时的构建版本，会默认实例上存在渲染函数，如果没有，则会设置在一个空节点的 VNode，而完整版，首先检查 template 或者 el 选项所提供的模版是否已经转换成渲染函数，如果没有，则进入编译过程，将模版编译成渲染函数，完成之后再进入挂载与渲染的流程。

### 完整版

```js
// 把原本不编译的$mount方法缓存下来,然后最后调用
const mount = Vue.prototype.$mount
// 重新定义$mount,模版编译
Vue.prototype.$mount = function(
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  // vue不能挂载到body、html根结点上
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' &&
      warn(
        `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
      )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  // 如果没有render,则将el或者template字符串转化为render方法
  // 处理模版template,编译成render函数,render不存在的时候才会编译template,否则优先使用render
  if (!options.render) {
    let template = options.template
    // template存在的时候取template，不存在的时候取el的outerHTML
    if (template) {
      // 当template是字符串的时候
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        return this
      }
    } else if (el) {
      // 获取element的outerHTML
      template = getOuterHTML(el)
    }
    if (template) {
      // 将template编译成render函数,这里会有render以及staticRenderFns两个返回,这是vue的编译时优化
      const { render, staticRenderFns } = compileToFunctions(
        template,
        {
          outputSourceRange: process.env.NODE_ENV !== 'production',
          shouldDecodeNewlines,
          shouldDecodeNewlinesForHref,
          delimiters: options.delimiters,
          comments: options.comments
        },
        this
      )
      options.render = render
      options.staticRenderFns = staticRenderFns
    }
  }
  return mount.call(this, el, hydrating)
}
```

### 运行时

```js
Vue.prototype.$mount = function(el, hydrating) {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

/*挂载组件*/
export function mountComponent(
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  if (!vm.$options.render) {
    /*render函数不存在的时候创建一个空的VNode节点*/
    vm.$options.render = createEmptyVNode
  }
  /*触发beforeMount钩子*/
  callHook(vm, 'beforeMount')

  /*updateComponent作为Watcher对象的getter函数，用来依赖收集*/
  let updateComponent

  updateComponent = () => {
    vm._update(vm._render(), hydrating)
  }
  /*这里对该vm注册一个Watcher实例，Watcher的getter为updateComponent函数，用于触发所有渲染所需要用到的数据的getter，进行依赖收集，该Watcher实例会存在所有渲染所需数据的闭包Dep中*/
  vm._watcher = new Watcher(vm, updateComponent, noop)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    /*标志位，代表该组件已经挂载*/
    vm._isMounted = true
    /*调用mounted钩子*/
    callHook(vm, 'mounted')
  }
  return vm
}
```
