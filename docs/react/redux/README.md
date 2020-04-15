# 概念

Redux 是 JavaScript 状态容器，提供可预测化的状态管理。

Redux 可以理解为一个简易的发布订阅系统。

## 作用

Redux 在 react 和 Vuex 在 vue 一样，使用他们主要解决跨组件数据通信和相邻组件间的数据传递的问题。

## 设计思想

Redux 单向数据流、Store 是唯一的数据源。

<img class="preview" src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/react/redux.png">

## 三大原则

Redux 应用的三大原则：

- 单一数据源

  整个应用的 `state` 被储存在一棵 `object tree` 中，并且这个 `object tree` 只存在于唯一一个 `store` 中。

- `State` 是只读的

  唯一改变 `state` 的方法就是触发 `action`，`action` 是一个用于描述已发生事件的普通对象。

- 使用纯函数 Reducer 来执行修改

  为了描述 `action` 如何改变 `state tree` ，你需要编写 `reducers`。

## 流程

Redux 的工作流程：

- 将状态统一放入一个 `state` 中，通过 `store` 来管理 `state`。
- `store` 按照 `reducer` 来创建。
- `reducer` 的作用是响应 `actions` 并发送到 `store`，更新 `state`。
- 通过`store.dispatch(action)`来修改 state。
- 可以通过`subscribe`在`store`上添加一个监听函数。每当调用`dispatch`方法时，会执行所有的监听函数。
- 可以添加中间件来处理副作用.

Redux 需要提供的功能是：

- 创建 store，即：`createStore()`
- 创建的 store 提供 `subscribe`，`dispatch`，`getState` 这个方法
- 将多个 reducer 合并为一个 reducer，即：combineReducers()
- 应用中间件。
