# matcher

VueRouter 实例的`mather`属性是由`createMatcher`函数创建的

```js
// src/index.js
this.matcher = createMatcher(options.routes || [], this)
```

```js
export function createMatcher(
  routes: Array<RouteConfig>,
  router: VueRouter
): Matcher {
  // 创建一个路由映射表
  const { pathList, pathMap, nameMap } = createRouteMap(routes)
  // 动态添加路由配置
  function addRoutes(routes) {
    createRouteMap(routes, pathList, pathMap, nameMap)
  }
  // 返回的是一个路径，它的作用是根据传入的 raw 和当前的路径 currentRoute 计算出一个新的路径并返回
  function match(
    raw: RawLocation,
    currentRoute?: Route,
    redirectedFrom?: Location
  ): Route {
    //根据 raw，current 计算出新的 location，它主要处理了 raw 的两种情况，
    // 一种是有 params 且没有 path，
    // 一种是有 path 的，对于第一种情况，
    // 如果 current 有 name，则计算出的 location 也有 name。
    // 计算出新的 location 后，对 location 的 name 和 path 的两种情况做了处理
    const location = normalizeLocation(raw, currentRoute, false, router)
    const { name } = location

    if (name) {
      // 有 name 的情况下就根据 nameMap 匹配到 record，它就是一个 RouterRecord 对象
      const record = nameMap[name]
      if (process.env.NODE_ENV !== 'production') {
        warn(record, `Route with name '${name}' does not exist`)
      }
      // 如果 record 不存在，则匹配失败，返回一个空路径
      if (!record) return _createRoute(null, location)
      // 拿到 record 对应的 paramNames
      const paramNames = record.regex.keys
        .filter(key => !key.optional)
        .map(key => key.name)

      if (typeof location.params !== 'object') {
        location.params = {}
      }
      // 对比 currentRoute 中的 params，把交集部分的 params 添加到 location 中
      if (currentRoute && typeof currentRoute.params === 'object') {
        for (const key in currentRoute.params) {
          if (!(key in location.params) && paramNames.indexOf(key) > -1) {
            location.params[key] = currentRoute.params[key]
          }
        }
      }
      // 根据 record.path 和 location.path 计算出 location.path
      location.path = fillParams(
        record.path,
        location.params,
        `named route "${name}"`
      )
      // 生成一条新路径
      return _createRoute(record, location, redirectedFrom)
    } else if (location.path) {
      // 计算后的 location.path 是一个真实路径，而 record 中的 path 可能会有 param，
      // 因此需要对所有的 pathList 做顺序遍历，
      // 然后通过 matchRoute 方法根据 record.regex、location.path、location.params 匹配，
      // 如果匹配到则也通过 _createRoute(record, location, redirectedFrom) 去生成一条新路径。
      // 因为是顺序遍历，所以我们书写路由配置要注意路径的顺序，因为写在前面的会优先尝试匹配。
      location.params = {}
      for (let i = 0; i < pathList.length; i++) {
        const path = pathList[i]
        const record = pathMap[path]
        if (matchRoute(record.regex, location.path, location.params)) {
          return _createRoute(record, location, redirectedFrom)
        }
      }
    }
    // no match
    return _createRoute(null, location)
  }

  function redirect(record: RouteRecord, location: Location): Route {
    const originalRedirect = record.redirect
    let redirect =
      typeof originalRedirect === 'function'
        ? originalRedirect(createRoute(record, location, null, router))
        : originalRedirect

    if (typeof redirect === 'string') {
      redirect = { path: redirect }
    }

    if (!redirect || typeof redirect !== 'object') {
      if (process.env.NODE_ENV !== 'production') {
        warn(false, `invalid redirect option: ${JSON.stringify(redirect)}`)
      }
      return _createRoute(null, location)
    }

    const re: Object = redirect
    const { name, path } = re
    let { query, hash, params } = location
    query = re.hasOwnProperty('query') ? re.query : query
    hash = re.hasOwnProperty('hash') ? re.hash : hash
    params = re.hasOwnProperty('params') ? re.params : params

    if (name) {
      // resolved named direct
      const targetRecord = nameMap[name]
      if (process.env.NODE_ENV !== 'production') {
        assert(
          targetRecord,
          `redirect failed: named route "${name}" not found.`
        )
      }
      return match(
        {
          _normalized: true,
          name,
          query,
          hash,
          params
        },
        undefined,
        location
      )
    } else if (path) {
      // 1. resolve relative redirect
      const rawPath = resolveRecordPath(path, record)
      // 2. resolve params
      const resolvedPath = fillParams(
        rawPath,
        params,
        `redirect route with path "${rawPath}"`
      )
      // 3. rematch with existing query and hash
      return match(
        {
          _normalized: true,
          path: resolvedPath,
          query,
          hash
        },
        undefined,
        location
      )
    } else {
      if (process.env.NODE_ENV !== 'production') {
        warn(false, `invalid redirect option: ${JSON.stringify(redirect)}`)
      }
      return _createRoute(null, location)
    }
  }

  function alias(
    record: RouteRecord,
    location: Location,
    matchAs: string
  ): Route {
    const aliasedPath = fillParams(
      matchAs,
      location.params,
      `aliased route with path "${matchAs}"`
    )
    const aliasedMatch = match({
      _normalized: true,
      path: aliasedPath
    })
    if (aliasedMatch) {
      const matched = aliasedMatch.matched
      const aliasedRecord = matched[matched.length - 1]
      location.params = aliasedMatch.params
      return _createRoute(aliasedRecord, location)
    }
    return _createRoute(null, location)
  }

  function _createRoute(
    record: ?RouteRecord,
    location: Location,
    redirectedFrom?: Location
  ): Route {
    if (record && record.redirect) {
      return redirect(record, redirectedFrom || location)
    }
    if (record && record.matchAs) {
      return alias(record, location, record.matchAs)
    }
    return createRoute(record, location, redirectedFrom, router)
  }

  return {
    match,
    addRoutes
  }
}
```
