# 全局 API

入口：

```js
// src/core/index.js
initGlobalAPI(Vue)

// src/core/global-api/index.js
export function initGlobalAPI(Vue: GlobalAPI) {
  const configDef = {}
  configDef.get = () => config
  Object.defineProperty(Vue, 'config', configDef)
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick
  // 2.6 explicit observable API
  Vue.observable = T => {
    observe(obj)
    return obj
  }
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })
  Vue.options._base = Vue
  extend(Vue.options.components, builtInComponents)
  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}
```

## Vue.extend

创建一个 Sub 函数并继承父类。如果直接使用 Vue.extend，则 Sub 继承于 Vue 构造函数。

```js
Vue.extend = function(extendOptions: Object): Function {
  extendOptions = extendOptions || {}
  /*父类的构造*/
  const Super = this
  /*父类的cid*/
  const SuperId = Super.cid
  const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
  /*如果构造函数中已经存在了该cid，则代表已经extend过了，直接返回*/
  if (cachedCtors[SuperId]) {
    return cachedCtors[SuperId]
  }

  const name = extendOptions.name || Super.options.name
  if (process.env.NODE_ENV !== 'production' && name) {
    /*name只能包含字母与连字符*/
    validateComponentName(name)
  }
  /*
      Sub构造函数其实就一个_init方法，这跟Vue的构造方法是一致的，在_init中处理各种数据初始化、生命周期等。
      因为Sub作为一个Vue的扩展构造器，所以基础的功能还是需要保持一致，跟Vue构造器一样在构造函数中初始化_init。
    */
  const Sub = function VueComponent(options) {
    this._init(options)
  }
  /*继承父类*/
  Sub.prototype = Object.create(Super.prototype)
  /*构造函数*/
  Sub.prototype.constructor = Sub
  /*创建一个新的cid*/
  Sub.cid = cid++
  /*将父组件的options与子组件的合并到一起(Vue有一个cid为0的基类，即Vue本身，会将一些默认初始化的option何入)*/
  Sub.options = mergeOptions(Super.options, extendOptions)
  /*es6语法，super为父类构造*/
  Sub['super'] = Super

  // For props and computed properties, we define the proxy getters on
  // the Vue instances at extension time, on the extended prototype. This
  // avoids Object.defineProperty calls for each instance created.
  /*在扩展时，我们将计算属性以及props通过代理绑定在Vue实例上（也就是vm），这也避免了Object.defineProperty被每一个实例调用*/
  if (Sub.options.props) {
    initProps(Sub)
  }
  /*处理计算属性，给计算属性设置defineProperty并绑定在vm上*/
  if (Sub.options.computed) {
    initComputed(Sub)
  }

  // allow further extension/mixin/plugin usage
  /*加入extend、mixin以及use方法，允许将来继续为该组件提供扩展、混合或者插件*/
  Sub.extend = Super.extend
  Sub.mixin = Super.mixin
  Sub.use = Super.use

  // create asset registers, so extended classes
  // can have their private assets too.
  /*使得Sub也会拥有父类的私有选项（directives、filters、components）*/
  ASSET_TYPES.forEach(function(type) {
    Sub[type] = Super[type]
  })
  // enable recursive self-lookup
  /*把组件自身也加入components中，为递归自身提供可能（递归组件也会查找components是否存在当前组件，也就是自身）*/
  if (name) {
    Sub.options.components[name] = Sub
  }

  // keep a reference to the super options at extension time.
  // later at instantiation we can check if Super's options have
  // been updated.
  /*保存一个父类的options，此后我们可以用来检测父类的options是否已经被更新*/
  Sub.superOptions = Super.options
  /*extendOptions存储起来*/
  Sub.extendOptions = extendOptions
  /*保存一份option，extend的作用是将Sub.options中的所有属性放入{}中*/
  Sub.sealedOptions = extend({}, Sub.options)

  // cache constructor
  /*缓存构造函数（用cid），防止重复extend*/
  cachedCtors[SuperId] = Sub
  return Sub
}
```

## Vue.nextTick

Vue.nextTick 原理跟 vm.\$nextTick 一样

```js
Vue.nextTick = nextTick
```

## Vue.set

Vue.set 原理跟 vm.\$set 一样

```js
Vue.set = set
```

## Vue.delete

Vue.delete 原理跟 vm.\$delete 一样

```js
Vue.delete = delete
```

## Vue.directive

Vue.directive 方法接收两个参数 id 和 definition，它可以注册或获取指令，这取决于 definition 参数是否存在，

- 如果 definition 不存在，则使用 id 从 this.options['directive']读取指令并将其返回；
- 如果 definition 存在，则说明是注册操作，那么进而判断 definition 是否为函数，
  - 如果是函数，则默认监听 bind 和 update 两个事件。
  - 如果不是函数，说明它是用户自定义的指令对象，此时不需要做任何的操作，直接将用户提供的指令保存到 this.options['directive']中

