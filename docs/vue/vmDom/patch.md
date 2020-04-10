# patch

虚拟 DOM 最核心的部分是 patch，它可以将 vnode 渲染成真实的 DOM。

通过 patch 渲染真实 DOM 时，并不是暴力覆盖原有 DOM，而是对比新旧两个 vnode 之间有哪些不同，然后根据对比结果找出需要更新的节点进行更新。之所以这么做，主要是因为 DOM 操作的执行速度远不如 javascript 的运算速度快。因此，把大量的 DOM 操作搬运到 JavaScript 中，使用 patch 算法来计算真正需要更新的节点，最大限度地减少 DOM 操作，从而显著提升性能。这本质上其实是使用 JavaScript 的运算成本来替换 DOM 操作的执行成本。

## patch 介绍

对比两个 vnode 的差异只是 patch 的一部分。patch 的目的是修改 DOM 节点，也可以理解为渲染视图。patch 不是暴力替换节点，而是在现有 DOM 上进行修改来达到渲染视图的目的。对现有 DOM 进行修改只需要做三件事：

- 创建新增的节点。
- 删除已经废弃的节点。
- 修改需要更新的节点。

### 新增节点

在什么情况下新增节点？

- 当 oldVnode 不存在而 vnode 存在时，就需要用 vnode 生成真实的 DOM 元素并将其插入到视图当中去。通常发生在首次渲染时，DOM 中不存在任何节点，所以 oldVnode 是不存在的
- 当 vnode 和 oldVnode 完全不是同一个节点时，需要使用 vnode 生成真实的 DOM 元素并将其插入到视图当中。

### 删除节点

当一个节点只在 oldVnode 中存在时，我们需要把它从 DOM 中删除。因为渲染视图时，需要以 vnode 为标准，所以 vnode 中不存在的节点都属于废弃节点，而被废弃的节点需要从 DOM 中删除。

### 更新节点

当新旧两个节点时相同的节点时，我们需要对这两个节点进行比较细致的对比，然后对 oldValue 在视图对应的真实节点进行更新。

### 小结

patch 的运行流程

<img style="width: 60%" src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/vue%20patch%E8%BF%90%E8%A1%8C%E6%B5%81%E7%A8%8B.png">

对应源码：

```js
function patch(oldVnode, vnode, hydrating, removeOnly) {
    // vnode不存在而oldVnode存在，删除oldVnode对应DOM的节点
    if (isUndef(vnode)) {
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
      return
    }

    let isInitialPatch = false
    const insertedVnodeQueue = []

    if (isUndef(oldVnode)) {
      //  oldVnode不存在，vnode存在，使用vnode创建新的DOm节点
      // empty mount (likely as component), create new root element
      isInitialPatch = true
      createElm(vnode, insertedVnodeQueue)
    } else {
      const isRealElement = isDef(oldVnode.nodeType)
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // 新旧两个节点是相同节点时，对这两个节点进行对比，然后对 oldValue 在视图对应的真实节点进行更新
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        // 新旧两个节点不是相同节点，删除oldVnode节点,根据vnode创建新的DOM节点
        // destroy old node
        createElm(
          vnode,
          insertedVnodeQueue,
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm)
        )
        if (isDef(parentElm)) {
          removeVnodes(parentElm, [oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode)
        }
      }
    }

    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm
  }
}
```

## 创建节点

创建一个真实的 DOM 节点所需要的信息都保存在 vnode 中，vnode 是有类型的，在创建 DOM 元素时，根据 vnode 的类型来创建出相同的 DOM 元素，然后将 DOM 元素插入到视图中。事实上，只有三种类型的节点会被创建并插入到 DOM 中：元素节点，注释节点和文本节点。

<img src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/vue%E5%88%9B%E5%BB%BA%E8%8A%82%E7%82%B9%E5%B9%B6%E6%B8%B2%E6%9F%93%E5%88%B0%E8%A7%86%E5%9B%BE%E7%9A%84%E8%BF%87%E7%A8%8B.png">

