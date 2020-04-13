# 路由注册

`Vue-Router` 的入口文件是 `src/index.js`，其中定义了 `VueRouter` 类，也实现了 `install` 的静态方法：`VueRouter.install = install`，它的定义在 `src/install.js` 中。

```js
export let _Vue
export function install(Vue) {
  // 判断是否注册过Vue Router 重复注册
  if (install.installed && _Vue === Vue) return
  // 已安装的标志位
  install.installed = true
  // 将Vue保存到_Vue上
  _Vue = Vue
  // 判断变量是否有值
  const isDef = v => v !== undefined
  // 注册路由的实例，callVal不传则为销毁当前组件
  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    if (
      isDef(i) &&
      isDef((i = i.data)) &&
      isDef((i = i.registerRouteInstance))
    ) {
      i(vm, callVal)
    }
  }
  // 通过Vue.mixin将beforeCreate，destroyed钩子函数注入到每一个组件中
  Vue.mixin({
    beforeCreate() {
      // 判断有没有VueRouter实例
      if (isDef(this.$options.router)) {
        this._routerRoot = this
        this._router = this.$options.router
        // 将当前Vue实例存储到VueRouter实例的apps上，如果是根组件，那么还会将根组件保存到this.app上并且会拿到当前的 this.history
        this._router.init(this)
        // 当前Vue实例定义_route
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
    destroyed() {
      registerInstance(this)
    }
  })
  // 在Vue构造函数的原型上定义$router
  Object.defineProperty(Vue.prototype, '$router', {
    get() {
      return this._routerRoot._router
    }
  })
  // 在Vue构造函数的原型上定义$route
  Object.defineProperty(Vue.prototype, '$route', {
    get() {
      return this._routerRoot._route
    }
  })
  // 注册router-view组件
  Vue.component('RouterView', View)
  // 注册router-link组件
  Vue.component('RouterLink', Link)

  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate =
    strats.created
}
```
