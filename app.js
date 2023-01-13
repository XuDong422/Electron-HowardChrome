'use strict';

const { ipcMain, app, BrowserWindow, Menu, MenuItem, shell } = require('electron');
const path = require('path')
const updater = require('./update')
const template = require('./menu')
const url = require('url')
var fs = require("fs")
const AppName = "HowardBrowser"
const AppName_en = "HowardBrowser"
const reg_content = 'HKLM\\SOFTWARE\\Classes\\' + AppName_en
// let appTray;
// let Win_list = [];
let Win_list = new Set();
app.allowRendererProcessReuse = true;
/*隐藏electron创听的菜单栏*/
// Menu.setApplicationMenu(null);
var storageLocation = app.getPath('userData');
var JSONStorage = require('node-localstorage').JSONStorage;
var nodeStorage = new JSONStorage(storageLocation);

// const regedit = require('regedit');
// let exe_url = app.getPath('exe');

// 加载主题模式
var browser_theme;
try { browser_theme = nodeStorage.getItem('browser_theme') || "light"; } catch (err) { }

//默认下载保存路径
// var download_save_path = app.getPath("downloads") + "\\" + AppName + "下载\\";
// 默认下载到桌面
var download_save_path = app.getPath("desktop")
var is_download_user_tip = false;
var downloadData = nodeStorage.getItem('downloadData') || {};
var uuid = require('uuid');

//窗口状态
var winState = undefined;



// const gotTheLock = app.requestSingleInstanceLock();
const args = [];
if (!app.isPackaged) {
  args.push(path.resolve(process.argv[1]));
}
const PROTOCOL = 'HowardBrowser';
app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, args);
// const PDFWindow = require('electron-pdf-window')

// function opSet (argv) {
//   argv = argv.filter(val => val !== "--allow-file-access-from-files");
//   argv = argv.filter(val => val.indexOf("--original-process-start-time=") === -1);

//   var file_path = ""
//   argv.forEach((str, i, obj) => {
//     var last_len = str.lastIndexOf(".");
//     var len = str.length;
//     var pathf = str.substring(last_len, len).toLowerCase();
//     if (pathf !== ".exe") {
//       if (str) {
//         var stat = fs.statSync(str);
//         if (stat.isFile()) {
//           file_path = str;
//         }
//       }
//     }
//   })
//   return file_path;
// }

// function handleArgv (argv) {
//   const prefix = `${PROTOCOL}:`;
//   const offset = app.isPackaged ? 1 : 2;
//   const url = argv.find((arg, i) => i >= offset && arg.startsWith(prefix));
//   return url ? handleUrl(url) : opSet(argv);
// }

function handleUrl (urlStr) {
  // myapp:?a=1&b=2
  const urlObj = new URL(urlStr);
  const { searchParams } = urlObj;
  return searchParams
}

function notice (title = "通知", content = "通知内容", icon = "fad fa-flag-checkered") {
  Win_list.forEach((win) => {
    win.webContents.send('notice-msg', title, content, icon);
  });

}


for (let key in downloadData) {
  var item = downloadData[key]
  if (item.download_state == "play") {
    item["download_state"] = "pause";
  }
}


function download_change () {
  var download_process = 0;
  var download_num = 0;
  for (let key in downloadData) {
    var item = downloadData[key]
    if (item.download_state == "play") {
      download_process += Number((item.download_progress / item.fileSize).toFixed(2));
      download_num++;
    }
  }
  Win_list.forEach((win) => {
    var text = ((download_process / download_num).toFixed(2) * 100).toString()
    var index = text.indexOf('.')
    // // console.log(download_process+"---"+download_num)
    var process_num = index == -1 ? text + "%" : text.slice(0, index) + "%"
    if (download_num == 0) {
      win.webContents.send('download-manage', "done", 0)
      win.setProgressBar(-1)
    } else {
      download_num = download_num > 99 ? "99+" : download_num;
      win.webContents.send('download-manage', process_num, download_num)
      var p = (download_process / download_num).toFixed(2)
      if (p == 0) { p = 0; }
      win.setProgressBar(Number(p));
    }
  });
  // console.log(downloadData)
  nodeStorage.setItem('downloadData', downloadData);
}


