# 指令

## v-if

### ast

```js
// 匹配if属性，分别处理v-if、v-else以及v-else-if属性
function processIf(el) {
  // 取出v-if属性
  const exp = getAndRemoveAttr(el, 'v-if')
  if (exp) {
    // 存在v-if属性
    el.if = exp
    // 在el的ifConditions属性中加入{exp, block}
    addIfCondition(el, {
      exp: exp,
      block: el
    })
  } else {
    // 不存在v-if属性
    if (getAndRemoveAttr(el, 'v-else') != null) {
      el.else = true
    }
    const elseif = getAndRemoveAttr(el, 'v-else-if')
    if (elseif) {
      el.elseif = elseif
    }
  }
}
```

### 渲染函数

```js
export function genIf(
  el: any,
  state: CodegenState,
  altGen?: Function,
  altEmpty?: string
): string {
  el.ifProcessed = true // avoid recursion
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
}

function genIfConditions(
  conditions: ASTIfConditions,
  state: CodegenState,
  altGen?: Function,
  altEmpty?: string
): string {
  if (!conditions.length) {
    return altEmpty || '_e()'
  }

  const condition = conditions.shift()
  if (condition.exp) {
    return `(${condition.exp})?${genTernaryExp(
      condition.block
    )}:${genIfConditions(conditions, state, altGen, altEmpty)}`
  } else {
    return `${genTernaryExp(condition.block)}`
  }

  // v-if with v-once should generate code like (a)?_m(0):_m(1)
  function genTernaryExp(el) {
    return altGen
      ? altGen(el, state)
      : el.once
      ? genOnce(el, state)
      : genElement(el, state)
  }
}
```

## v-for

### ast

```js
// 匹配v-for属性
export function processFor(el: ASTElement) {
  let exp
  // 取出v-for属性
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    const res = parseFor(exp)
    if (res) {
      // 合并el和res
      extend(el, res)
    } else if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid v-for expression: ${exp}`, el.rawAttrsMap['v-for'])
    }
  }
}
export const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/

export function parseFor(exp: string): ?ForParseResult {
  // 匹配v-for中的in以及of 以item in sz为例 inMatch = [ 'item of sz', 'item', 'sz', index: 0, input: 'item of sz' ]
  const inMatch = exp.match(forAliasRE)
  if (!inMatch) return
  const res = {}
  // 在这里是sz
  res.for = inMatch[2].trim()
  // item
  const alias = inMatch[1].trim().replace(stripParensRE, '')
  /*
      因为item可能是被括号包裹的，比如(item, index) in sz这样的形式，匹配出这些项
      例：(item, index)匹配得到结果
      [ '(item, index, l)',
      'item',
      ' index',
      l,
      index: 0,
      input: '(item, index, l);' ]
    */
  const iteratorMatch = alias.match(forIteratorRE)
  if (iteratorMatch) {
    res.alias = alias.replace(forIteratorRE, '').trim()
    res.iterator1 = iteratorMatch[1].trim()
    if (iteratorMatch[2]) {
      res.iterator2 = iteratorMatch[2].trim()
    }
  } else {
    res.alias = alias
  }
  return res
}
```

### 渲染函数

```js
export function genFor(
  el: any,
  state: CodegenState,
  altGen?: Function,
  altHelper?: string
): string {
  const exp = el.for
  const alias = el.alias
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''

  if (
    process.env.NODE_ENV !== 'production' &&
    state.maybeComponent(el) &&
    el.tag !== 'slot' &&
    el.tag !== 'template' &&
    !el.key
  ) {
    state.warn(
      `<${el.tag} v-for="${alias} in ${exp}">: component lists rendered with ` +
        `v-for should have explicit keys. ` +
        `See https://vuejs.org/guide/list.html#key for more info.`,
      el.rawAttrsMap['v-for'],
      true /* tip */
    )
  }

  el.forProcessed = true // avoid recursion
  return (
    `${altHelper || '_l'}((${exp}),` +
    `function(${alias}${iterator1}${iterator2}){` +
    `return ${(altGen || genElement)(el, state)}` +
    '})'
  )
}
```
