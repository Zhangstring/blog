# 路由模式

路由有三种模式：hash、history 和 abstract。

- history：通过 HTML5 History 的 API，可以读取浏览器历史记录栈的信息，进行各种跳转操作。
- hash：在源码实现中优化使用 History，不支持在使用通过监听`hashchange`事件来实现。
- abstract：不涉及和浏览器地址的相关记录，通过数组模拟浏览器历史记录栈的功能

调用 history.pushState()相比于直接修改 hash 主要有以下优势：

- pushState 设置的新 url 可以是与当前 url 同源的任意 url,而 hash 只可修改#后面的部分，故只可设置与当前同文档的 url
- pushState 设置的新 url 可以与当前 url 一模一样，这样也会把记录添加到栈中，而 hash 设置的新值必须与原来不一样才会触发记录添加到栈中
- pushState 通过 stateObject 可以添加任意类型的数据记录中，而 hash 只可添加短字符串
- pushState 可额外设置 title 属性供后续使用

## base

```js
export class History {
  constructor(router: Router, base: ?string) {
    // VueRouter实例
    this.router = router
    // 应用的基路径规范化
    this.base = normalizeBase(base)
    // start with a route object that stands for "nowhere"
    // 当前路径
    this.current = START
    this.pending = null
    this.ready = false
    this.readyCbs = []
    this.readyErrorCbs = []
    this.errorCbs = []
  }

  listen(cb: Function) {
    this.cb = cb
  }

  onReady(cb: Function, errorCb: ?Function) {
    if (this.ready) {
      cb()
    } else {
      this.readyCbs.push(cb)
      if (errorCb) {
        this.readyErrorCbs.push(errorCb)
      }
    }
  }

  onError(errorCb: Function) {
    this.errorCbs.push(errorCb)
  }
  // 跳转
  transitionTo(
    location: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) {
    // 获取跳转路由地址
    const route = this.router.match(location, this.current)
    // 切换
    this.confirmTransition(
      route,
      () => {
        this.updateRoute(route)
        onComplete && onComplete(route)
        this.ensureURL()

        // fire ready cbs once
        if (!this.ready) {
          this.ready = true
          this.readyCbs.forEach(cb => {
            cb(route)
          })
        }
      },
      err => {
        if (onAbort) {
          onAbort(err)
        }
        if (err && !this.ready) {
          this.ready = true
          this.readyErrorCbs.forEach(cb => {
            cb(err)
          })
        }
      }
    )
  }

  confirmTransition(route: Route, onComplete: Function, onAbort?: Function) {
    const current = this.current
    const abort = err => {
      // after merging https://github.com/vuejs/vue-router/pull/2771 we
      // When the user navigates through history through back/forward buttons
      // we do not want to throw the error. We only throw it if directly calling
      // push/replace. That's why it's not included in isError
      if (!isExtendedError(NavigationDuplicated, err) && isError(err)) {
        if (this.errorCbs.length) {
          this.errorCbs.forEach(cb => {
            cb(err)
          })
        } else {
          warn(false, 'uncaught error during route navigation:')
          console.error(err)
        }
      }
      onAbort && onAbort(err)
    }
    // 跳转地址和当前路径相同
    if (
      isSameRoute(route, current) &&
      // in the case the route map has been dynamically appended to
      route.matched.length === current.matched.length
    ) {
      // 替换当前url
      this.ensureURL()
      return abort(new NavigationDuplicated(route))
    }
    // 解析出需要变化的组件钩子函数
    const { updated, deactivated, activated } = resolveQueue(
      this.current.matched,
      route.matched
    )

    const queue: Array<?NavigationGuard> = [].concat(
      // in-component leave guards
      // 在失活的组件里调用离开守卫
      extractLeaveGuards(deactivated),
      // global before hooks
      // 调用全局的 beforeEach 守卫
      this.router.beforeHooks,
      // in-component update hooks
      // 在重用的组件里调用 beforeRouteUpdate 守卫
      extractUpdateHooks(updated),
      // in-config enter guards
      // 在激活的路由配置里调用 beforeEnter
      activated.map(m => m.beforeEnter),
      // async components
      // 解析异步路由组件
      resolveAsyncComponents(activated)
    )

    this.pending = route
    // 去执行每一个 导航守卫 hook，并传入 route、current 和匿名函数，这些参数对应文档中的 to、from、next，
    // 当执行了匿名函数，会根据一些条件执行 abort 或 next，
    // 只有执行 next 的时候，才会前进到下一个导航守卫钩子函数中
    const iterator = (hook: NavigationGuard, next) => {
      if (this.pending !== route) {
        return abort()
      }
      try {
        hook(route, current, (to: any) => {
          if (to === false || isError(to)) {
            // next(false) -> abort navigation, ensure current URL
            this.ensureURL(true)
            abort(to)
          } else if (
            typeof to === 'string' ||
            (typeof to === 'object' &&
              (typeof to.path === 'string' || typeof to.name === 'string'))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort()
            if (typeof to === 'object' && to.replace) {
              this.replace(to)
            } else {
              this.push(to)
            }
          } else {
            // confirm transition and pass on the value
            next(to)
          }
        })
      } catch (e) {
        abort(e)
      }
    }
    // 异步函数队列化执行
    runQueue(queue, iterator, () => {
      const postEnterCbs = []
      const isValid = () => this.current === route
      // wait until async components are resolved before
      // extracting in-component enter guards
      const enterGuards = extractEnterGuards(activated, postEnterCbs, isValid)
      const queue = enterGuards.concat(this.router.resolveHooks)
      runQueue(queue, iterator, () => {
        if (this.pending !== route) {
          return abort()
        }
        this.pending = null
        onComplete(route)
        if (this.router.app) {
          this.router.app.$nextTick(() => {
            postEnterCbs.forEach(cb => {
              cb()
            })
          })
        }
      })
    })
  }

  updateRoute(route: Route) {
    const prev = this.current
    this.current = route
    this.cb && this.cb(route)
    this.router.afterHooks.forEach(hook => {
      hook && hook(route, prev)
    })
  }
}
```
