const { app, BrowserWindow, screen, Menu, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// 书签存储路径
const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json')
// 历史记录存储路径
const historyPath = path.join(app.getPath('userData'), 'history.json')
// 透明度存储路径
const opacityPath = path.join(app.getPath('userData'), 'opacity.json')
// 窗口大小存储路径
const windowSizePath = path.join(app.getPath('userData'), 'windowSize.json')

// 读取窗口大小
function loadWindowSize() {
  try {
    if (fs.existsSync(windowSizePath)) {
      return JSON.parse(fs.readFileSync(windowSizePath, 'utf-8'))
    }
  } catch (e) {
    console.error('读取窗口大小失败:', e)
  }
  return null
}

// 保存窗口大小
function saveWindowSize(size) {
  try {
    fs.writeFileSync(windowSizePath, JSON.stringify(size), 'utf-8')
  } catch (e) {
    console.error('保存窗口大小失败:', e)
  }
}

// 读取书签
function loadBookmarks() {
  try {
    if (fs.existsSync(bookmarksPath)) {
      return JSON.parse(fs.readFileSync(bookmarksPath, 'utf-8'))
    }
  } catch (e) {
    console.error('读取书签失败:', e)
  }
  return []
}

// 保存书签
function saveBookmarks(bookmarks) {
  try {
    fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks), 'utf-8')
  } catch (e) {
    console.error('保存书签失败:', e)
  }
}

// 读取历史记录
function loadHistory() {
  try {
    if (fs.existsSync(historyPath)) {
      return JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
    }
  } catch (e) {
    console.error('读取历史记录失败:', e)
  }
  return []
}

// 保存历史记录（最多200条）
function saveHistory(history) {
  try {
    // 限制最多200条记录
    const limitedHistory = history.slice(0, 200)
    fs.writeFileSync(historyPath, JSON.stringify(limitedHistory), 'utf-8')
  } catch (e) {
    console.error('保存历史记录失败:', e)
  }
}

// 添加历史记录
function addHistoryEntry(url, title) {
  const history = loadHistory()
  const newEntry = {
    url,
    title: title || url,
    timestamp: new Date().toISOString()
  }

  // 移除重复的URL（如果有）
  const filteredHistory = history.filter(item => item.url !== url)
  // 添加到开头并限制数量
  const updatedHistory = [newEntry, ...filteredHistory].slice(0, 200)
  saveHistory(updatedHistory)
}

// 读取透明度
function loadOpacity() {
  try {
    if (fs.existsSync(opacityPath)) {
      return parseFloat(fs.readFileSync(opacityPath, 'utf-8'))
    }
  } catch (e) {
    console.error('读取透明度失败:', e)
  }
  return 1.0 // 默认不透明
}

// 保存透明度
function saveOpacity(opacity) {
  try {
    fs.writeFileSync(opacityPath, opacity.toString(), 'utf-8')
  } catch (e) {
    console.error('保存透明度失败:', e)
  }
}