app.on('session-created', (session) => {
  // 检测到下载行为启动
  session.on('will-download', (e, item, contents) => {
    // const url = item.getURL()
    // let loadInfo = cacheDownItem[url] || {}

    // 无需对话框提示， 直接将文件保存到默认路径
    // app.getPath用来获取系统的基础路径。
    // const filePath = path.join(app.getPath("desktop"), item.getFilename())
    // console.log("path", filePath);
    // item.setSavePath(filePath)

    // var file_name = item.getFilename();
    // var last_len = file_name.lastIndexOf(".");
    // var len = file_name.length;
    // var pathf = file_name.substring(last_len, len).toLowerCase();
    // if (pathf === ".pdf") {
    //     [...Win_list][0].send('open-file', item.getURL(), pathf)
    //     return;
    // }
    // if (is_download_user_tip) {

    // } else {
    //     item.setSavePath()
    // }
    const filePath = path.join(download_save_path, item.getFilename())
    item.setSavePath(filePath)

    var date = new Date();
    var download_id = uuid.v4()
    downloadData[download_id] = {
      fileName: item.getFilename(),
      fileSize: item.getTotalBytes(),
      download_progress: item.getReceivedBytes(),
      date: date,
      download_path: download_save_path,
      url: item.getURL(),
      item: item,
      download_state: "play"
    }
    notice('下载管理器', "开始下载文件" + item.getFilename(), "fad fa-download");



    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        downloadData[download_id]["download_state"] = "pause";
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          downloadData[download_id]["download_state"] = "pause";
        } else {
          downloadData[download_id]["download_progress"] = item.getReceivedBytes();
        }
      }
      download_change();
    })
    item.once('done', (event, state) => {
      if (state === 'completed') {
        downloadData[download_id]["download_state"] = "success";
        downloadData[download_id]["download_progress"] = item.getReceivedBytes();
        notice('下载管理器', "文件" + item.getFilename() + "下载完成", "fad fa-check-circle");
      } else {
        // // console.log(`Download failed: ${state}`)
        // console.log(downloadData[download_id]["download_state"])
        downloadData[download_id]["download_state"] = "state";
        notice('下载管理器', "文件" + item.getFilename() + "下载出错", "fad fa-exclamation-triangle");
      }
      download_change();
    })
    //   let hostWebContents = contents;
    //   if (contents.getType() === 'webview') {
    //     const hostWebContents = contents.hostWebContents;
    //   }
    //   const hostWin = BrowserWindow.fromWebContents(hostWebContents);
  });
});

