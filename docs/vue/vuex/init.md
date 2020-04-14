# 初始化

Vuex 是一个专为 Vue 服务，用于管理页面数据状态、提供统一数据操作的生态系统。它集中于 MVC 模式中的 Model 层，规定所有的数据操作必须通过 `action` - `mutation` - `state change` 的流程来进行，再结合 Vue 的数据视图双向绑定特性来实现页面的展示更新。统一的页面状态管理以及操作处理，可以让复杂的组件交互变得简单清晰，同时可在调试模式下进行时光机般的倒退前进操作，查看数据改变过程，使 code debug 更加方便。

## install

Vuex 的注册方法主要是将 store 实例挂载到所有组件实例上，并且每个组件获取的 store 是同一个实例，实现是通过 Vue.mixin 将`vuexInit`方法合并到所有实例上的 beforeCreated 上，当组件触发 beforeCreated 时有两种情况：

- 如果 options 中有 store 存在，说明这个是根组件实例，
  - 如果 store 是函数，执行 store 并赋值到当前组件 this.\$store 上，
  - 如果不是则直接赋值到 this.\$store。
- 如果 options 不存在 store，则查找父组件中有无$store属性，如果有则将父组件的$store 赋值到当前组件的 this.\$store。

```js
// src/index.js
import { Store, install } from './store'
export default {
  Store,
  install,
  version: '__VERSION__',
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers
}
```

和 Vue-Router 一样，Vuex 也同样存在一个静态的 install 方法，它的定义在 src/store.js 中：

```js
// src/store.js
import applyMixin from './mixin'
export function install(_Vue) {
  if (Vue && _Vue === Vue) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}
```

install 的逻辑很简单，把传入的 \_Vue 赋值给 Vue 并执行了 applyMixin(Vue) 方法.

```js
// src/mixin.js
export default function(Vue) {
  // 获取Vue的版本号
  const version = Number(Vue.version.split('.')[0])
  // 兼容1.x
  if (version >= 2) {
    Vue.mixin({ beforeCreate: vuexInit })
  } else {
    // override init and inject vuex init procedure
    // for 1.x backwards compatibility.
    const _init = Vue.prototype._init
    Vue.prototype._init = function(options = {}) {
      options.init = options.init ? [vuexInit].concat(options.init) : vuexInit
      _init.call(this, options)
    }
  }

  /**
   * Vuex init hook, injected into each instances init hooks list.
   */
  // 向每个实例组件都添加$store
  function vuexInit() {
    const options = this.$options
    // store injection
    if (options.store) {
      this.$store =
        typeof options.store === 'function' ? options.store() : options.store
    } else if (options.parent && options.parent.$store) {
      this.$store = options.parent.$store
    }
  }
}
```

## store 实例化

主要逻辑：

- 将传入 store 的传入的 options 或默认值来初始化内部数据
- module 树构造
- dispatch 与 commit 设置
- module 安装
  - 初始化 rootState
  - module 上下文环境设置
  - mutations、actions 以及 getters 注册
  - 子 module 安装
- store 组件的初始化
- plugin 注入

例如：

```js
const store = new Vuex.Store({
  actions,
  getters,
  state,
  mutations,
  modules
})
```

### new Store()

