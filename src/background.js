"use strict";

import { app, protocol, BrowserWindow, ipcMain, Notification, Tray, Menu, shell } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import path from 'path';
const isDevelopment = process.env.NODE_ENV !== "production";

// 全局变量
global.tray = null;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

async function createWindow() {
  // Create the browser window.
  // 设置窗口图标路径
  const iconPath = path.join(__dirname, '../src/assets/logoTitle.png');
  
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true, // 隐藏左上角菜单栏
    title: "柯赛解密申请", // 设置窗口标题
    icon: iconPath, // 设置窗口图标
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
    },
  });
  
  // 窗口关闭事件 - 隐藏到托盘而不是退出
  win.on('close', (event) => {
    // 如果不是通过托盘菜单退出，则隐藏窗口
    if (!global.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    win.loadURL("app://./index.html");
  }
}

// 窗口关闭时隐藏到托盘而不是退出应用
app.on('browser-window-close', (event, win) => {
  // 阻止默认关闭行为
  event.preventDefault();
  // 隐藏窗口而不是关闭
  win.hide();
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // 即使所有窗口都关闭，也不退出应用
  // 只有在macOS上，保持默认行为
  if (process.platform !== "darwin") {
    // 不退出应用，让它继续在后台运行
    // 除非用户通过托盘菜单明确选择退出
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS);
    } catch (e) {
      console.error("Vue Devtools failed to install:", e.toString());
    }
  }

  // 创建设置系统托盘的函数
  function createTray() {
    // 设置托盘图标
    const iconPath = path.join(__dirname, '../src/assets/logoTitle.png');
    const tray = new Tray(iconPath);
    
    // 设置托盘图标提示文本
    tray.setToolTip('柯赛解密申请');
    
    // 创建托盘菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          // 如果已有窗口，则显示并聚焦
          const windows = BrowserWindow.getAllWindows();
          if (windows && windows.length > 0) {
            const mainWindow = windows[0];
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
          } else {
            // 否则创建新窗口
            createWindow();
          }
        }
      },
      {
        label: '退出',
        click: () => {
          app.quit();
        }
      }
    ]);
    
    // 设置托盘菜单
    tray.setContextMenu(contextMenu);
    
    // 点击托盘图标显示/隐藏窗口
    tray.on('click', () => {
      const windows = BrowserWindow.getAllWindows();
      if (windows && windows.length > 0) {
        const mainWindow = windows[0];
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        createWindow();
      }
    });
    
    return tray;
  }

  // 设置开机自启
  if (!isDevelopment) {
    // 针对Windows的开机自启设置
    if (process.platform === 'win32') {
      app.setLoginItemSettings({
        openAtLogin: true,
        args: ["--hidden"], // 添加隐藏参数
      });
    } 
    // 针对macOS的开机自启设置
    else if (process.platform === 'darwin') {
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true, // macOS支持openAsHidden
        args: ["--hidden"],
      });
    }
    console.log("开机自启已设置为后台隐藏式启动");
  }

  // 检查是否通过开机自启启动，如果不是则创建窗口
  const shouldShowWindow = !process.argv.includes("--hidden");
  
  // 创建设置托盘，无论是否显示窗口都需要托盘
  global.tray = createTray();
  
  // 根据启动参数决定是否显示窗口
  if (shouldShowWindow) {
    createWindow();
  } else {
    console.log("应用以隐藏模式启动");
  }
});

// 持久化通知函数 - 确保通知不会自动关闭
function showPersistentNotification(body, filePath) {
  console.log('显示持久化通知', { body, filePath });
  
  // 创建通知配置
  const notificationOptions = {
    title: '柯赛解密申请消息通知',
    body: body || '这是一条来自柯赛解密申请系统的桌面通知！',
    icon: path.join(__dirname, '../src/assets/logoTitle.png'),
    requireInteraction: true, // 关键设置：要求用户交互才能关闭
    urgency: 'critical', // 设置为最高优先级
    actions: [
      {
        type: 'button',
        text: '查看'
      }
    ]
  };
  
  // 为Windows添加额外设置
  if (process.platform === 'win32') {
    // Windows特有设置
    notificationOptions.timeoutType = 'never'; // 永不超时
  }
  
  // 创建通知
  const notification = new Notification(notificationOptions);
  
  // 通知点击事件
  notification.on('click', () => {
    console.log('用户点击了通知');
    
    // 如果有文件路径，则打开文件夹
    if (filePath) {
      try {
        console.log('尝试打开文件路径:', filePath);
        // 使用shell打开文件夹并选中文件
        shell.showItemInFolder(filePath);
      } catch (error) {
        console.error('打开文件路径失败:', error);
      }
    }
    
    // // 点击后聚焦应用窗口
    // const windows = BrowserWindow.getAllWindows();
    // if (windows && windows.length > 0) {
    //   const mainWindow = windows[0];
    //   if (mainWindow.isMinimized()) {
    //     mainWindow.restore();
    //   }
    //   mainWindow.focus();
    // } else {
    //   // 如果没有窗口打开，则创建一个新窗口
    //   createWindow();
    // }
  });
  
  // 通知按钮点击事件（用于Windows）
  notification.on('action', (event, index) => {
    console.log('用户点击了通知按钮，索引:', index);
    
    if (index === 0 && filePath) { // 第一个按钮是"查看"
      try {
        console.log('通过按钮打开文件路径:', filePath);
        shell.showItemInFolder(filePath);
      } catch (error) {
        console.error('打开文件路径失败:', error);
      }
    }
  });
  
  // 通知关闭事件
  notification.on('close', () => {
    console.log('通知被关闭');
  });
  
  // 通知显示事件
  notification.on('show', () => {
    console.log('通知已显示');
  });
  
  // 触发通知显示
  notification.show();
}

// IPC通信设置 - 监听来自渲染进程的通知请求
ipcMain.on('show-persistent-notification', (event, data) => {
  console.log('收到渲染进程的通知请求', data);
  // 提取body和filePath参数
  const body = data && data.body ? data.body : undefined;
  const filePath = data && data.filePath ? data.filePath : undefined;
  showPersistentNotification(body, filePath);
  // 回复渲染进程通知已发送
  event.reply('notification-shown', { success: true });
});

// 监听应用退出事件
app.on('before-quit', () => {
  global.isQuitting = true;
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        global.isQuitting = true;
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      global.isQuitting = true;
      app.quit();
    });
  }
}
