# 静态资源的优化

## 图片优化

### 图片压缩

在线压缩图片：<a href="https://tinypng.com/">tinypng</a>

工具压缩图片：

- png ：`node-pngquant-native`
- jpg ：`jpegtran`
- gif ：`gifsicle`

### 网络环境

不同网络环境（Wifi/4G/3G）下，加载不同尺寸和像素的图片，通过 URL 后缀加不同参数改变。

### 响应式图片

不同窗口大小还有不同设备、像素下展示不同大小的图片,有以下三种方式实现：

- javascript 绑定事件检测窗口大小

  ```js
  // 获取窗口大小
  const width = window.innerWidth || document.body.clientWidth
  const height = window.innerHeight || document.body.clientHeight

  // 监听窗口变化
  window.addEventListeners('resize', () => {})
  ```

- CSS 媒体查询

  ```css
  @media screen and (max-width: 640px) {
    img {
      width: 650px;
    }
  }
  ```

- img 标签属性

  ```html
  <img
    srcset="img-320w.jpg,img-640w.jpg 2x;img-960w.jpg 3x"
    src="img-960w.jpg"
    alt="img"
  />
  ```

### 逐步加载图像

- 使用统一占位符
- 使用 LQIP（低质量图像占位符 base64）`npm install lqip`
- 使用 SQIP（基于 SVG 的图像占位符）`npm install sqip`

### 替代图片

- webFont
- Data URL
- 雪碧图

### 图片服务器优化

图片服务器自动优化是可以在图片 URL 链接上增加不同特殊参数，服务器自动化生成不同格式、大小、质量、特殊能力等的图片。

处理方式：

- 图片裁剪：按长边、短边、填充、拉伸等缩放。
- 图片格式转换：支持 JPG、GIF、PNG、WebP 等，支持不同的图片压缩率。
- 图片处理：添加图片水印、高斯模糊、重心处理、裁剪边框等。
- AL 能力：鉴黄以及智能抠图、智能排版、智能配色、智能合成等 AL 能力。

技术实现：

- 将图片压缩、图片裁剪、图片格式转换等本地工具部署至线上图片服务器集群上。
- 内部运营或外网用户上传本地图片至图片服务器后，服务器默认处理转换成多种图片格式，并推送至图片 CDN 服务器上。
- 图片服务器对外开放多个域名（比如 images1.com、images2.com 等），同时对各个业务线开放不同的业务路径（比如 images1.com/homepage 等）。
- 外网用户请求带有特殊参数的图片 URL 时，图片服务器根据 URL 中不同的参数类型，从本地缓存中取得，或者实时对图片进行即使处理，并返回给客户端。

## HTML 优化

### 精简 HTML 代码

- 减少 HTML 的嵌套
- 减少 DOM 节点数
- 减少无语义代码（比如：`<div class="clear"></div>`清除浮动）
- 删除 http 或者 https，如果 URL 的协议头和当前页面的协议头一致的，或者此时 URL 在多个协议头都是可用的，可以考虑删除协议头
- 删除多余的空格、换行符、缩紧和不必要的注释（通过压缩代码）
- 省略冗余标签和属性
- 使用相对路径的 URL

### 文件放在合适位置

- css 样式文件链接尽量放在页面头部
  - css 加载不会阻塞 DOM tree 解析，但是会阻塞 DOM Tree 渲染，也会阻塞后面 JS 执行。在然后 body 元素之前，可以确保在文档部分中解析了所有 CSS 样式（内联和外联），从而减少了浏览器必须重排文档的次数，如果放置在页面底部，就要等待最后一个 CSS 文件下载完成，此时就会出现“白屏”，影响用户体验。
- JS 引用放在 HTML 底部
  - 防止 JS 的加载、解析、执行对阻塞页面后续元素的正常渲染。

### 增强用户体验

- 设置 Favicon.ico
- 增加首屏必要的 CSS 和 JS
  - 页面如果需要等待所依赖的 JS 和 CSS 加载完成才显示，则在渲染过程中页面会一直显示空白，影响用户体验，建议增加首屏必要的 CSS 和 JS，比如页面框架背景图片或者 loading 图标，内联在 HTML 页面中。这样做，首屏能快速显示出来，现对减少用户对页面加载等待过程。

