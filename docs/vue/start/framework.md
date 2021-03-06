# 架构设计

<img src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/vue%E7%BB%93%E6%9E%84%E5%9B%BE.png" />

Vue.js 整体分为三个部分：核心代码、跨平台相关和公用工具函数。同时，其架构时分层的，最底层时一个普通的构造函数，最上层时一个入口，也就是将一个完整的构造函数导出给用户使用。

在最底层和最顶层中间，逐渐添加一些方法和属性，而构造函数上一层的方法会最终添加到 Vue 构建函数的原型上，再一层上层的方法会添加到构造函数上，这些方法叫做全局 API（Global API），例如 Vue.use。也就是说，先在构建函数的 prototype 上添加方法后（对应源码文件`src/core/instance/index.js`），再向构建函数自身添加全局 API（对应源码文件`src/core/index.js`）。

再往上一层是与跨平台相关的内容，在构建时，首先对判断对应的平台，然后将这个平台的代码加载到构建文件中。再上一层是渲染层，其中包含两部分内容：服务端渲染和编译器。同时，这一层是可选的，构建时会根据构建的目标文件来选择是否需要将编译器加载进来。事实上，这一层并不权威，因为服务端渲染的相关的代码只存在 Web 平台下，而且这两个平台有各自的编译器配置。这里之所以放到渲染层，是因为它们都是与渲染相关的内容。

最顶层是入口，也可以叫出口，对于构建工具和 Vue.js 使用者来说是入口，对于 Vue.js 来说是出口。在构建时，不同平台的构建文件会选择不同的入口进行构建操作。

从整体来看，下面三层的代码是跟平台无关的核心代码，上面三层是与平台相关的代码。结构跟 react 很像，核心代码对应这 react，平台相关代码对于 react-dom。这样设计可以很好的兼容各个平台。

构建 Web 平台下运行的文件流程：先向 Vue 构建函数的 prototype 属性上添加一些方法，然后向 Vue 构造函数自身添加一些全局 API，接着根据对于平台，将平台代码导入进来，最后将编译器导入进来。最终将所有的代码同 Vue 构造函数一起导出。
