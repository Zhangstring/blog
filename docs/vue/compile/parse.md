# 解析器

## 概念

解析器的作用就是将模版解析为 AST。AST 其实是一个用对象描述的节点树。在解析器的内部，分成了很多小解析器，其中包括了过滤器解析器、文本解析器和 HTML 解析器。然后通过一条主线将这些解析器组装在一起。

<img style="width: 60%" src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/vue%20%E8%A7%A3%E6%9E%90%E5%99%A8.png">

- 过滤器解析器：用来解析过滤器的。
- 文本解析器：用来解析文本，主要解析带变量的文本。
- HTML 解析器：是解析器中的最核心模块。作用就是解析模块，每当解析到 HTML 标签的开始位置、结束位置、文本或者注释时，都会触发钩子函数，然后将相关信息通过参数传出来。
- 主线：监听 HTML 解析器。每当触发钩子函数时，就会生成一个对应的 AST 节点。生成 AST 前，会根据类型使用不同方式生成不同的 AST，例如是文本节点，就会生成文本类型的 AST。

流程图：
<img src="https://pic-1254114567.cos.ap-shanghai.myqcloud.com/blog/vue/parse.png">

## 解析器运行原理

```js
// 只看核心逻辑

export function parse(
  template: string,
  options: CompilerOptions
): ASTElement | void {
  // 记录DOM层级关系栈
  const stack = []
  // 根节点
  let root
  // 当前父标签
  let currentParent
  function closeElement(element) {
    if (currentParent && !element.forbidden) {
      // 将节点放入父节点的children中
      currentParent.children.push(element)
      // 节点的parent设置为父节点
      element.parent = currentParent
    }
  }

  parseHTML(template, {
    start(tag, attrs, unary, start) {
      if (!root) {
        // root为空，则该元素为根节点
        root = element
      }
      if (!unary) {
        // 不是自闭合标签，将当前父标签设置为该标签，并将节点推入stack中
        currentParent = element
        stack.push(element)
      } else {
        // 关闭节点：将节点放入父节点的children中，节点的parent设置为父节点
        closeElement(element)
      }
    },

    end(tag, start, end) {
      // 取出当前节点
      const element = stack[stack.length - 1]
      // pop stack
      // 推出当前节点
      stack.length -= 1
      // 设置当前父节点
      currentParent = stack[stack.length - 1]
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        element.end = end
      }
      // 关闭节点：将节点放入父节点的children中，节点的parent设置为父节点
      closeElement(element)
    },

    chars(text: string, start: number, end: number) {
      // 如果没有父节点，则结束
      if (!currentParent) {
        return
      }
      // IE textarea placeholder bug
      /* istanbul ignore if */
      if (
        isIE &&
        currentParent.tag === 'textarea' &&
        currentParent.attrsMap.placeholder === text
      ) {
        return
      }
      // 父节点的children
      const children = currentParent.children

      if (text) {
        let res
        let child: ?ASTNode
        if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
          // 表达式
          child = {
            type: 2,
            expression: res.expression,
            tokens: res.tokens,
            text
          }
        } else if (
          text !== ' ' ||
          !children.length ||
          children[children.length - 1].text !== ' '
        ) {
          child = {
            type: 3,
            text
          }
        }
        if (child) {
          // 将文即节点素放入父节点的children
          children.push(child)
        }
      }
    },
    comment(text: string, start, end) {
      const child: ASTText = {
        type: 3,
        text,
        isComment: true
      }
      // 将注释节点放入父节点的children
      currentParent.children.push(child)
    }
  })
  return root
}
```

## HTML 解析器

解析器实现的功能是将模版解析成 AST。

HTML 解析器的作用是解析 HTML，它在解析 HTML 的过程中会不断触发各种钩子函数。这些钩子函数包括开始标签钩子函数，结束标签钩子函数、文本钩子函数以及注释钩子函数。