## CSS 优化

### 提升 CSS 渲染性能

- 谨慎使用 expensive 属性。如:`nth-child` 伪类;`position: fixed`定位
- 尽量减少样式层级数。如 `div ul li span i {color: blue;}`
- 尽量避免使用占用过多 CUP 和内存的属性。如`text-indnt:-99999px`
- 尽量避免使用耗电量大的属性。如`CSS3 3D transforms、CSS3 transitions、Opacity`

### 合适使用 CSS 选择器

- 尽量避免使用 CSS 表达式。`background-color:expression((newDate()).getHours()%2?"#FFF":"#000");`
- 尽量避免使用通配选择器。`body>a{font-weight:blod;}`
- 尽量避免类正则的属性选择器。`*=，|=，^=，$=`

### 提升 CSS 文件加载性能

- 使用外链的 CSS(CDN)
- 尽量避免使用 @import（阻塞 CSS 和 JS 文件）

### 精简 CSS 代码

可以通过压缩 CSS 代码，减少样式表大小

- 使用缩写语句
- 删除不必要的零
- 删除不必要的单位，如 px
- 删除除过多分号
- 删除空格和注释
- 尽量减少样式表的大小

### 合理使用 Web Fonts

- 将字体部署在 CDN 上
- 将字体以 base64 形式保存在 CSS 中并通过 localStorage 进行缓存
- Google 字体库因为某些不可抗拒原因，应该使用国内托管服务

### CSS 动画优化

- 尽量避免同时动画（影响用户体验和浏览器性能）
- 延迟动画初始化（保证其他 css 正常渲染）
- 结合 SVG

## JS 优化

原则：

- 当需要时才优化
- 考虑可维护性（团队）

### 提升 JavaScript 文件加载性能

加载元素的顺序 CSS 文件放在 `<head>` 里， JavaScript 文件放在`<body>` 里底部。

### JavaScript 变量和函数优化

- 尽量使用 id 选择器（性能好）
- 尽量避免使用 eval（耗性能）
- JavaScript 函数尽可能保持简洁
- 使用事件节流函数（提升性能）
- 使用事件委托

### JavaScript 动画优化

- 避免添加大量 JavaScript 动画
- 尽量使用 CSS3 动画（性能）
- 尽量使用 Canvas 动画（性能）
- 合理使用 requestAnimationFrame 动画代替 setTimeout、setInterval（setTimeout 无法保证执行时间）
- requestAnimationFrame 可以在正确的时间进行渲染，setTimeout(callback)和 setInterval(callback)无法保证 callback 回调函数的执行时机

### 合理使用缓存

- 合理缓存 DOM 对象
- 缓存列表长度
- 使用可缓存的 Ajax

### 简化 DOM 操作

- 对 DOM 节点的操作统一处理后，再统一插入到 DOM Tree 中。
- 可以使用 fragment，尽量不在页面 DOM Tree 里直接操作。
- 现在流行的框架 Angular、React、Vue 都在使用虚拟 DOM 技术，通过 diff 算法 简化和减少 DOM 操作。

## 静态文件压缩

### 压缩工具

- HTML 压缩工具`html-minifier`
- CSS 压缩工具`clean-css`
- JS 压缩工具`uglify-js`

### 打包方案

- 公共组件拆分
- 压缩：JS/CSS/图片
- 合并：JS/CSS 文件压缩，CSS Sprite
- Combo: JavaScript /CSS 文件 Combo http://cdn.com/??a.js,b.js 内容

### 版本号更新

- 缓存更新
  - CDN 或者 ng 后台更新文件路径，更新文件 header 头
- 文件 name.v1-v100.js
  - 大功能迭代每次新增一个大版本，比如由 v1 到 v2
  - 小功能迭代新增 0.0.1 或者 0.1.1，比如从 v1.0.0 至 v1.0.1
  - 年末 ng 统一配置所有版本 302 至最新版
- 时间戳.文件 name.js
  - 以每次上线时间点做差异
- 文件 hash.文件 name.js
  - 以文件内容 hash 值做 key
  - 每次上线，文件路径不一致

## webpack 打包优化

- 定位体积大的模块
- 删除没有使用的依赖
- 生产模式进行公共依赖包抽离
- 开发模式进行 DLL & DllReference方式优化
