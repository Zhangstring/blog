const fs = require('fs')
const path = require('path')
module.exports = {
  title: 'zxj 个人博客',
  description: '记录平时的学习笔记',
  lang: 'zh-CN',
  markdown: {
    lineNumbers: true
  },
  themeConfig: {
    smoothScroll: true, // 页面滚动
    lastUpdated: '上次更新', // 更新时间
    nav: [
      { text: 'webpack', link: '/webpack/' },
      { text: 'vue', link: '/vue/start/' },
      { text: 'react', link: '/react/redux/' },
      {
        text: '其他',
        items: [
          {
            text: '前端性能优化',
            link: '/note/optimize/'
          }
        ]
      },
      { text: '简历', link: 'https://resume.zhangxujun.cn' }
    ],
    sidebar: {
      '/webpack/': getSideBarChildren('webpack'),
      '/vue/': getSideBarChildren({
        path: 'vue',
        titles: [
          {
            path: 'start',
            title: '开始'
          },
          {
            path: 'observe',
            title: '响应式原理'
          },
          {
            path: 'vmDom',
            title: '虚拟DOM'
          },
          {
            path: 'compile',
            title: '模版编译原理'
          },
          {
            path: 'all',
            title: '整体流程'
          },
          {
            path: 'vueRouter',
            title: 'Vue Router'
          },
          {
            path: 'vuex',
            title: 'Vuex'
          }
        ]
      }),
      '/react/': getSideBarChildren({
        path: 'react',
        titles: [
          {
            path: 'redux',
            title: 'Redux'
          },
          {
            path: 'redux-thunk',
            title: 'redux-thunk'
          }
        ]
      }),
      '/note/optimize/': getSideBarChildren({
        path: 'note/optimize',
        title: '前端性能优化'
      })
    }
  },
  plugins: [
    [
      'medium-zoom',
      {
        selector: '.preview',
        delay: 1000,
        options: {
          bgColor: 'black',
          zIndex: 10000
        }
      }
    ]
  ]
}

function getSideBarChildren(option) {
  let sidebarOptions = []
  option = option || {}
  option = typeof option === 'string' ? { path: option, title: option } : option
  let sideBarPath = path.resolve(`./docs/${option.path}`)
  let mdFiles = getMDFiles(sideBarPath)
  createTimeSort(mdFiles, sideBarPath)
  mdFiles.length &&
    sidebarOptions.push(createSidebarOption(option.title, mdFiles))
  option.titles &&
    option.titles.forEach(child => {
      let childSidebarPath = path.resolve(`./docs/${option.path}/${child.path}`)
      let mdFiles = getMDFiles(childSidebarPath)
      let childTitle = child.title || child.path
      createTimeSort(mdFiles, childSidebarPath)

      mdFiles = mdFiles.map(filename => child.path + '/' + filename)
      mdFiles.length &&
        sidebarOptions.push(createSidebarOption(childTitle, mdFiles))
    })
  return sidebarOptions
}
function createSidebarOption(title, children, collapsable = false) {
  return {
    title: title,
    collapsable: collapsable,
    children: children
  }
}
// 根据创建时间排序
function createTimeSort(children, sideBarPath, cData) {
  children.sort(function(m, n) {
    var a = fs.statSync(sideBarPath + `/${m || 'README'}.md`)
    var b = fs.statSync(sideBarPath + `/${n || 'README'}.md`)
    return a.birthtime - b.birthtime
  })
}
// 获取目录下的.md文件列表
function getMDFiles(sideBarPath) {
  let mainChildren = []
  let paths = fs.readdirSync(sideBarPath)
  paths.forEach(fileName => {
    fileNameArr = fileName.split('.')
    if (fileNameArr[1] === 'md') {
      fileName = fileNameArr[0]
      mainChildren.push(fileName === 'README' ? '' : fileName)
    }
  })
  return mainChildren
}
