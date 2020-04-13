# 生命周期

<img style="width: 60%" src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/lifecycle.png">

生命周期在整体上分为两部分：

- 第一部分初始阶段（new Vue()到 created）、模版编译阶段（created 到 beforeMount）与挂载阶段（beforeMount 到 mounted）
- 第二部分是卸载阶段(beforeDestroy 到 destroyed)

## new Vue()

Vue 只能通过 new 关键字来初始化，否则会报错。然后调用`this._init(options)`函数来执行生命周期的初始化过程。

```js
function Vue(options) {
  if (process.env.NODE_ENV !== 'production' && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
```

\_init 方法是通过 initMixin 方法将\_init 挂载到 Vue 构造函数原型上

```js
// 给Vue添加了_init方法
initMixin(Vue)

export function initMixin(Vue: Class<Component>) {
  Vue.prototype._init = function(options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 一个防止vm实例自身被观察的标志位
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        //
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 初始化生命周期
    initLifecycle(vm)
    // 初始化事件中心
    initEvents(vm)
    // 初始化渲染
    initRender(vm)
    // 调用beforeCreate钩子函数并且触发beforeCreated钩子事件
    callHook(vm, 'beforeCreate')
    // resolve provide after data/props
    initInjections(vm) // resolve injections before data/props
    // 初始化props、methods、data、computed与watch
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    // 调用created钩子函数并且触发created钩子事件
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      // 格式化组件名
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      // 挂载组件
      vm.$mount(vm.$options.el)
    }
  }
}
```

Vue 初始化主要就干了几件事情，合并配置，初始化生命周期，初始化事件中心，初始化渲染，初始化 data、props、computed、watcher 等等。

内部流程图：

<img style="width: 70%;" src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/_init%E6%96%B9%E6%B3%95.png">

## 合并配置

合并配置时判断\_isComponent

- 如果 true，则 initInternalComponent 才初始化 options，initInternalComponent 做了简单一层对象赋值，并不涉及到递归、合并策略等复杂逻辑，因为子组件初始化过程通过 initInternalComponent 方式要比外部初始化 Vue 通过 mergeOptions 的过程要快
- 如果不是，则将用户传递的 options 选项与当前构造函数的 options 属性及其父级实例构造函数的 options 属性，合并成一个新的 options。resolveConstructorOptions 是获取当前实例中构造函数的 options 选项及其所有父级的构造函数的 options。

```js
// merge options
if (options && options._isComponent) {
  // optimize internal component instantiation
  // since dynamic options merging is pretty slow, and none of the
  // internal component options needs special treatment.
  initInternalComponent(vm, options)
} else {
  vm.$options = mergeOptions(
    resolveConstructorOptions(vm.constructor),
    options || {},
    vm
  )
}

export function mergeOptions(
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  if (process.env.NODE_ENV !== 'production') {
    // 检查是否是有效的组件名
    checkComponents(child)
  }

  if (typeof child === 'function') {
    child = child.options
  }
  // 确保所有props option序列化成正确的格式
  normalizeProps(child, vm)
  // 将所有注入规范化为基于对象的格式
  normalizeInject(child, vm)
  // 将函数指令序列化后加入对象
  normalizeDirectives(child)

  if (!child._base) {
    // 将child的extends也加入parent扩展
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }
    // child的mixins加入parent中
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }

  const options = {}
  let key
  // 合并parent与child
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  function mergeField(key) {
    // strats里面存了options中每一个属性（el、props、watch等等）的合并方法，先取出
    const strat = strats[key] || defaultStrat
    // 根据合并方法来合并两个option
    // strats的作用，如何合并两个数据
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}
```

mergeField 的合并策略，对不同 key 有不同的合并策略。例如生命周期:用了一个多层 3 元运算符，逻辑就是如果不存在 childVal ，就返回 parentVal；否则再判断是否存在 parentVal，如果存在就把 childVal 添加到 parentVal 后返回新数组；否则返回 childVal 的数组。所以回到 mergeOptions 函数，一旦 parent 和 child 都定义了相同的钩子函数，那么它们会把 2 个钩子函数合并成一个数组。

```js
export const LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated',
  'errorCaptured',
  'serverPrefetch'
]

function mergeAssets(
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  const res = Object.create(parentVal || null)
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    return extend(res, childVal)
  } else {
    return res
  }
}

LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})
```

## 初始化生命周期属性

Vue 通过 initLifecycle 函数向实例挂载属性。

以\$开头的属性是提供给用户使用的外部属性。以\_开头的属性是提供给内部使用的属性。