```js
function createElm(
  vnode,
  insertedVnodeQueue,
  parentElm,
  refElm,
  nested,
  ownerArray,
  index
) {
  if (isDef(vnode.elm) && isDef(ownerArray)) {
    vnode = ownerArray[index] = cloneVNode(vnode)
  }
  vnode.isRootInsert = !nested // for transition enter check
  // 如果vnode时组件节点，则调用createComponent来创建
  if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
    return
  }
  const data = vnode.data
  const children = vnode.children
  const tag = vnode.tag
  // 判断元素标签
  if (isDef(tag)) {
    if (process.env.NODE_ENV !== 'production') {
      if (data && data.pre) {
        creatingElmInVPre++
      }
    }
    // 调用当前环境的createElement方法来创建真实的元素节点。
    vnode.elm = vnode.ns
      ? nodeOps.createElementNS(vnode.ns, tag)
      : nodeOps.createElement(tag, vnode)
    setScope(vnode)

    // 创建子节点 createChildren方法也是调用createElm来创建子节点并添加到当前节点上
    createChildren(vnode, children, insertedVnodeQueue)
    if (isDef(data)) {
      invokeCreateHooks(vnode, insertedVnodeQueue)
    }
    // 将当前节点插入到指定的父节点下面
    insert(parentElm, vnode.elm, refElm)

    if (process.env.NODE_ENV !== 'production' && data && data.pre) {
      creatingElmInVPre--
    }
  } else if (isTrue(vnode.isComment)) {
    // 注释节点
    vnode.elm = nodeOps.createComment(vnode.text)
    // 将注释节点插入到指定的父节点下面
    insert(parentElm, vnode.elm, refElm)
  } else {
    // 文本节点
    vnode.elm = nodeOps.createTextNode(vnode.text)
    // 将文本节点插入到指定的父节点下面
    insert(parentElm, vnode.elm, refElm)
  }
}
function createChildren(vnode, children, insertedVnodeQueue) {
  if (Array.isArray(children)) {
    if (process.env.NODE_ENV !== 'production') {
      checkDuplicateKeys(children)
    }
    for (let i = 0; i < children.length; ++i) {
      createElm(
        children[i],
        insertedVnodeQueue,
        vnode.elm,
        null,
        true,
        children,
        i
      )
    }
  } else if (isPrimitive(vnode.text)) {
    nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)))
  }
}
function insert(parent, elm, ref) {
  if (isDef(parent)) {
    if (isDef(ref)) {
      if (nodeOps.parentNode(ref) === parent) {
        nodeOps.insertBefore(parent, elm, ref)
      }
    } else {
      nodeOps.appendChild(parent, elm)
    }
  }
}
const nodeOps = {
  createElement: function(tagName: string, vnode: VNode): Element {
    const elm = document.createElement(tagName)
    if (tagName !== 'select') {
      return elm
    }
    // false or null will remove the attribute but undefined will not
    if (
      vnode.data &&
      vnode.data.attrs &&
      vnode.data.attrs.multiple !== undefined
    ) {
      elm.setAttribute('multiple', 'multiple')
    }
    return elm
  },
  createTextNode: function(text: string): Text {
    return document.createTextNode(text)
  },

  createComment: function(text: string): Comment {
    return document.createComment(text)
  },
  insertBefore: function(parentNode: Node, newNode: Node, referenceNode: Node) {
    parentNode.insertBefore(newNode, referenceNode)
  },
  appendChild: function(node: Node, child: Node) {
    node.appendChild(child)
  }
}
```

## 删除节点

删除节点的过程非常简单

```js
// 删除vnodes数组中startIdx指定的位置到endIdx指定位置的内容
function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    const ch = vnodes[startIdx]
    if (isDef(ch)) {
      if (isDef(ch.tag)) {
        removeAndInvokeRemoveHook(ch)
        invokeDestroyHook(ch)
      } else {
        // Text node
        removeNode(ch.elm)
      }
    }
  }
}
// 删除视图中的单个节点
function removeNode(el) {
  const parent = nodeOps.parentNode(el)
  // element may have already been removed due to v-html / v-text
  if (isDef(parent)) {
    nodeOps.removeChild(parent, el)
  }
}

const nodeOps = {
  removeChild: function(node: Node, child: Node) {
    node.removeChild(child)
  },
  parentNode: function(node: Node): ?Node {
    return node.parentNode
  }
}
```