// 创建窗口
function createBrowserWindow (file_path) {
  // winState本地存储的信息
  if (winState === undefined) {
    try {
      winState = nodeStorage.getItem('winState') || {};
    } catch (err) { }
  }
  let Win = new BrowserWindow({
    title: AppName,
    x: winState.bounds && winState.bounds.x || undefined,
    y: winState.bounds && winState.bounds.y || undefined,
    width: winState.bounds && winState.bounds.width || 1100,
    height: winState.bounds && winState.bounds.height || 720,
    minWidth: 500,
    minHeight: 400,
    /*skipTaskbar: true,*/
    frame: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    backgroundColor: "#fff",
    // autoHideMenuBar:true,
    // transparent: true,
    // icon: "./app/imgs/logo.ico",
    show: true,
    // preload: path.join(__dirname, '/app/index.js'),
    // alwaysOnTop: false,
    webPreferences: {
      // nodeIntegration为true,contextIsolation为false,这是页面上使用node api的关键
      nodeIntegration: true,
      contextIsolation: false,
      experimentalFeatures: true,
      // 允许使用webview
      webviewTag: true,
      // nativeWindowOpen: false,
      enableRemoteModule: true,
      // offscreen: false,
      plugins: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  Win.webContents.on("new-window", function (e) {
    // console.log('new-window')
    // console.log("新窗口")
  })
  Win_list.add(Win)

  if (JSON.stringify(winState) == "{}" || winState.isMaximized) {
    // 本地存储空对象默认最大化 || 设置最大化
    Win.maximize();
  }
  // if (winState && winState.isMaximized) {
  //     Win.maximize();
  // }
  var storeWindowState = function () {
    winState.isMaximized = Win.isMaximized();
    if (!winState.isMaximized) {
      winState.bounds = Win.getBounds();
    }
    // nodeStorage.setItem('winState', winState);
  };
  ['resize', 'move', 'close'].forEach(function (e) {
    Win.on(e, function () {
      storeWindowState();
    });
  });
  // move 很卡
  // ['resize', 'move', 'close'].forEach(function (e) {
  //     Win.on(e, function () {
  //         storeWindowState();
  //     });
  // });


  Win.once('ready-to-show', () => {
    // let hwnd = Win.getNativeWindowHandle()
    // 窗口最大化
    Win.maximize()
    // user32.GetSystemMenu(hwnd.readUInt32LE(0), true)
    // Win.show();

    // if (isArgs) {
    //     isArgs = false;
    //     // // console.log(process.argv);
    //     var data = handleArgv(process.argv);
    //     if (data == "") { } else if (typeof data == "string") {
    //         var last_len = data.lastIndexOf(".");
    //         var len = data.length;
    //         var pathf = data.substring(last_len, len).toLowerCase();
    //         [...Win_list][0].send('open-file', "file://" + data, "this", pathf)
    //         // // console.log("open-file");
    //     } else {
    //         opSet(process.argv)
    //     }
    // }

  })


  // and load the index.html of the app.
  if (file_path) {
    // 为了适配新窗口打开,将新窗口要打开的链接,存放在链接中,通过window.location.search获取
    if (file_path.indexOf("#") > -1) {
      // #号不能直接使用
      let hash_link = file_path.split("#");
      Win.loadURL(`file://${__dirname}/app/index.html?new_link=${hash_link[0]}&hash_link=${hash_link[1]}`);
    } else {
      Win.loadURL(`file://${__dirname}/app/index.html?new_link=${file_path}`);
    }
  } else {
    Win.loadURL(url.format({
      pathname: path.join(__dirname, '/app/index.html'),
      protocol: 'file:',
      slashes: true
    }));

  }

  // if (Win.webContents.isDevToolsOpened()) {
  //   Win.webContents.closeDevTools();
  // } else {
  //   Win.webContents.openDevTools();
  // }
  // 开发者模式启动
  BrowserWindow.getFocusedWindow().toggleDevTools()

  // var ses = Win.webContents.session;
  // // console.log(ses)

  // 主进程向渲染进程发送信息
  Win.webContents.send('toggle-theme', browser_theme);

  // electron BrowserWindow 实例事件
  Win.on("maximize", () => {
    Win.webContents.send('window_on', 'maximize');
  })
  Win.on("unmaximize", () => {
    Win.webContents.send('window_on', 'unmaximize');
  })
  Win.on("will-resize", () => {
    Win.webContents.send('window_on', 'will-resize');
  })
  Win.on("resize", () => {
    Win.webContents.send('window_on', 'resize');
  })
  Win.on("enter-full-screen", () => {
    Win.webContents.send('window_on', 'enter-full-screen');
  })
  Win.on("leave-full-screen", () => {
    Win.webContents.send('window_on', 'leave-full-screen');
  })
  Win.on("minimize", () => {
    Win.webContents.send('window_on', 'minimize');
  })
  Win.on("oncontextmenu", (e) => {
  })
  Win.on("dragend", (e) => {
  })
  Win.on("contextmenu", (e) => {
  })

  // 这部分通过electron的Menu实现
  // Win.on("blur", () => {
  //     try {
  //         globalShortcut.unregister("ESC")
  //         globalShortcut.unregister("F11")
  //         globalShortcut.unregister("F5");
  //         globalShortcut.unregister("Ctrl+=");
  //         globalShortcut.unregister("Ctrl+numadd");
  //         globalShortcut.unregister("Ctrl+-");
  //         globalShortcut.unregister("Ctrl+0");
  //     } catch (err) {}
  // })
  // Win.on("focus", () => {
  //     try {
  //         globalShortcut.register("ESC", () => {
  //             if (Win.isFocused()) {
  //                 if (Win.isFullScreen()) {
  //                     Win.setFullScreen(false);
  //                 }
  //             }
  //         })
  //         globalShortcut.register("F11", () => {
  //             if (Win.isFocused()) {
  //                 if (Win.isFullScreen()) {
  //                     Win.setFullScreen(false);
  //                 } else {
  //                     Win.setFullScreen(true);
  //                 }
  //             }
  //         })
  //         globalShortcut.register("F5", () => {
  //             if (Win.isFocused()) {
  //                 Win.webContents.send('reload-page')
  //             }
  //         }, true)
  //         globalShortcut.register("Ctrl+=", () => {
  //             if (Win.isFocused()) {
  //                 Win.webContents.send('zoom-in')
  //             }
  //         }, true)
  //         globalShortcut.register("Ctrl+-", () => {
  //             if (Win.isFocused()) {
  //                 Win.webContents.send('zoom-out')
  //             }
  //         }, true)
  //         globalShortcut.register("Ctrl+numadd", () => {
  //             if (Win.isFocused()) {
  //                 Win.webContents.send('zoom-in')
  //             }
  //         }, true)
  //         globalShortcut.register("Ctrl+0", () => {
  //             if (Win.isFocused()) {
  //                 Win.webContents.send('zoom-reset')
  //             }
  //         }, true)
  //     } catch (err) {}

  // })
  // 快捷键功能
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  Win.on('closed', () => {
    Win_list.delete(Win);
  })
}


// function new_pdf_win(path = "") {
//     var winState = {};
//     try { winState = nodeStorage.getItem('winState') || {}; } catch (err) {}
//     const pdf_win = new PDFWindow({
//         width: winState.bounds && winState.bounds.width || 1100,
//         height: winState.bounds && winState.bounds.height || 720,
//         title: path
//     })
//     if (winState && winState.isMaximized) {
//         pdf_win.maximize();
//     }
//     pdf_win.loadURL(path);
// }

ipcMain.on('synchronous-message', function (event, arg) {
  var jsonData = JSON.parse(arg)

  switch (jsonData.type) {
    case "theme":
      browser_theme = jsonData.data;
      Win_list.forEach((item) => {
        item.webContents.send('toggle-theme', jsonData.data);
      });
      nodeStorage.setItem('browser_theme', jsonData.data);
      break
    case "new-window":
      createBrowserWindow();
      break
    case "load-theme":
      event.sender.send('toggle-theme', browser_theme);
      break
    // case "open-pdf":
    //     new_pdf_win(jsonData.path);
    //     break
    case "msg-info":
      break
    case "":
      break
    default:
  }

  event.returnValue = "ok"
})

ipcMain.on('winBrowser_event', function (event, arg) {
  switch (arg) {
    case "destroy":
      // 关闭窗口
      BrowserWindow.getFocusedWindow().destroy()
      break;
    case "minimize":
      // 最小化窗口
      BrowserWindow.getFocusedWindow().minimize()
      break;
    case "maximize":
      // 最大化窗口
      BrowserWindow.getFocusedWindow().maximize()
      break;
    case "unmaximize":
      // 取消窗口最大化
      BrowserWindow.getFocusedWindow().unmaximize()
      break;
    case "isMaximized":
      if (BrowserWindow.getFocusedWindow() && BrowserWindow.getFocusedWindow().webContents) {
        // 窗口初始化完成,发送窗口最大化信息
        BrowserWindow.getFocusedWindow().webContents.send('win_isMaximized', BrowserWindow.getFocusedWindow().isMaximized());
      }
      break;
    case "isFullScreen":
      // F11
      BrowserWindow.getFocusedWindow().setFullScreen(!BrowserWindow.getFocusedWindow().isFullScreen())
      break;

    default:
  }
})

// 防止两次启动程序
// if (!gotTheLock) {
//   app.quit();
// } else {
//   app.on('second-instance', (event, argv, workingDirectory) => {
//     if (process.platform === 'win32') {
//       // Win_list.forEach((item, i, obj) => {
//       //     item.webContents.send('DEBUG', argv.toString())
//       // })
//       var data = handleArgv(argv);
//       // Win_list[0].send('open-file', "file://"+str)
//       if (data == "") { createBrowserWindow() } else if (typeof data == "string") {
//         var last_len = data.lastIndexOf(".");
//         var len = data.length;
//         var pathf = data.substring(last_len, len).toLowerCase();
//         // [...Win_list][0].send('open-file', "file://" + data, "", pathf)
//         if (pathf === ".pdf") {
//           // new_pdf_win(data)
//         } else if (pathf === ".html") {
//           [...Win_list][0].send('open-file', "file://" + data, "", pathf)
//         } else {
//           createBrowserWindow()
//         }
//       } else {
//         opSet(argv)
//       }

//     }
//   })
// }
//app.disableHardwareAcceleration();
app.on('ready', () => {
  // 更新软件 使用electron-updater
  updater()
  // // console.log("ready");
  // createBrowserWindow(true)
  // // console.log(process.argv);
  // BrowserWindow.addExtension("./app/Extensions/jsonview/0.0.32.3_0");


  // 创建窗口
  createBrowserWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createBrowserWindow()
    }
  })

  // // console.log(BrowserWindow.getExtensions());
  // console.log(process)
  // var data = handleArgv(process.argv);
  // // console.log(data)
  // if (data == "") {
  //   createBrowserWindow()
  // } else if (typeof data == "string") {
  //   var last_len = data.lastIndexOf(".");
  //   var len = data.length;
  //   var pathf = data.substring(last_len, len).toLowerCase();
  //   if (pathf === ".pdf") {
  //     // new_pdf_win(data);
  //   } else if (pathf === ".html") {
  //     createBrowserWindow();
  //     setTimeout(() => {
  //       [...Win_list][0].send('open-file', "file://" + data, "this", pathf)
  //     }, 1000);
  //   } else {
  //     createBrowserWindow()
  //   }
  // } else {
  //   opSet(process.argv)
  // }
})
app.on('window-all-closed', () => {
  nodeStorage.setItem('winState', winState);
  app.quit();
})
app.on('activate', () => { })

