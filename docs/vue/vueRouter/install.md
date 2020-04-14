# Introduction

随着 ajax 的流行，异步数据请求交互运行在不刷新浏览器的情况下进行。而异步交互体验的更高级版本就是 SPA —— 单页应用。单页应用不仅仅是在页面交互是无刷新的，连页面跳转都是无刷新的，为了实现单页应用，所以就有了前端路由。

前端路由实现分为 2 种：

- hash：`url` 上 `hash` 的变化，不会导致浏览器向服务器发出请求，浏览器不发出请求，也就不会刷新页面。每次 `hash` 的变化，会触发 `hashchange` 事件，可以通过监听 `hashchange` 来实现更新页面部分内容的操作。
- history：`HTML5` 中通过 `History` 的 API 可以改变 url 地址且不会发送请求。相比较 `hash`，history 更加美观，但是由于用户刷新页面等操作，浏览器还是发送请求给服务器，如果服务器不设置重定向到根页面，会导致 404。

流程图：

<img class="preview" src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/vue%20router.png">

<img class="preview" src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/vuerouter.png">

## 路由注册

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
        // 作用：<router-view>中访问了parent.$route，
        // 其中$route是访问this._routerRoot._route，触发了_route的getter,对<router-view>有依赖
        // 当跳转路由时updateRoute会修改history.current的值和在apps中所有实例的_route，
        // 修改了_route就会触发setter,会通知<router-view>重新渲染组件
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