```js
  parseHTML(template, {
    warn,
    expectHTML: options.expectHTML,
    isUnaryTag: options.isUnaryTag,
    canBeLeftOpenTag: options.canBeLeftOpenTag,
    shouldDecodeNewlines: options.shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
    shouldKeepComment: options.comments,
    outputSourceRange: options.outputSourceRange,
    start (tag, attrs, unary, start) {
      // 每当解析到标签的开始位置时，触发该函数
      ...
    },

    end (tag, start, end) {
      // 每当解析到标签的结束位置时，触发该函数
      ...
    },

    chars (text: string, start: number, end: number) {
      // 每当解析到文本时，触发该函数
      ...
    },
    comment (text: string, start, end) {
      // 每当解析到注释时，触发该函数
      ...
    }
  })

```

例如这个模版`<div><p>模版</p></div>`被 HTML 解析器解析时，所触发的钩子函数一次为:start、start、chars、end、end。

钩子函数的参数：

- start 有四个参数，分别是 tag, attrs, unary, start，它们分别说明了标签名，标签的属性，是否为自闭和标签，开始位置。
- end 有三个参数，分别是 tag, start, end，它们分别说明了标签名，开始位置，结束位置。
- chars 和 comment 都有三个参数，分别是 text, start, end， 它们分别说明了文本内容，开始位置，结束位置。

解析 HTML 模版的过程就是循环的过程，用 HTML 模版字符串来循环，没轮循环都从 HTML 模版中截取一小段字符串，然后重复以上过程，知道 HTML 模版被截取成一个空字符串时结束循环，解析完毕。

```js
export function parseHTML(html, options) {
  while (html) {
    // 保证lastTag不是纯文本标签，比如script、style以及textarea
    if (!lastTag || !isPlainTextElement(lastTag)) {
      // 寻找 < 的起始位置
      let textEnd = html.indexOf('<')
      // 模板起始位置是标签开头 <
      if (textEnd === 0) {
        // Comment:
        if (comment.test(html)) {
          // ...
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        if (conditionalComment.test(html)) {
          // ...
        }

        // Doctype:
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          // ...
        }

        // End tag:
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          // ...
        }

        // Start tag:
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          // ...
        }
      }

      let text, rest, next
      // 模板起始位置不是 <，而是文字
      if (textEnd >= 0) {
        // ...
      }

      if (textEnd < 0) {
        text = html
      }

      if (text) {
        advance(text.length)
      }
      // 处理文字
      if (options.chars && text) {
        options.chars(text, index - text.length, index)
      }
    } else {
    }
  }
  // 为计数index加上n，同时截取html到n个字符以后
  function advance(n) {
    index += n
    html = html.substring(n)
  }
}
```

### 开始标签

startTagOpen 正则是用来匹配开始标签的。而 parseHTML 里面的 parseStartTag 函数则是利用该正则，匹配开始标签，创立一种初始的数据结构 match，保存相应的属性（标签名、属性，开始位置），对于开始标签里的所有属性，如 id、class、v-bind 等，都会保存到 match.attr 中。