## 更新节点

只有两个节点是同一个节点时，才需要更新元素节点，而更新节点并不是很暴力的使用新节点覆盖就节点，而是通过对比新旧两个节点不一样的地方，针对不一样的地方进行更新。

### 静态节点

在更新节点时,首先判断新旧节点两个虚拟节点是否是静态节点，如果是，就不需要进行操作，就可以直接跳过更新节点操作。

静态节点是指哪些一旦渲染到界面上之火，无论日后状态如何变化，都不会发生如何变化的节点。例如`<p>我是静态节点，不会发生变化</p>`，还有指令`v-pre`。

### 不是静态节点

当新旧两个虚拟节点 vnode 和 oldVnode 不是静态节点，并且有不同属性时，要以新虚拟节点 vnode 为准来更新视图。根据新虚拟节点 vnode 是否有 text 属性，更新节点可以分为两种不同情况。

- 如果新生成的虚拟节点 vnode 有 text 属性，那么不论之前旧虚拟节点的子节点时什么，直接调用 setTextContent 方法来将视图的 DOM 节点的内容改成新虚拟节点 vnode 的 text 属性所保存的文字。
- 如果新创建的虚拟节点没有 text 属性，那么它就是一个元素节点。元素节点通常会有子节点，也就是 children 属性，但也有可能没有子节点，所以存在两种不同的情况。
  - 新创建的虚拟节点有 children 情况时，还要根据新虚拟节点 oldValue 是否有 children 属性来判断。
    - 如果旧虚拟节点有 children 情况，那么就要对新旧两个节点的 children 进行一个更详细的对比并更新。更新 children 可能会移动某个子节点的位置，也有可能会删除或新增某个子节点。
    - 如果旧虚拟节点没有 children 属性，那么说明旧虚拟节点要么是一个空标签，要么就是有文本的节点。如果是文本节点，那么先把文本清空并让他变成空标签，然后将新虚拟节点中的 children 挨个创建成真实 DOM 元素节点并将其插入到视图中的 DOM 节点下面。
  - 新创建的虚拟节点没有 children 情况，说明这个新创建标签是一个空标签，如果旧虚拟节点有子节点或文本，都删除，最后达到空标签的目的。

<img style="width: 60%" src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/vue%E6%9B%B4%E6%96%B0%E8%8A%82%E7%82%B9.png">

源码：

```js
function patchVnode(
  oldVnode,
  vnode,
  insertedVnodeQueue,
  ownerArray,
  index,
  removeOnly
) {
  // vnode与oldVnode完全一样，不需要更新
  if (oldVnode === vnode) {
    return
  }

  const elm = (vnode.elm = oldVnode.elm)

  // 都是静态节点并且key相同，且当vnode是克隆节点或是v-once指令控制的节点，不需要更新
  if (
    isTrue(vnode.isStatic) &&
    isTrue(oldVnode.isStatic) &&
    vnode.key === oldVnode.key &&
    (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
  ) {
    vnode.componentInstance = oldVnode.componentInstance
    return
  }

  const oldCh = oldVnode.children
  const ch = vnode.children
  if (isUndef(vnode.text)) {
    // vnode没有文本属性
    if (isDef(oldCh) && isDef(ch)) {
      // 子节点都存在时，如果子节点不相同，更新子节点
      if (oldCh !== ch)
        updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
    } else if (isDef(ch)) {
      // oldVnode子节点不存在，vnode节点存在
      if (process.env.NODE_ENV !== 'production') {
        checkDuplicateKeys(ch)
      }
      // oldVnode有文本，清空DOM中的文本
      if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
      // 把vnode的子节点添加到DOM中
      addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
    } else if (isDef(oldCh)) {
      // oldVnode子节点存在，vnode节点不存在，清空DOM的子节点
      removeVnodes(elm, oldCh, 0, oldCh.length - 1)
    } else if (isDef(oldVnode.text)) {
      // oldVnode有文本存在，清空DOM的文本
      nodeOps.setTextContent(elm, '')
    }
  } else if (oldVnode.text !== vnode.text) {
    // 文本不相同时，替换文本
    nodeOps.setTextContent(elm, vnode.text)
  }
}
```

## 更新子节点
