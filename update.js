const { autoUpdater } = require('electron-updater')
const { dialog, BrowserWindow } = require('electron')

// const log = require('electron-log')
// autoUpdater.logger = log
// autoUpdater.logger.transports.file.level = 'info'

const path = require('path')

// 防止报错no such file or directory dev-app-update.yml
// if (process.env.NODE_ENV === 'development') {
//     autoUpdater.updateConfigPath = path.join(__dirname, '../dev-app-update.yml')
// }
let valid_not = true
let settime_not = null
let valid_y = true
let settime_y = null
let dialog_click = true
let win = null
const updater = dialogVal => {
  // false不自动下载
  autoUpdater.autoDownload = false

  // 检测是否有新版本
  autoUpdater.checkForUpdates()

  // autoUpdater.on('checking-for-update', res => {
  //     // console.log(res)
  // })

  // 检测结果不需要更新
  autoUpdater.on('update-not-available', res => {
    // dialogVal如果为空就是不需要弹窗
    if (dialogVal) {
      if (valid_not) {
        // 未节流可以执行提示
        dialog.showMessageBox({
          type: 'info',
          title: '检测结果',
          message: '未发现需要更新的版本!' + JSON.stringify(res),
          buttons: ['确定']
        })
        // 状态改为节流中
        valid_not = false
        // 清除上一个倒计时
        clearTimeout(settime_not)
        // 等到5秒后节流完成
        settime_not = setTimeout(() => {
          // 状态改为未节流
          valid_not = true
        }, 300)
      } else {
        // 节流中禁止更新
        return false
      }
    }
  })


  // 检测结果有新版本
  autoUpdater.on('update-available', () => {
    if (valid_y && dialog_click) {
      dialog_click = false
      // 未节流可以执行提示
      dialog.showMessageBox({
        type: 'info',
        title: '软件更新',
        message: '发现新版本, 确定更新?',
        buttons: ['确定', '取消']
      }).then(resp => {
        if (resp.response == 0) {
          createWindow()
          autoUpdater.downloadUpdate()
        }
      }).finally(() => {
        dialog_click = true
      })
      // 状态改为节流中
      valid_y = false
      // 清除上一个倒计时
      clearTimeout(settime_y)
      // 等到5秒后节流完成
      settime_y = setTimeout(() => {
        // 状态改为未节流
        valid_y = true
      }, 300)
    } else {
      // 节流中禁止更新
      return false
    }
  })

  // 创建更新进度窗口
  async function createWindow () {
    win = new BrowserWindow({
      width: 300,
      height: 300,
      title: '更新',
      frame: false,
      resizable: true,
      transparent: true,
      maximizable: false,
      show: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    })
    win.loadURL(path.join(__dirname, './app/progress.html'))
  }

  // 监听更新进度
  autoUpdater.on('download-progress', res => {
    // 并将进度实时更新到进度展示页面
    win.webContents.send('downloadProgress', res.percent)
  })

  // 更新下载完成进行安装
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      title: '下载完成',
      message: '最新版本已下载完成, 退出程序进行安装'
    }).then(() => {
      autoUpdater.quitAndInstall()
    })
  })
}

module.exports = updater