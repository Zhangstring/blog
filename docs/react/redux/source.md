# 源码

## 入口文件 index.js

入口文件主要作用提供方法。

```js
// src/index.js

import createStore from './createStore'
import combineReducers from './combineReducers'
import bindActionCreators from './bindActionCreators'
import applyMiddleware from './applyMiddleware'
import compose from './compose'
import warning from './utils/warning'

export {
  createStore,
  combineReducers,
  bindActionCreators,
  applyMiddleware,
  compose,
  __DO_NOT_USE__ActionTypes
}
```

## 主流程文件 createStore.js

首先进行了一大堆的类型判断，然后声明了变量和函数，最后执行 `dispatch` 了一个 `init Action` 是为了生成初始的 `State` 树。

createStore 创建了一个 store，但并没有直接获取 state，是通过 getState 方法去获取 state，或者调用 dispatch 去改变 state。这样形成了闭包，state 保存在了闭包中

```js
export default function createStore(reducer, preloadedState, enhancer) {
  if (
    (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof arguments[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several store enhancers to ' +
        'createStore(). This is not supported. Instead, compose them ' +
        'together to a single function.'
    )
  }
  // 如果preloadedState是函数，enhancer为空，那么enhancer为preloadedState，preloadedState为空
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }
  // 强化createStore,改造dispatch，添加上中间件
  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    return enhancer(createStore)(reducer, preloadedState)
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }
  // 当前store中的reducer
  let currentReducer = reducer
  // 当前store中的存储状态state
  let currentState = preloadedState
  // 当前store中放置的监听函数
  let currentListeners = []
  // 下一次dispatch时的监听函数
  let nextListeners = currentListeners
  // 是否正在dispatching
  let isDispatching = false
  // 防止nextListeners和currentListeners不为同一个数组
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }
  // 获取state
  function getState() {
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }

    return currentState
  }
  // 添加一个监听函数，每当dispatch调用的时候都会执行这个监听函数
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See https://redux.js.org/api-reference/store#subscribelistener for more details.'
      )
    }

    let isSubscribed = true
    // 防止当前监听函数数组和下一次监听数组为同一个数组
    ensureCanMutateNextListeners()
    // 添加到监听数组
    nextListeners.push(listener)
    // 取消订阅监听函数
    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See https://redux.js.org/api-reference/store#subscribelistener for more details.'
        )
      }

      isSubscribed = false
      // 防止当前监听函数数组和下一次监听数组为同一个数组
      ensureCanMutateNextListeners()
      // 从下一轮的监听函数数组找到监听器
      const index = nextListeners.indexOf(listener)
      // 删除监听器
      nextListeners.splice(index, 1)
      // 重置当前监听器
      currentListeners = null
    }
  }
  // 触发一个action，因此调用reducer，得到新的state，并执行所有添加到store中的监听函数
  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      isDispatching = true
      // 抵用reducer，得到新的state
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }
    // 执行所有添加到store中的监听函数
    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return action
  }
  // 替换当前的reducer，并初始化state
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }
    // 替换当前的reducer，
    currentReducer = nextReducer
    // 初始化state
    dispatch({ type: ActionTypes.REPLACE })
  }

  function observable() {
    const outerSubscribe = subscribe
    return {
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }
  // dispatch调用初始化action，相当于调用一次reducer，初始化了state
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
```

## combineReducers

主要功能是用来合并 Reducer，因为当我们应用比较大的时候 Reducer 按照模块拆分看上去会比较清晰，但是传入 Store 的 Reducer 必须是一个函数，所以用这个方法来作合并。