// 右击菜单内容
const contextMenuTemplate = []
ipcMain.on('show-contextmenu', function (e, data) {
  // 重新生成右击菜单
  const contextMenu = Menu.buildFromTemplate(contextMenuTemplate)
  // 有标签并且有链接则新窗口打开链接
  if (data.href) {
    contextMenu.append(new MenuItem({
      label: '新标签页打开链接',
      click: () => {
        BrowserWindow.getFocusedWindow().webContents.send('rendering_link_open', data.href)
      }
    }))
    contextMenu.append(new MenuItem({
      label: '新窗口打开链接',
      click: () => {
        createBrowserWindow(data.href)
      }
    }))
    contextMenu.append(new MenuItem({
      label: '默认浏览器打开链接',
      click: () => {
        shell.openExternal(data.href)
      }
    }))
  }
  if ((data.media_type === 'image' || data.media_type === 'audio' || data.media_type === 'video') && data.src) {
    let type = null
    if (data.media_type === 'image') {
      type = '图片'
    } else if (data.media_type === 'audio') {
      type = '音频'
    } else if (data.media_type === 'video') {
      type = '视频'
    }
    contextMenu.append(new MenuItem({
      label: '新标签打开' + type,
      click: () => {
        BrowserWindow.getFocusedWindow().webContents.send('rendering_link_open', data.src)
      }
    }))
    contextMenu.append(new MenuItem({
      label: '下载此' + type,
      click: () => {
        let newWindow = new BrowserWindow({
          show: false, // 最大化
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
          }
        })
        newWindow.webContents.downloadURL(data.src)
      }
    }))
  }
  if (data.txt) {
    // 有选中文本则提供复制按钮
    contextMenu.append(new MenuItem({
      label: '复制',
      role: 'copy'
    }))
  } else if (data.input_type === 'plainText') {
    // input框或者textarea框则提供粘贴按钮
    contextMenu.append(new MenuItem({
      label: '粘贴',
      role: 'paste'
    }))
  }
  // contextMenu.append(new MenuItem({
  //     label: '刷新',
  //     role: 'reload'
  // }))
  contextMenu.append(new MenuItem({
    label: '刷新',
    click: () => {
      BrowserWindow.getFocusedWindow().webContents.send('reload_webview', 'reload')
    }
  }))

  // contextMenu.append(new MenuItem({
  //     label: '去缓存刷新',
  //     click: () => {
  //         BrowserWindow.getFocusedWindow().webContents.send('reload_webview', 'reloadIgnoringCache')
  //     }
  // }))
  contextMenu.popup(BrowserWindow.getFocusedWindow())
})



