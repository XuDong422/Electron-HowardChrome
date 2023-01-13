const { ipcMain, screen, BrowserWindow } = require('electron');
const template = [

    // {
    //     label: '上一页',
    //     accelerator: 'Alt+Left',
    //     visible: BrowserWindow.getFocusedWindow().webContents.canGoBack(),
    //     click: () => {
    //         if (BrowserWindow.getFocusedWindow() != null) {
    //             BrowserWindow.getFocusedWindow().webContents.goBack()
    //         }
    //     }
    // },
    // {
    //     label: '下一页',
    //     accelerator: 'Alt+Right',
    //     visible: BrowserWindow.getFocusedWindow().webContents.canGoForward(),
    //     click: () => {
    //         if (BrowserWindow.getFocusedWindow() != null) {
    //             BrowserWindow.getFocusedWindow().webContents.goForward()
    //         }
    //     }
    // },
    {
        label: '刷新',
        accelerator: 'F5',
        click: () => {
            BrowserWindow.getFocusedWindow().webContents.send('reload_webview', 'reload')
        }
    },
    // {
    //     label: '打开后台',
    //     accelerator: 'HOME',
    //     click: () => {
    //         win.loadURL(loadUrl)
    //             // updateHandle(win)
    //     }
    // },
    {
        label: '功能',
        submenu: [{
                label: '复制',
                accelerator: 'CmdOrCtrl+C',
                role: 'copy'
            },
            {
                label: '粘贴',
                accelerator: 'CmdOrCtrl+V',
                role: 'paste'
            },
            {
                label: '全选',
                accelerator: 'CmdOrCtrl+A',
                role: 'selectall'
            },
            {
                label: '撤销',
                accelerator: 'Ctrl+Z',
                role: 'undo'
            },
            {
                label: '剪切',
                accelerator: 'Ctrl+X',
                role: 'cut'
            },
            {
                label: '搜索',
                accelerator: 'Ctrl+F',
                click: function(item, win) {
                    // 在这里监听两个按键比较准,检测到搜索发送事件获取文本,搜索文本的执行代码在ipcMain.on('searchText'
                    // win.webContents.send('ctrlF')
                    BrowserWindow.getFocusedWindow().webContents.send('search_text')
                }
            },
            // {
            //   label: '刷新',
            //   accelerator: 'F5',
            //   role: 'reload'
            // },
            {
                label: '强制刷新',
                accelerator: 'Ctrl+F5',
                click: () => {
                    BrowserWindow.getFocusedWindow().webContents.send('reload_webview', 'reloadIgnoringCache')
                }
            },
            // {
            //     label: '静音当前页',
            //     accelerator: 'F4',
            //     click: () => {
            //         // 设置页面静音 true|false
            //         if (BrowserWindow.getFocusedWindow() != null) {
            //             // let webContent = webContents.getFocusedWebContents()
            //             BrowserWindow.getFocusedWindow().webContents.setAudioMuted(!BrowserWindow.getFocusedWindow().webContents.isAudioMuted())
            //         }
            //     }
            // },
            // {
            //   label: '刷新',
            //   accelerator: 'F5',
            //   click: () => {
            //     // 刷新页面
            //     win.webContents.reload()
            //   }
            // },
            // {
            //   label: '强制刷新',
            //   accelerator: 'Ctrl+F5',
            //   click: () => {
            //     // 忽略缓存强制刷新页面
            //     win.webContents.reloadIgnoringCache()
            //   }
            // },
            // {
            //     type: 'separator' // 在li中增加横线
            // },
            {
                label: '更新',
                accelerator: 'F9',
                click: () => {
                    updater(true)
                }
            },
            {
                label: '检查元素',
                accelerator: 'Ctrl+Shift+C',
                click: () => {
                    if (BrowserWindow.getFocusedWindow() != null) {
                        const { x, y } = screen.getCursorScreenPoint()
                        BrowserWindow.getFocusedWindow().webContents.inspectElement(x, y)
                    }
                }
            },
            {
                label: '全屏',
                accelerator: 'F11',
                click: () => {
                    if (BrowserWindow.getFocusedWindow() != null) {
                        // BrowserWindow.getFocusedWindow().webContents.toggleDevTools()
                        BrowserWindow.getFocusedWindow().setFullScreen(!BrowserWindow.getFocusedWindow().isFullScreen())
                    }
                }
            },
            {
                label: '开发者工具',
                accelerator: 'F12',
                click: () => {
                    if (BrowserWindow.getFocusedWindow() != null) {
                        BrowserWindow.getFocusedWindow().webContents.toggleDevTools()
                    }
                }
            }
        ]
    },
    {
        label: '页面',
        submenu: [{
                label: '重置缩放',
                accelerator: 'Ctrl+0',
                click: () => {
                    BrowserWindow.getFocusedWindow().webContents.send('zoom-reset')
                }

                // role: 'resetzoom'
            },
            {
                label: '重置缩放',
                accelerator: 'Ctrl+Num0',
                click: () => {
                    BrowserWindow.getFocusedWindow().webContents.send('zoom-reset')
                }

                // visible: false, // 隐藏菜单项
                // role: 'resetzoom'
            },
            // {
            //     type: 'separator' // 在li中增加横线
            // },
            {
                label: '放大',
                accelerator: 'Ctrl+numadd',
                click: () => {
                    BrowserWindow.getFocusedWindow().webContents.send('zoom-in')
                }

                // role: 'zoomin'
            },
            {
                label: '缩小',
                accelerator: 'Ctrl+numsub',
                click: () => {
                    BrowserWindow.getFocusedWindow().webContents.send('zoom-out')
                }

                // role: 'zoomout'
            }
        ]
    },
    {
        label: '窗口',
        role: 'window',
        submenu: [{
                label: '最小化',
                accelerator: 'Ctrl+M+I',
                role: 'minimize'
            },
            {
                label: '最大化',
                accelerator: 'Ctrl+M+A',
                role: 'maximize'
            },
            // {
            //     label: '关闭',
            //     accelerator: 'Ctrl+W',
            //     role: 'close'
            // },
            // // 分割线
            // {
            //     type: 'separator'
            // },
            // {
            //     label: '新窗口',
            //     accelerator: 'Ctrl+N',
            //     click() {
            //         const win = new BrowserWindow({
            //             show: false, // 最大化
            //             webPreferences: {
            //                 nodeIntegration: true,
            //                 contextIsolation: false
            //             }
            //         })
            //         win.maximize()
            //         win.show()
            //             // win.setMenu(null); // 隐藏上部菜单
            //         win.loadURL(loadUrl)
            //     }
            // }
        ]
    }
]
module.exports = template