```js
export const ASSET_TYPES = ['component', 'directive', 'filter']
ASSET_TYPES.forEach(type => {
  Vue[type] = function(
    id: string,
    definition: Function | Object
  ): Function | Object | void {
    if (!definition) {
      return this.options[type + 's'][id]
    } else {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && type === 'component') {
        validateComponentName(id)
      }
      if (type === 'component' && isPlainObject(definition)) {
        definition.name = definition.name || id
        definition = this.options._base.extend(definition)
      }
      if (type === 'directive' && typeof definition === 'function') {
        definition = { bind: definition, update: definition }
      }
      this.options[type + 's'][id] = definition
      return definition
    }
  }
})
```

## Vue.filter

Vue.filter 方法接收两个参数 id 和 definition，它可以注册或获取指令，这取决于 definition 参数是否存在，

- 如果 definition 不存在，则使用 id 从 this.options['directive']读取指令并将其返回；
- 如果 definition 存在，则说明是注册操作，保存到 this.options['directive']中。如果发现 definition 是对象类型，则调用 Vue.extend 方法把它变成 Vue 的子类，使用 Vue.components 注册组件，如果选项中没有这是组件名，则自动使用给定的 id 设置组件名称。

```js
export const ASSET_TYPES = ['component', 'directive', 'filter']
ASSET_TYPES.forEach(type => {
  Vue[type] = function(
    id: string,
    definition: Function | Object
  ): Function | Object | void {
    if (!definition) {
      return this.options[type + 's'][id]
    } else {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && type === 'component') {
        validateComponentName(id)
      }
      if (type === 'component' && isPlainObject(definition)) {
        definition.name = definition.name || id
        definition = this.options._base.extend(definition)
      }
      if (type === 'directive' && typeof definition === 'function') {
        definition = { bind: definition, update: definition }
      }
      this.options[type + 's'][id] = definition
      return definition
    }
  }
})
```

## Vue.component

Vue.component 方法接收两个参数 id 和 definition，它可以注册或获取指令，这取决于 definition 参数是否存在，

- 如果 definition 不存在，则使用 id 从 this.options['directive']读取指令并将其返回；
- 如果 definition 存在，则说明是注册操作，保存到 this.options['directive']中。

```js
export const ASSET_TYPES = ['component', 'directive', 'filter']
ASSET_TYPES.forEach(type => {
  Vue[type] = function(
    id: string,
    definition: Function | Object
  ): Function | Object | void {
    if (!definition) {
      return this.options[type + 's'][id]
    } else {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && type === 'component') {
        validateComponentName(id)
      }
      if (type === 'component' && isPlainObject(definition)) {
        definition.name = definition.name || id
        definition = this.options._base.extend(definition)
      }
      if (type === 'directive' && typeof definition === 'function') {
        definition = { bind: definition, update: definition }
      }
      this.options[type + 's'][id] = definition
      return definition
    }
  }
})
```

## Vue.use

作用是注册插件，调用 install 方法并将 Vue 作为参数传入。有两个部分逻辑需要处理：

- 插件的类型，可以是 install 方法，也可以是一个包含 install 方法的对象。
- 插件只能被安装一次，保证插件列表中不能有重复的插件

```js
Vue.use = function(plugin: Function | Object) {
  const installedPlugins =
    this._installedPlugins || (this._installedPlugins = [])
  // 标识位检测该插件是否已经被安装
  if (installedPlugins.indexOf(plugin) > -1) {
    return this
  }

  // additional parameters
  const args = toArray(arguments, 1)
  args.unshift(this)
  // 执行插件安装
  if (typeof plugin.install === 'function') {
    plugin.install.apply(plugin, args)
  } else if (typeof plugin === 'function') {
    plugin.apply(null, args)
  }
  installedPlugins.push(plugin)
  return this
}
```

## Vue.mixin

Vue.mixin 方法注册后，会影响之后创建的每个 Vue.js 实例，因为该方法会更改 Vue.options 属性。

原理：将用户传入的对象与 Vue.js 自身的 options 属性合并到一起。

```js
Vue.mixin = function(mixin: Object) {
  this.options = mergeOptions(this.options, mixin)
  return this
}
```

## Vue.compile

只有在完整版里有效

```js
// src/platforms/web/entry-runtime-with-compiler.js
Vue.compile = compileToFunctions
```

## Vue.version

Vue.js 安装的版本号。在构建文件的过程中，我们会读取 package.json 文件中的 version，并将读取的版本号设置到 Vue.version 上。

```js
// scripts/config.js
const version = process.env.VERSION || require('../package.json').version
// built-in vars
const vars = {
  __WEEX__: !!opts.weex,
  __WEEX_VERSION__: weexVersion,
  __VERSION__: version
}
// feature flags
Object.keys(featureFlags).forEach(key => {
  vars[`process.env.${key}`] = featureFlags[key]
})
// build-specific env
if (opts.env) {
  vars['process.env.NODE_ENV'] = JSON.stringify(opts.env)
}
config.plugins.push(replace(vars))

// src/core/index.js
Vue.version = '__VERSION__'
```