```js
export function initLifecycle(vm: Component) {
  const options = vm.$options

  // locate first non-abstract parent
  let parent = options.parent
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)
  }
  // 第一个非抽象类型的父级
  vm.$parent = parent
  // 当前组件树实例的根Vue.js实例
  vm.$root = parent ? parent.$root : vm
  // 当前实例的直接子组件
  vm.$children = []
  vm.$refs = {}

  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}
```

## 初始化事件

将父组件在模版中使用的 v-on 注册的事件添加到子组件的事件系统中

```js
/*初始化事件*/
export function initEvents(vm: Component) {
  /*在vm上创建一个_events对象，用来存放事件。*/
  vm._events = Object.create(null)
  /*这个bool标志位来表明是否存在钩子，而不需要通过哈希表的方法来查找是否有钩子，这样做可以减少不必要的开销，优化性能。*/
  vm._hasHookEvent = false
  // init parent attached events
  /*初始化父组件attach的事件*/
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}
let target: Component

/*有once的时候注册一个只会触发一次的方法，没有once的时候注册一个事件方法*/
function add(event, fn, once) {
  if (once) {
    target.$once(event, fn)
  } else {
    target.$on(event, fn)
  }
}

/*销毁一个事件方法*/
function remove(event, fn) {
  target.$off(event, fn)
}

/*更新组件的监听事件*/
export function updateComponentListeners(
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, vm)
}

/*更新监听事件*/
export function updateListeners(
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  vm: Component
) {
  let name, cur, old, event
  /*遍历新事件的所有方法*/
  for (name in on) {
    cur = on[name]
    old = oldOn[name]

    /*取得并去除事件的~、!、&等前缀*/
    event = normalizeEvent(name)
    /*isUndef用于判断传入对象不等于undefined或者null*/
    if (isUndef(cur)) {
      /*新方法不存在抛出打印*/
      process.env.NODE_ENV !== 'production' &&
        warn(
          `Invalid handler for event "${event.name}": got ` + String(cur),
          vm
        )
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        /*createFnInvoker返回一个函数，该函数的作用是将生成时的fns执行，如果fns是数组，则便利执行它的每一项*/
        cur = on[name] = createFnInvoker(cur)
      }
      add(event.name, cur, event.once, event.capture, event.passive)
    } else if (cur !== old) {
      old.fns = cur
      on[name] = old
    }
  }
  /*移除所有旧的事件*/
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
```

## 初始化渲染方法

```js
/*初始化render*/
export function initRender(vm: Component) {
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null
  const parentVnode = (vm.$vnode = vm.$options._parentVnode) // the placeholder node in parent tree  父树中的占位符节点
  const renderContext = parentVnode && parentVnode.context
  vm.$slots = resolveSlots(vm.$options._renderChildren, renderContext)
  vm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  /*将createElement函数绑定到该实例上，该vm存在闭包中，不可修改，vm实例则固定。这样我们就可以得到正确的上下文渲染*/
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
  /*常规方法被用于公共版本，被用来作为用户界面的渲染方法*/
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
}
```

## 初始化 inject

```js
export function initInjections(vm: Component) {
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      /*为对象defineProperty上在变化时通知的属性*/
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
              `overwritten whenever the provided component re-renders. ` +
              `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
  }
}
// 读取用户在当前组件中设置的inject的key，然后循环key，将每一个key从当前组件起，
// 不断向父组件的_provided查找是否有该值，找到了就停止循环，最终将所有的key对应的值一起返回
export function resolveInject(inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    // isArray here
    const isArray = Array.isArray(inject)
    const result = Object.create(null)
    const keys = isArray
      ? inject
      : hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const provideKey = isArray ? key : inject[key]
      let source = vm
      while (source) {
        if (source._provided && provideKey in source._provided) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }
    }
    return result
  }
}
```

## 初始化状态

将 props、methods、data、computed 和 watch 在使用之前进行初始化。

```js
/*初始化props、methods、data、computed与watch*/
export function initState(vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  /*初始化props*/
  if (opts.props) initProps(vm, opts.props)
  /*初始化方法*/
  if (opts.methods) initMethods(vm, opts.methods)
  /*初始化data*/
  if (opts.data) {
    initData(vm)
  } else {
    /*该组件没有data的时候绑定一个空对象*/
    observe((vm._data = {}), true /* asRootData */)
  }
  /*初始化computed*/
  if (opts.computed) initComputed(vm, opts.computed)
  /*初始化watchers*/
  if (opts.watch) initWatch(vm, opts.watch)
}
```

## 初始化 provide

```js
export function initProvide(vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function' ? provide.call(vm) : provide
  }
}
```
