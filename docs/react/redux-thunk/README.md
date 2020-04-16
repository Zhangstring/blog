# 实现

## 用法

```js
import { applyMiddleware, createStore } from 'redux'
import thunk from 'redux-thunk'

const store = createStore(reducers, applyMiddleware(thunk))

store.dispatch(函数)
```

## 源码

```js
function createThunkMiddleware(extraArgument) {
  return ({ dispatch, getState }) => next => action => {
    if (typeof action === 'function') {
      return action(dispatch, getState, extraArgument)
    }

    return next(action)
  }
}

const thunk = createThunkMiddleware()
thunk.withExtraArgument = createThunkMiddleware

export default thunk
```

展开

```js
function createThunkMiddleware(extraArgument) {
  // 中间件函数,参数是store中的dispatch和getState方法
  return function({ dispatch, getState }) {
    // 参数next是被当前中间件改造前的dispatch
    // 因为在被当前中间件改造之前，可能已经被其他中间件改造过了，所以不妨叫next
    return function(next) {
      // 这是改造函数「改造后的dispatch方法」
      return function(action) {
        // 如果当前action是个函数的话，return一个action执行，参数有dispatch和getState，否则返回给下个中间件。
        if (typeof action === 'function') {
          return action(dispatch, getState, extraArgument)
        }
        // 调用用改造前的dispatch方法
        return next(action)
      }
    }
  }
}

const thunk = createThunkMiddleware()
thunk.withExtraArgument = createThunkMiddleware

export default thunk
```