```js
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeLetters}]*`
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
export function parseHTML(html, options) {
  while (html) {
    // 匹配开始标签
    const startTagMatch = parseStartTag()
    if (startTagMatch) {
      // 将parseStartTag的返回值中取出tagName、attrs和unary等数据，然后调用钩子函数（options.start）将这些数据放到参数中。
      handleStartTag(startTagMatch)
      if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
        advance(1)
      }
      continue
    }
  }

  function parseStartTag() {
    // 解析标签名，判断模版是否符合开始标签的特征。
    const start = html.match(startTagOpen)
    if (start) {
      // 创建相应的数据结构
      const match = {
        tagName: start[1],
        attrs: [],
        start: index
      }
      advance(start[0].length)
      // 解析标签属性
      let end, attr
      while (
        !(end = html.match(startTagClose)) &&
        (attr = html.match(dynamicArgAttribute) || html.match(attribute))
      ) {
        attr.start = index
        advance(attr[0].length)
        attr.end = index
        match.attrs.push(attr)
      }
      if (end) {
        // 是否为自闭合标签
        match.unarySlash = end[1]
        advance(end[0].length)
        match.end = index
        return match
      }
    }
  }
}
```

### 结束标签

```js
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
export function parseHTML(html, options) {
  while (html) {
    // End tag:
    // 匹配结束标签
    const endTagMatch = html.match(endTag)
    if (endTagMatch) {
      const curIndex = index
      // 截取模版
      advance(endTagMatch[0].length)
      // 触发钩子函数
      parseEndTag(endTagMatch[1], curIndex, index)
      continue
    }
  }
}
```

### 注释

```js
const comment = /^<!\--/
 // Comment:
 if (comment.test(html)) {
  const commentEnd = html.indexOf('-->')
  if (commentEnd >= 0) {
    // 注释钩子通过配置shouldKeepComment开启
    if (options.shouldKeepComment) {
      options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3)
    }
    advance(commentEnd + 3)
    continue
  }
}
```

### 条件注释

条件注释不触发钩子函数

```js
const conditionalComment = /^<!\[/
if (conditionalComment.test(html)) {
  const conditionalEnd = html.indexOf(']>')

  if (conditionalEnd >= 0) {
    advance(conditionalEnd + 2)
    continue
  }
}
```

### DOCTYPE

DOCTYPE 和条件注释一样不触发钩子

```js
/*匹配<!DOCTYPE> 标签*/
const doctype = /^<!DOCTYPE [^>]+>/i
const doctypeMatch = html.match(doctype)
if (doctypeMatch) {
  advance(doctypeMatch[0].length)
  continue
}
```

### 文本

```js
let text, rest, next
// 截取文本
if (textEnd >= 0) {
  rest = html.slice(textEnd)
  while (
    !endTag.test(rest) &&
    !startTagOpen.test(rest) &&
    !comment.test(rest) &&
    !conditionalComment.test(rest)
  ) {
    // < in plain text, be forgiving and treat it as text
    next = rest.indexOf('<', 1)
    if (next < 0) break
    textEnd += next
    rest = html.slice(textEnd)
  }
  text = html.substring(0, textEnd)
}
// 如果模版中找不到<，那么说明整个模版都是文本
if (textEnd < 0) {
  text = html
}

if (text) {
  advance(text.length)
}
// 触发钩子
if (options.chars && text) {
  options.chars(text, index - text.length, index)
}
```

### 纯文本内容元素

纯文本内容元素指 script、style 和 textarea 这三种元素，解析它们的时候，会把这三种标签内包含的内容都当作文本处理。

```js
while (html) {
  last = html
  if (!lastTag || !isPlainTextElement(lastTag)) {
    // 父元素为正常元素的逻辑处理
  } else {
    // 父元素为script、style、textarea的处理逻辑
    var stackedTag = lastTag.toLowerCase()
    // 匹配结束标签前包括结束标签自身在内的所有文本
    var reStackedTag =
      reCache[stackedTag] ||
      (reCache[stackedTag] = new RegExp(
        '([\\s\\S]*?)(</' + stackedTag + '[^>]*>)',
        'i'
      ))
    var endTagLength = 0
    // 将内容和结束标签一起截掉
    var rest = html.replace(reStackedTag, function(all, text, endTag) {
      endTagLength = endTag.length
      if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
        text = text
          .replace(/<!--([\s\S]*?)-->/g, '$1')
          .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
      }
      if (options.chars) {
        options.chars(text)
      }
      return ''
    })
    index += html.length - rest.length
    html = rest
    // 调用钩子函数end
    parseEndTag(stackedTag, index - endTagLength, index)
  }
}
```

### 整体逻辑

```js
export function parseHTML(html, options) {
  while (html) {
    if (!lastTag || !isPlainTextElement(lastTag)) {
      // 父元素为正常元素的逻辑处理
      let textEnd = html.indexOf('<')
      if (textEnd === 0) {
        // 注释
        if (comment.test(html)) {
          // 注释逻辑处理
          continue
        }
        // 条件注释
        if (conditionalComment.test(html)) {
          // 条件注释逻辑处理
          continue
        }

        // Doctype:
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          // Doctype逻辑处理
          continue
        }

        // 结束标签
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          // 结束标签逻辑处理
          continue
        }

        // 开始标签
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          // 开始标签逻辑处理
          continue
        }
      }

      let text, rest, next
      if (textEnd >= 0) {
        // 解析文本
      }

      if (textEnd < 0) {
        text = html
      }

      if (text) {
        advance(text.length)
      }

      if (options.chars && text) {
        options.chars(text, index - text.length, index)
      }
    } else {
      // 父元素为script、style、textarea的处理逻辑
    }
    // 没有解析出来全部当作文本
    if (html === last) {
      options.chars && options.chars(html)
      break
    }
  }
}
```

## 文本解析器

文本解析器的作用是解析文本，对 HTML 解析器解析出来的文本进行二次加工。

文本分为两种类型：

- 纯文本：
  ```html
  hello world
  ```
- 带变量的文本：
  ```html
  hello {{world}}
  ```

在 Vue 模版中，可以使用变量来填充模版。而 HTML 解析器在解析文本时，并不会区分文本是否带变量的文本。如果是纯文本，不需要做任何处理；但如果是带变量的文本，那么需要使用文本解析器进一步解析。因为变变量的文本在使用虚拟 DOM 进行渲染时，需要将变量替换成变量的值。

每当 HTML 解析器解析到文本时，都会触发 chars 函数，并且从参数得到解析出来的文本。在 chars 函数中，我们需要构建文本类型的 AST，并将它添加到父节点的 children 属性中。而在构建文本类型的 AST 时，纯文本和带变量的文本是不同处理方式。如果是带变量的文本，我们需要借助文本解析器对它进行二次加工。

```js
parseHTML(template, {
  warn,
  expectHTML: options.expectHTML,
  isUnaryTag: options.isUnaryTag,
  canBeLeftOpenTag: options.canBeLeftOpenTag,
  shouldDecodeNewlines: options.shouldDecodeNewlines,
  shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
  shouldKeepComment: options.comments,
  outputSourceRange: options.outputSourceRange,
  start(tag, attrs, unary, start) {},

  end(tag, start, end) {},

  chars(text: string, start: number, end: number) {
    if (!currentParent) {
      return
    }
    // IE textarea placeholder bug
    /* istanbul ignore if */
    if (
      isIE &&
      currentParent.tag === 'textarea' &&
      currentParent.attrsMap.placeholder === text
    ) {
      return
    }
    const children = currentParent.children

    if (text) {
      if (whitespaceOption === 'condense') {
        // condense consecutive whitespaces into single space
        text = text.replace(whitespaceRE, ' ')
      }
      let res
      let child: ?ASTNode
      // 执行parseText后有返回结果，说明是带变量的文本
      if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
        child = {
          type: 2,
          expression: res.expression,
          tokens: res.tokens,
          text
        }
      } else if (
        text !== ' ' ||
        !children.length ||
        children[children.length - 1].text !== ' '
      ) {
        child = {
          type: 3,
          text
        }
      }
      if (child) {
        if (
          process.env.NODE_ENV !== 'production' &&
          options.outputSourceRange
        ) {
          child.start = start
          child.end = end
        }
        children.push(child)
      }
    }
  },
  comment(text: string, start, end) {}
})
```

在`chars`函数中，如果执行`parseText`后有返回结果，则说明文本是带有变量的文本，并且通过文本解析器（parseText）二次加工，此时构建一个带变量的文本类型的 AST 并将其添加到父节点的 children 中。

```js
export function parseText(
  text: string,
  delimiters?: [string, string]
): TextParseResult | void {
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE
  // 如果纯文本，则返回
  if (!tagRE.test(text)) {
    return
  }
  const tokens = []
  const rawTokens = []
  let lastIndex = (tagRE.lastIndex = 0)
  let match, index, tokenValue
  // 正则text，直至text中没有变量
  while ((match = tagRE.exec(text))) {
    index = match.index
    // push text token
    // 先把{{前边的文本添加到数组中
    if (index > lastIndex) {
      rawTokens.push((tokenValue = text.slice(lastIndex, index)))
      tokens.push(JSON.stringify(tokenValue))
    }
    // tag token
    // 把变量改成_s（x）的形式也添加到数组中
    const exp = parseFilters(match[1].trim())
    tokens.push(`_s(${exp})`)
    rawTokens.push({ '@binding': exp })
    // 这是lastIndex来保证下一轮循环，正则表达式不再重复匹配以及解析过的文本
    lastIndex = index + match[0].length
  }
  // 当所有变量都处理完毕后，如果最后一个变量右边还有文本，就讲文本添加到数组中
  if (lastIndex < text.length) {
    rawTokens.push((tokenValue = text.slice(lastIndex)))
    tokens.push(JSON.stringify(tokenValue))
  }
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}
```

## 过滤器解析器

过滤器解析器在 parseText 解析文本和 processAttrs 解析 v-bind 指令中使用到。

```js
const validDivisionCharRE = /[\w).+\-_$\]]/