// 创建中文菜单模板
const createMenuTemplate = (mainWindow) => {
  // 加载书签
  const bookmarks = loadBookmarks()

  // 创建书签子菜单
  const bookmarkSubmenu = [
    {
      label: '加入书签',
      click: async () => {
        const url = mainWindow.webContents.getURL()
        // 检查是否为首页或其他无效页面
        if (url.startsWith('file://') || url === 'about:blank') {
          // 显示错误提示
          const dialog = require('electron').dialog
          dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: '无法添加书签',
            message: '当前页面无法添加为书签',
            detail: '请浏览其他网页后再尝试添加书签'
          })
          return
        }

        try {
          const title = await mainWindow.webContents.executeJavaScript('document.title')
          const newBookmark = { title, url }
          const updatedBookmarks = [newBookmark, ...bookmarks.filter(b => b.url !== url)]
          saveBookmarks(updatedBookmarks)

          // 显示成功提示
          const dialog = require('electron').dialog
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '书签添加成功',
            message: `已成功添加书签: ${title}`,
            buttons: ['确定']
          })

          // 重新构建菜单以更新书签列表
          const newMenu = Menu.buildFromTemplate(createMenuTemplate(mainWindow))
          Menu.setApplicationMenu(newMenu)
        } catch (error) {
          console.error('添加书签失败:', error)
          const dialog = require('electron').dialog
          dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: '添加书签失败',
            message: '无法获取页面标题',
            detail: '请确保页面已完全加载'
          })
        }
      }
    },
    { type: 'separator' },
    {
      label: '查看书签',
      submenu: bookmarks.length > 0 ?
        bookmarks.map(bookmark => ({
          label: bookmark.title,
          submenu: [
            {
              label: '打开书签',
              click: () => {
                mainWindow.loadURL(bookmark.url)
              }
            },
            {
              label: '删除书签',
              click: () => {
                const dialog = require('electron').dialog
                dialog.showMessageBox(mainWindow, {
                  type: 'question',
                  title: '删除书签',
                  message: `确定要删除书签 "${bookmark.title}" 吗？`,
                  buttons: ['取消', '删除'],
                  defaultId: 0,
                  cancelId: 0
                }).then(result => {
                  if (result.response === 1) { // 点击了"删除"
                    const updatedBookmarks = bookmarks.filter(b => b.url !== bookmark.url)
                    saveBookmarks(updatedBookmarks)

                    // 重新构建菜单以更新书签列表
                    const newMenu = Menu.buildFromTemplate(createMenuTemplate(mainWindow))
                    Menu.setApplicationMenu(newMenu)

                    dialog.showMessageBox(mainWindow, {
                      type: 'info',
                      title: '删除成功',
                      message: `书签 "${bookmark.title}" 已删除`,
                      buttons: ['确定']
                    })
                  }
                })
              }
            }
          ]
        })) : [{ label: '暂无书签', enabled: false }]
    }
  ]

  return [
    {
      label: '文件',
      submenu: [
        {
          label: '关于',
          click: () => {
            const dialog = require('electron').dialog
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于摸鱼浏览器',
              message: '摸鱼浏览器',
              detail: '开发者: @Martin\n开发日期: 2025-09-05\n一款可以透明的摸鱼浏览器',
              buttons: ['确定']
            })
          }
        },
        { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '导航',
      submenu: [
        {
          label: '主页',
          accelerator: 'Alt+Home',
          click: () => mainWindow.loadFile('src/index.html')
        },
        { type: 'separator' },
        {
          label: '后退',
          accelerator: 'Alt+Left',
          click: () => mainWindow.webContents.goBack()
        },
        {
          label: '前进',
          accelerator: 'Alt+Right',
          click: () => mainWindow.webContents.goForward()
        },
        { type: 'separator' },
        {
          label: '刷新',
          accelerator: 'F5',
          click: () => mainWindow.reload()
        }
      ]
    },
    {
      label: '书签',
      submenu: bookmarkSubmenu
    },
    {
      label: '历史',
      submenu: (() => {
        const history = loadHistory()
        return history.length > 0 ?
          history.map(item => ({
            label: `${item.title}`,
            submenu: [
              {
                label: '打开',
                click: () => {
                  mainWindow.loadURL(item.url)
                }
              },
              {
                label: '删除',
                click: () => {
                  const dialog = require('electron').dialog
                  dialog.showMessageBox(mainWindow, {
                    type: 'question',
                    title: '删除历史记录',
                    message: `确定要删除历史记录 "${item.title}" 吗？`,
                    buttons: ['取消', '删除'],
                    defaultId: 0,
                    cancelId: 0
                  }).then(result => {
                    if (result.response === 1) {
                      const updatedHistory = history.filter(h => h.url !== item.url)
                      saveHistory(updatedHistory)
                      // 重新构建菜单
                      const newMenu = Menu.buildFromTemplate(createMenuTemplate(mainWindow))
                      Menu.setApplicationMenu(newMenu)
                      mainWindow.webContents.send('show-toast', `历史记录 "${item.title}" 已删除`)
                    }
                  })
                }
              }
            ]
          })) : [{ label: '暂无历史记录', enabled: false }]
      })()
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'delete', label: '删除' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '最大化' },
        { type: 'separator' },
        {
          label: `当前透明度: ${Math.round(mainWindow.getOpacity() * 100)}%`,
          enabled: false,
          click: () => { } // 纯展示，点击无效
        },
        {
          label: '透明度+', 
          accelerator: 'Ctrl+Shift+Up',
          click: () => {
            try {
              if (mainWindow && !mainWindow.isDestroyed()) {
                const currentOpacity = mainWindow.getOpacity();
                const newOpacity = Math.min(currentOpacity + 0.1, 1);
                syncMainWindowOpacity(newOpacity);
                // 更新菜单显示当前透明度
                const newMenu = Menu.buildFromTemplate(createMenuTemplate(mainWindow))
                Menu.setApplicationMenu(newMenu)
                mainWindow.webContents.send('show-toast', `透明度: ${Math.round(newOpacity * 100)}%`);
              }
            } catch (e) {
              console.error('透明度调整错误:', e)
            }
          }
        },
        { 
          label: '透明度-', 
          accelerator: 'Ctrl+Shift+Down',
          click: () => {
            try {
              if (mainWindow && !mainWindow.isDestroyed()) {
                const currentOpacity = mainWindow.getOpacity();
                const newOpacity = Math.max(currentOpacity - 0.1, 0.1);
                syncMainWindowOpacity(newOpacity);
                // 更新菜单显示当前透明度
                const newMenu = Menu.buildFromTemplate(createMenuTemplate(mainWindow))
                Menu.setApplicationMenu(newMenu)
                mainWindow.webContents.send('show-toast', `透明度: ${Math.round(newOpacity * 100)}%`);
              }
            } catch (e) {
              console.error('透明度调整错误:', e)
            }
          }
        },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
        { type: 'separator' },
        { role: 'close', label: '关闭窗口', accelerator: 'CmdOrCtrl+W' },
        { type: 'separator' },
        { role: 'front', label: '前置窗口' },
        { type: 'separator' },
        { 
          label: '快速隐藏', 
          accelerator: 'F2',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (mainWindow.isVisible()) {
                mainWindow.hide()
              } else {
                mainWindow.show()
              }
              // 更新菜单文本
              const newMenu = Menu.buildFromTemplate(createMenuTemplate(mainWindow))
              Menu.setApplicationMenu(newMenu)
            }
          }
        }
      ]
    }
  ]
}