```js
export class Store {
  constructor(options = {}) {
    // Auto install if it is not done yet and `window` has `Vue`.
    // To allow users to avoid auto-installation in some cases,
    // this code should be placed here. See #731
    if (!Vue && typeof window !== 'undefined' && window.Vue) {
      install(window.Vue)
    }

    if (process.env.NODE_ENV !== 'production') {
      assert(Vue, `must call Vue.use(Vuex) before creating a store instance.`)
      assert(
        typeof Promise !== 'undefined',
        `vuex requires a Promise polyfill in this browser.`
      )
      assert(
        this instanceof Store,
        `store must be called with the new operator.`
      )
    }

    const { plugins = [], strict = false } = options

    // store internal state
    this._committing = false
    // 存储action
    this._actions = Object.create(null)
    // 订阅action
    this._actionSubscribers = []
    // 存储mutation
    this._mutations = Object.create(null)
    // 存储getter
    this._wrappedGetters = Object.create(null)
    // 对模块初始化，建立一颗完整模块树
    this._modules = new ModuleCollection(options)
    this._modulesNamespaceMap = Object.create(null)
    // 订阅mutation
    this._subscribers = []
    this._watcherVM = new Vue()
    this._makeLocalGettersCache = Object.create(null)

    // bind commit and dispatch to self
    const store = this
    const { dispatch, commit } = this
    // 封装替换原型中的dispatch和commit方法，将this指向当前store对象
    this.dispatch = function boundDispatch(type, payload) {
      return dispatch.call(store, type, payload)
    }
    this.commit = function boundCommit(type, payload, options) {
      return commit.call(store, type, payload, options)
    }

    // strict mode
    this.strict = strict

    const state = this._modules.root.state

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    // 模块安装
    installModule(this, state, [], this._modules.root)

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    // 初始化VM
    resetStoreVM(this, state)

    // apply plugins
    // 使用插件
    plugins.forEach(plugin => plugin(this))

    const useDevtools =
      options.devtools !== undefined ? options.devtools : Vue.config.devtools
    if (useDevtools) {
      devtoolPlugin(this)
    }
  }

  get state() {
    return this._vm._data.$$state
  }

  set state(v) {
    if (process.env.NODE_ENV !== 'production') {
      assert(false, `use store.replaceState() to explicit replace store state.`)
    }
  }

  commit(_type, _payload, _options) {
    // check object-style commit
    const { type, payload, options } = unifyObjectStyle(
      _type,
      _payload,
      _options
    )

    const mutation = { type, payload }
    // 从_mutations获取当前回调函数
    const entry = this._mutations[type]
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown mutation type: ${type}`)
      }
      return
    }
    // _withCommit是一个代理方法，所有触发mutation的进行state修改的操作都经过它，由此来统一管理监控state状态的修改
    this._withCommit(() => {
      // 执行回调函数
      entry.forEach(function commitIterator(handler) {
        handler(payload)
      })
    })
    // 订阅者函数遍历执行，传入当前的mutation对象和当前的state
    this._subscribers
      .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
      .forEach(sub => sub(mutation, this.state))

    if (process.env.NODE_ENV !== 'production' && options && options.silent) {
      console.warn(
        `[vuex] mutation type: ${type}. Silent option has been removed. ` +
          'Use the filter functionality in the vue-devtools'
      )
    }
  }

  dispatch(_type, _payload) {
    // check object-style dispatch
    const { type, payload } = unifyObjectStyle(_type, _payload)

    const action = { type, payload }
    // 从_mutations获取对应的回调函数
    const entry = this._actions[type]
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown action type: ${type}`)
      }
      return
    }

    try {
      this._actionSubscribers
        .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
        .filter(sub => sub.before)
        .forEach(sub => sub.before(action, this.state))
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[vuex] error in before action subscribers: `)
        console.error(e)
      }
    }
    // entry长度大于1，用Promise.all同步执行。
    const result =
      entry.length > 1
        ? Promise.all(entry.map(handler => handler(payload)))
        : entry[0](payload)
    // 执行回调函数
    return result.then(res => {
      try {
        this._actionSubscribers
          .filter(sub => sub.after)
          .forEach(sub => sub.after(action, this.state))
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[vuex] error in after action subscribers: `)
          console.error(e)
        }
      }
      return res
    })
  }
  // 对 fn 包装了一个环境，确保在 fn 中执行任何逻辑的时候 this._committing = true。
  // 所以外部任何非通过 Vuex 提供的接口直接操作修改 state 的行为都会在开发阶段触发警告
  _withCommit(fn) {
    // 保存之前的提交状态
    const committing = this._committing
    // 进行本次提交，若不设置为true，直接修改state，strict模式下，Vuex将会产生非法修改state的警告
    this._committing = true
    // 执行state的修改操作
    fn()
    // 修改完成，还原本次修改之前的状态
    this._committing = committing
  }
}
```

### 初始化模块

模块对于 Vuex 的意义：由于使用单一状态树，应用的所有状态会集中到一个比较大的对象，当应用变得非常复杂时，store 对象就有可能变得相当臃肿。为了解决以上问题，Vuex 允许我们将 store 分割成模块（module）。每个模块拥有自己的 state、mutation、action、getter，甚至是嵌套子模块——从上至下进行同样方式的分割：

```js
const moduleA = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... }
}

const moduleB = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... },
}

const store = new Vuex.Store({
  modules: {
    a: moduleA,
    b: moduleB
  }
})

store.state.a // -> moduleA 的状态
store.state.b // -> moduleB 的状态
```

#### ModuleCollection

```js
this._modules = new ModuleCollection(options)

export default class ModuleCollection {
  constructor(rawRootModule) {
    // register root module (Vuex.Store options)
    // 建立一颗完整的模块树
    this.register([], rawRootModule, false)
  }

  get(path) {
    return path.reduce((module, key) => {
      return module.getChild(key)
    }, this.root)
  }
  // 获取命名空间
  getNamespace(path) {
    let module = this.root
    return path.reduce((namespace, key) => {
      module = module.getChild(key)
      return namespace + (module.namespaced ? key + '/' : '')
    }, '')
  }

  update(rawRootModule) {
    update([], this.root, rawRootModule)
  }

  register(path, rawModule, runtime = true) {
    if (process.env.NODE_ENV !== 'production') {
      assertRawModule(path, rawModule)
    }

    const newModule = new Module(rawModule, runtime)
    if (path.length === 0) {
      // 根模块
      this.root = newModule
    } else {
      // 根据路径获取到父模块
      const parent = this.get(path.slice(0, -1))
      // 然后再调用父模块的 addChild 方法建立父子关系
      parent.addChild(path[path.length - 1], newModule)
    }

    // register nested modules
    if (rawModule.modules) {
      // 遍历当前模块定义中的所有 modules，根据 key 作为 path，递归调用 register 方法
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }

  unregister(path) {
    const parent = this.get(path.slice(0, -1))
    const key = path[path.length - 1]
    if (!parent.getChild(key).runtime) return

    parent.removeChild(key)
  }
}
```

#### Module

```js
export default class Module {
  constructor(rawModule, runtime) {
    this.runtime = runtime
    // Store some children item
    this._children = Object.create(null)
    // Store the origin module object which passed by programmer
    this._rawModule = rawModule
    const rawState = rawModule.state

    // Store the origin module's state
    // 模块的state
    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {}
  }

  get namespaced() {
    return !!this._rawModule.namespaced
  }

  addChild(key, module) {
    this._children[key] = module
  }

  removeChild(key) {
    delete this._children[key]
  }

  getChild(key) {
    return this._children[key]
  }

  update(rawModule) {
    this._rawModule.namespaced = rawModule.namespaced
    if (rawModule.actions) {
      this._rawModule.actions = rawModule.actions
    }
    if (rawModule.mutations) {
      this._rawModule.mutations = rawModule.mutations
    }
    if (rawModule.getters) {
      this._rawModule.getters = rawModule.getters
    }
  }

  forEachChild(fn) {
    forEachValue(this._children, fn)
  }

  forEachGetter(fn) {
    if (this._rawModule.getters) {
      forEachValue(this._rawModule.getters, fn)
    }
  }

  forEachAction(fn) {
    if (this._rawModule.actions) {
      forEachValue(this._rawModule.actions, fn)
    }
  }

  forEachMutation(fn) {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn)
    }
  }
}
```

```js
// 完成了模块下的 state、getters、actions、mutations 的初始化工作，并且通过递归遍历的方式，就完成了所有子模块的安装工作
function installModule(store, rootState, path, module, hot) {
  const isRoot = !path.length
  // 根据 path 获取 namespace
  const namespace = store._modules.getNamespace(path)

  // register in namespace map
  // 注册在全局命名空间
  if (module.namespaced) {
    if (
      store._modulesNamespaceMap[namespace] &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.error(
        `[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join(
          '/'
        )}`
      )
    }
    store._modulesNamespaceMap[namespace] = module
  }

  // set state
  if (!isRoot && !hot) {
    const parentState = getNestedState(rootState, path.slice(0, -1))
    const moduleName = path[path.length - 1]
    store._withCommit(() => {
      if (process.env.NODE_ENV !== 'production') {
        if (moduleName in parentState) {
          console.warn(
            `[vuex] state field "${moduleName}" was overridden by a module with the same name at "${path.join(
              '.'
            )}"`
          )
        }
      }
      Vue.set(parentState, moduleName, module.state)
    })
  }
  // 构造了一个本地上下文环境
  const local = (module.context = makeLocalContext(store, namespace, path))
  // mutations注册store._mutations
  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })
  // actions注册store._actions
  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key
    const handler = action.handler || action
    registerAction(store, type, handler, local)
  })
  // getters注册到store._wrappedGetters
  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })
  // 遍历模块中的所有子 modules，递归执行 installModule 方法
  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
}
```

### 初始化 store.\_vm

Vuex 其实构建的就是一个名为 store 的 vm 组件，所有配置的 state、actions、mutations 以及 getters 都是其组件的属性，所有的操作都是对这个 vm 组件进行的。

作用是建立 getters 和 state 的联系，因为从设计上 getters 的获取就依赖了 state ，并且希望它的依赖能被缓存起来，且只有当它的依赖值发生了改变才会被重新计算。因此这里利用了 Vue 中用 computed 计算属性来实现

```js
function resetStoreVM(store, state, hot) {
  // 缓存前vm组件
  const oldVm = store._vm

  // bind store public getters
  store.getters = {}
  // reset local getters cache
  store._makeLocalGettersCache = Object.create(null)
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  // 循环所有处理过的getters，并新建computed对象进行存储，
  // 通过Object.defineProperty方法为getters对象建立属性，
  // 使得我们通过this.$store.getters.xxxgetter能够访问到该getters
  forEachValue(wrappedGetters, (fn, key) => {
    // 使用计算来利用其延迟缓存机制
    // 直接使用内联函数将导致关闭并保留oldVm。
    // 使用局部返回函数，仅保留在闭包环境中保留的参数。
    computed[key] = partial(fn, store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  const silent = Vue.config.silent
  // // 暂时将Vue设为静默模式，避免报出用户加载的某些插件触发的警告
  Vue.config.silent = true
  // 设置新的storeVm，将当前初始化的state以及getters作为computed属性（刚刚遍历生成的）
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent

  // enable strict mode for new vm
  if (store.strict) {
    // 当 store.state 被修改的时候, store._committing 必须为 true，否则在开发阶段会报警告。
    enableStrictMode(store)
  }

  if (oldVm) {
    if (hot) {
      // dispatch changes in all subscribed watchers
      // to force getter re-evaluation for hot reloading.
      store._withCommit(() => {
        oldVm._data.$$state = null
      })
    }
    Vue.nextTick(() => oldVm.$destroy())
  }
}
```