// 解析过滤器
export function parseFilters(exp: string): string {
  let inSingle = false
  let inDouble = false
  let inTemplateString = false
  let inRegex = false
  let curly = 0
  let square = 0
  let paren = 0
  let lastFilterIndex = 0
  let c, prev, i, expression, filters

  for (i = 0; i < exp.length; i++) {
    prev = c
    c = exp.charCodeAt(i)
    if (inSingle) {
      // ' 单引号
      if (c === 0x27 && prev !== 0x5c) inSingle = false
    } else if (inDouble) {
      // " 双引号
      if (c === 0x22 && prev !== 0x5c) inDouble = false
    } else if (inTemplateString) {
      // ` 模版字符串
      if (c === 0x60 && prev !== 0x5c) inTemplateString = false
    } else if (inRegex) {
      // / 正则
      if (c === 0x2f && prev !== 0x5c) inRegex = false
    } else if (
      // ｜ 管道
      c === 0x7c && // pipe
      exp.charCodeAt(i + 1) !== 0x7c &&
      exp.charCodeAt(i - 1) !== 0x7c &&
      !curly &&
      !square &&
      !paren
    ) {
      if (expression === undefined) {
        // first filter, end of expression
        lastFilterIndex = i + 1
        expression = exp.slice(0, i).trim()
      } else {
        pushFilter()
      }
    } else {
      switch (c) {
        case 0x22:
          inDouble = true
          break // "
        case 0x27:
          inSingle = true
          break // '
        case 0x60:
          inTemplateString = true
          break // `
        case 0x28:
          paren++
          break // (
        case 0x29:
          paren--
          break // )
        case 0x5b:
          square++
          break // [
        case 0x5d:
          square--
          break // ]
        case 0x7b:
          curly++
          break // {
        case 0x7d:
          curly--
          break // }
      }
      if (c === 0x2f) {
        // /
        let j = i - 1
        let p
        // find first non-whitespace prev char
        for (; j >= 0; j--) {
          p = exp.charAt(j)
          if (p !== ' ') break
        }
        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true
        }
      }
    }
  }

  if (expression === undefined) {
    expression = exp.slice(0, i).trim()
  } else if (lastFilterIndex !== 0) {
    pushFilter()
  }

  function pushFilter() {
    ;(filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())
    lastFilterIndex = i + 1
  }

  if (filters) {
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i])
    }
  }

  return expression
}

function wrapFilter(exp: string, filter: string): string {
  const i = filter.indexOf('(')
  if (i < 0) {
    // _f: resolveFilter
    return `_f("${filter}")(${exp})`
  } else {
    const name = filter.slice(0, i)
    const args = filter.slice(i + 1)
    return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`
  }
}
```