// 使用regedit会引起安全管家警报
// function setPath(exe_url) {
//     regedit.putValue({
//         reg_content: { // 设置注册表url调用electronApp
//             'defaule': {
//                 value: "RoseBrowser", // 设置点击url的弹出框名字（表现不好）
//                 type: 'REG_DEFAULT'
//             },
//             'URL Protocol': {
//                 value: '',
//                 type: 'REG_SZ'
//             },
//             'path': {
//                 value: `${exe_url}`,
//                 type: 'REG_SZ'
//             }
//         },
//         'HKLM\\SOFTWARE\\Classes\\electronAPP\\shell\\open\\command': {
//             'defaule': {
//                 value: `"${exe_url}" "$1"`, // 需要唤起的应用程序路劲
//                 type: 'REG_DEFAULT'
//             }
//         }
//     }, (putErr) => {
//         // // console.log(putErr)
//     })
// }
// if (exe_url) { // 判断启动url是否正确（用户重新安装，并将安装目录修改）
//     regedit.list(reg_content, (listErr, docData) => {
//         if (listErr) {
//             regedit.createKey(['HKLM\\SOFTWARE\\Classes\\electronAPP\\shell\\open\\command'], (createErr) => {
//                 if (!createErr) {
//                     setPath(exe_url)
//                 }
//             })
//         } else {
//             if (docData[reg_content].values.path.value !== url) {
//                 setPath(exe_url)
//             }
//         }
//     })
// }