let mainWindow

// 同步主窗口透明度
function syncMainWindowOpacity(opacity) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setOpacity(opacity)
    saveOpacity(opacity) // 保存透明度设置
  }
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const savedSize = loadWindowSize()

  // 创建浏览器窗口，优先使用保存的大小，否则使用屏幕的70%
  mainWindow = new BrowserWindow({
    width: savedSize?.width || Math.floor(width * 0.7),
    height: savedSize?.height || Math.floor(height * 0.7),
    title: '摸鱼浏览器',
    webPreferences: {
      nodeIntegration: true
    },
    icon: process.platform === 'win32' ? 'assets/icons/fish.ico' : 'assets/icons/fish.png',
    // 透明化设置
    transparent: true,          // 启用窗口透明
    frame: false,               // 移除默认窗口边框
    resizable: true,            // 保持窗口可调整大小
    hasShadow: false,           // 移除窗口阴影
    opacity: loadOpacity()     // 读取存储的透明度值
  })

  // 监听窗口大小变化并保存
  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const [currentWidth, currentHeight] = mainWindow.getSize()
      saveWindowSize({ width: currentWidth, height: currentHeight })
    }
  })

  // 主窗口关闭时的处理
  mainWindow.on('closed', () => {
    // 保存最后窗口大小
    if (mainWindow && !mainWindow.isDestroyed()) {
      const [currentWidth, currentHeight] = mainWindow.getSize()
      saveWindowSize({ width: currentWidth, height: currentHeight })
    }
    mainWindow = null
  })

  // 设置PC设备User-Agent
  mainWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  )

  // 设置应用菜单
  const menu = Menu.buildFromTemplate(createMenuTemplate(mainWindow))
  Menu.setApplicationMenu(menu)

  // 加载应用首页
  mainWindow.loadFile('src/index.html')

  // 添加快捷键
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F5') {
      mainWindow.reload()
    }
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
    }
    // 透明度调整快捷键
    if (input.control && input.shift && input.key === 'ArrowUp') {
      const currentOpacity = mainWindow.getOpacity();
      const newOpacity = Math.min(currentOpacity + 0.1, 1);
      syncMainWindowOpacity(newOpacity);
      mainWindow.webContents.send('show-toast', `透明度: ${Math.round(newOpacity * 100)}%`);
    }
    if (input.control && input.shift && input.key === 'ArrowDown') {
      const currentOpacity = mainWindow.getOpacity();
      const newOpacity = Math.max(currentOpacity - 0.1, 0.1);
      syncMainWindowOpacity(newOpacity);
      mainWindow.webContents.send('show-toast', `透明度: ${Math.round(newOpacity * 100)}%`);
    }
    // 快速隐藏/显示快捷键(F2)
    if (input.key === 'F2') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
        }
        // 更新菜单
        const newMenu = Menu.buildFromTemplate(createMenuTemplate(mainWindow))
        Menu.setApplicationMenu(newMenu)
      }
    }
  })

  // 处理新窗口创建，改为在主窗口中加载URL
  const handleNewWindow = (url) => {
    mainWindow.loadURL(url)
  }

  // 主窗口的新窗口处理
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    handleNewWindow(url)
    return { action: 'deny' }
  })

  // 记录主窗口导航历史
  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      const url = mainWindow.webContents.getURL()
      if (url && !url.startsWith('file://') && url !== 'about:blank') {
        const title = await mainWindow.webContents.executeJavaScript('document.title')
        addHistoryEntry(url, title)
        // 更新历史菜单
        const newMenu = Menu.buildFromTemplate(createMenuTemplate(mainWindow))
        Menu.setApplicationMenu(newMenu)
      }
    } catch (e) {
      console.error('记录历史失败:', e)
    }
  })
}

// 当所有窗口关闭时，保持应用运行（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
  }
})

app.whenReady().then(createWindow)