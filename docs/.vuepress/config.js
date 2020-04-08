const fs = require('fs')
const path = require('path')
module.exports = {
  title: 'zxj blog',
  description: 'my blog',
  lang: 'zh-CN',
  markdown: {
    lineNumbers: true
  },
  themeConfig: {
    smoothScroll: true, // 页面滚动
    lastUpdated: '上次更新', // 更新时间
    nav: [
      { text: 'webpack', link: '/webpack/' },
      { text: 'vue源码', link: '/vue/' },
      { text: 'react', link: '/react/' }
    ],
    sidebar: {
      '/webpack/': getSideBarChildren('webpack'),
      '/vue/': getSideBarChildren('vue')
    }
  }
}

function getSideBarChildren(title) {
  let sideBarPath = path.resolve(`./docs/${title}`)
  let children = fs.readdirSync(sideBarPath).map(fileName => {
    fileName = fileName.split('.')[0]
    return fileName === 'README' ? '' : fileName
  })
  children.sort(function(m, n) {
    var a = fs.statSync(sideBarPath + `/${m || 'README'}.md`)
    var b = fs.statSync(sideBarPath + `/${n || 'README'}.md`)
    return a.btime - b.btime
  })
  return [
    {
      title: title,
      collapsable: false,
      children: children
    }
  ]
}