```js
export default function combineReducers(reducers) {
  //先获取传入reducers对象的所有key
  const reducerKeys = Object.keys(reducers)
  // 最后真正有效的reducer存在这里
  const finalReducers = {}
  //下面从reducers中筛选出有效的reducer
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }

    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
  const finalReducerKeys = Object.keys(finalReducers)

  // This is used to make sure we don't warn about the same
  // keys multiple times.
  let unexpectedKeyCache
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }
  // 这里assertReducerShape函数做的事情是：
  // 检查finalReducer中的reducer接受一个初始action或一个未知的action时，是否依旧能够返回有效的值。
  let shapeAssertionError
  try {
    assertReducerShape(finalReducers)
  } catch (e) {
    shapeAssertionError = e
  }
  // 返回合并后的reducer
  return function combination(state = {}, action) {
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    if (process.env.NODE_ENV !== 'production') {
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state,
        finalReducers,
        action,
        unexpectedKeyCache
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }
    // 取得每个子reducer对应的state，与action一起作为参数给每个子reducer执行
    let hasChanged = false
    const nextState = {}
    for (let i = 0; i < finalReducerKeys.length; i++) {
      // 得到本次循环的子reducer
      const key = finalReducerKeys[i]
      const reducer = finalReducers[key]
      // 得到该子reducer对应的旧状态
      const previousStateForKey = state[key]
      // 调用子reducer得到新状态
      const nextStateForKey = reducer(previousStateForKey, action)
      if (typeof nextStateForKey === 'undefined') {
        const errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      // 存到nextState中（总的状态）
      nextState[key] = nextStateForKey
      // 到这里时有一个问题:
      // 就是如果子reducer不能处理该action，那么会返回previousStateForKey
      // 也就是旧状态，当所有状态都没改变时，我们直接返回之前的state就可以了。
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    // 如果状态没改变，但是reducer的key和state的key没对上，返回新状态
    hasChanged =
      hasChanged || finalReducerKeys.length !== Object.keys(state).length
    return hasChanged ? nextState : state
  }
}
```

## 中间件

enhancer（可以叫做强化器）是一个函数，这个函数接受一个「普通 createStore 函数」作为参数，返回一个「加强后的 createStore 函数」。

这个加强的过程中做的事情，其实就是改造 dispatch，添加上中间件。

```js
function createStore(reducer, preloadedState, enhancer) {
  if (typeof enhancer === 'function') {
    return enhancer(createStore)(reducer, preloadedState)
  }
}
```

redux 提供的`applyMiddleware()`方法返回的就是一个 enhancer。`applyMiddleware`，顾名思义，「应用中间件」。输入为若干中间件，输出为 enhancer。

applyMiddleware 主要是改造了 dispatch 方法。在调用真正的 store.dispatch 之前进行处理副作用。

```js
export default function applyMiddleware(...middlewares) {
  // 返回一个函数A，函数A的参数是一个createStore函数。
  // 函数A的返回值是函数B，其实也就是一个加强后的createStore函数，大括号内的是函数B的函数体
  return createStore => (...args) => {
    // 用参数传进来的createStore创建一个store
    const store = createStore(...args)
    // 注意，我们在这里需要改造的只是store的dispatch方法
    // 一个临时的dispatch
    let dispatch = () => {
      // 作用是在dispatch改造完成前调用dispatch只会打印错误信息
      throw new Error(
        'Dispatching while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this dispatch.'
      )
    }
    // 接下来我们准备将每个中间件与我们的state关联起来（通过传入getState方法），得到改造函数。
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    // middlewares是一个中间件函数数组，中间件函数的返回值是一个改造dispatch的函数
    // 调用数组中的每个中间件函数，得到所有的改造函数
    const chain = middlewares.map(middleware => middleware(middlewareAPI))
    // compose方法的作用是，例如这样调用：
    // compose(func1,func2,func3)
    // 返回一个函数: (...args) => func1( func2( func3(...args) ) )
    // 即传入的dispatch被func3改造后得到一个新的dispatch，新的dispatch继续被func2改造...
    // 返回store，用改造后的dispatch方法替换store中的dispatch
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
```

compose 的作用：

<img src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/react/compose.png">

```js
export default function compose(...funcs) {
  // 如果没有传入函数，则返回一个默认函数
  if (funcs.length === 0) {
    return arg => arg
  }
  // 如果只有一个函数，则返回该函数
  if (funcs.length === 1) {
    return funcs[0]
  }
  // 返回组合函数
  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
```
