"use strict";

import { app, protocol, BrowserWindow, ipcMain, Notification, Tray, Menu } from "electron";
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
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true, // 隐藏左上角菜单栏
    title: "柯赛解密申请", // 设置窗口标题
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
    },
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

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
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

  // 设置开机自启
  if (!isDevelopment) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true, // 隐藏方式启动
      args: ["--hidden"], // 添加隐藏参数
    });
    console.log("开机自启已设置为后台隐藏式启动");
  }

  // 检查是否通过开机自启启动，如果不是则创建窗口
  const shouldShowWindow = !process.argv.includes("--hidden");
  if (shouldShowWindow) {
    createWindow();
  } else {
    console.log("应用以隐藏模式启动");
  }
});

// 持久化通知函数 - 确保通知不会自动关闭
function showPersistentNotification(body) {
  console.log('显示持久化通知');
  
  // 创建通知配置
  const notificationOptions = {
    title: '系统通知',
    body: body || '这是一条来自柯赛解密申请系统的桌面通知！',
    icon: path.join(__dirname, '../src/assets/logoTitle.png'),
    requireInteraction: true, // 关键设置：要求用户交互才能关闭
    urgency: 'critical' // 设置为最高优先级
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
    // 点击后聚焦应用窗口
    const windows = BrowserWindow.getAllWindows();
    if (windows && windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    } else {
      // 如果没有窗口打开，则创建一个新窗口
      createWindow();
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
  // 提取body参数，如果没有则使用默认值
  const body = data && data.body ? data.body : undefined;
  showPersistentNotification(body);
  // 回复渲染进程通知已发送
  event.reply('notification-shown', { success: true });
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}
