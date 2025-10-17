"use strict";

import {
  app,
  protocol,
  BrowserWindow,
  ipcMain,
  Notification,
  Tray,
  Menu,
  shell,
} from "electron";
import fs from "fs";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import path from "path";
const isDevelopment = process.env.NODE_ENV !== "production";

// 全局变量
global.tray = null;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

async function createWindow() {
  try {
    // 创建浏览器窗口 - 使用健壮的图标路径处理
    let iconPath;
    try {
      if (app.isPackaged) {
        // 打包环境 - 尝试多种可能的路径
        const potentialPaths = [
          path.join(process.resourcesPath, "src", "assets", "logoTitle.png"),
          path.join(process.execPath, "..", "src", "assets", "logoTitle.png"),
          path.join(process.cwd(), "src", "assets", "logoTitle.png"),
        ];

        const fs = require("fs");
        for (const potentialPath of potentialPaths) {
          if (fs.existsSync(potentialPath)) {
            iconPath = potentialPath;
            console.log("找到窗口图标:", iconPath);
            break;
          }
        }
      } else {
        // 开发环境
        iconPath = path.join(__dirname, "../src/assets/logoTitle.png");
      }
    } catch (iconError) {
      console.error("查找窗口图标路径时出错:", iconError);
      iconPath = null; // 允许没有图标
    }

    const windowOptions = {
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
    };

    // 只有当iconPath有效时才设置图标
    if (iconPath) {
      windowOptions.icon = iconPath;
    }

    const win = new BrowserWindow(windowOptions);

    // 窗口关闭事件 - 隐藏到托盘而不是退出
    try {
      win.on("close", (event) => {
        try {
          // 如果不是通过托盘菜单退出，则隐藏窗口
          if (!global.isQuitting) {
            event.preventDefault();
            win.hide();
          }
        } catch (closeEventError) {
          console.error("窗口关闭事件处理错误:", closeEventError);
        }
      });
    } catch (eventError) {
      console.error("设置窗口关闭事件错误:", eventError);
    }

    // 加载应用内容
    try {
      if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
        if (!process.env.IS_TEST) win.webContents.openDevTools();
      } else {
        try {
          createProtocol("app");
        } catch (protocolError) {
          console.error("创建协议失败:", protocolError);
          // 协议创建失败时继续尝试加载页面
        }
        // Load the index.html when not in development
        await win.loadURL("app://./index.html");
      }
    } catch (loadError) {
      console.error("加载应用内容失败:", loadError);
      // 尝试加载本地文件作为后备
      try {
        const indexPath = path.join(__dirname, "index.html");
        const fs = require("fs");
        if (fs.existsSync(indexPath)) {
          await win.loadFile(indexPath);
        }
      } catch (fallbackLoadError) {
        console.error("加载后备文件也失败:", fallbackLoadError);
      }
    }

    return win;
  } catch (windowError) {
    console.error("创建窗口失败:", windowError);
    // 如果窗口创建失败，至少确保应用可以继续在后台运行
    return null;
  }
}

// 窗口关闭时隐藏到托盘而不是退出应用
app.on("browser-window-close", (event, win) => {
  // 阻止默认关闭行为
  event.preventDefault();
  // 隐藏窗口而不是关闭
  win.hide();
});

// 添加全局错误处理，确保应用不会因未捕获的异常而崩溃
process.on("uncaughtException", (error) => {
  console.error("未捕获的异常:", error);
  // 在生产环境中，可以将错误记录到日志文件
});

// 添加全局Promise拒绝处理
process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的Promise拒绝:", reason);
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
    try {
      // 设置托盘图标 - 使用健壮的路径查找逻辑
      let iconPath;

      try {
        if (app.isPackaged) {
          // 打包环境 - 尝试多种可能的路径
          const potentialPaths = [
            path.join(process.resourcesPath, "src", "assets", "logoTitle.png"),
            path.join(process.execPath, "..", "src", "assets", "logoTitle.png"),
            path.join(process.cwd(), "src", "assets", "logoTitle.png"),
          ];

          const fs = require("fs");
          for (const potentialPath of potentialPaths) {
            if (fs.existsSync(potentialPath)) {
              iconPath = potentialPath;
              console.log("找到托盘图标:", iconPath);
              break;
            }
          }
        } else {
          // 开发环境
          iconPath = path.join(__dirname, "../src/assets/logoTitle.png");
        }
      } catch (iconError) {
        console.error("查找图标路径时出错:", iconError);
      }

      // 尝试创建托盘，即使没有图标也应该继续
      let tray;
      try {
        if (iconPath) {
          tray = new Tray(iconPath);
        } else {
          console.warn("未找到托盘图标，使用系统默认托盘图标");
          // 在Windows上可以使用空字符串，在macOS上可能需要默认图标
          if (process.platform === "win32") {
            tray = new Tray("");
          } else {
            // 对于其他平台，尝试使用占位图标或创建基本托盘
            try {
              tray = new Tray(path.join(__dirname, "../src/assets/logo.png"));
            } catch (fallbackError) {
              console.error("无法创建回退托盘图标:", fallbackError);
              // 作为最后手段，尝试使用基本托盘
              tray = new Tray(path.join(__dirname, "icon.png"));
            }
          }
        }
      } catch (trayError) {
        console.error("创建托盘失败:", trayError);
        // 如果无法创建托盘，至少不应该阻止应用启动
        return null;
      }

      // 如果tray为null，直接返回
      if (!tray) {
        return null;
      }

      // 设置托盘图标提示文本
      try {
        tray.setToolTip("柯赛解密申请");
      } catch (tooltipError) {
        console.error("设置托盘提示文本失败:", tooltipError);
      }

      // 创建托盘菜单
      try {
        const contextMenu = Menu.buildFromTemplate([
          {
            label: "显示窗口",
            click: () => {
              try {
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
              } catch (menuClickError) {
                console.error("托盘菜单项点击错误:", menuClickError);
              }
            },
          },
          {
            label: "退出",
            click: () => {
              try {
                app.quit();
              } catch (quitError) {
                console.error("退出应用错误:", quitError);
                process.exit(0); // 强制退出作为最后手段
              }
            },
          },
        ]);

        // 设置托盘菜单
        tray.setContextMenu(contextMenu);
      } catch (menuError) {
        console.error("创建托盘菜单失败:", menuError);
      }

      // 点击托盘图标显示/隐藏窗口
      try {
        tray.on("click", () => {
          try {
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
          } catch (clickError) {
            console.error("托盘点击错误:", clickError);
          }
        });
      } catch (eventError) {
        console.error("设置托盘点击事件失败:", eventError);
      }

      return tray;
    } catch (error) {
      console.error("创建托盘时发生错误:", error);
      // 即使创建托盘失败，也不应该阻止应用启动
      return null;
    }
  }

  // 设置开机自启
  if (!isDevelopment) {
    // 针对Windows的开机自启设置
    if (process.platform === "win32") {
      app.setLoginItemSettings({
        openAtLogin: true,
        args: ["--hidden"], // 添加隐藏参数
      });
    }
    // 针对macOS的开机自启设置
    else if (process.platform === "darwin") {
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

// 持久化通知函数 - 使用自定义HTML页面替代系统通知
function showPersistentNotification(body, filePath, auditStatus = "审核通过") {
  console.log("显示自定义持久化通知", { body, filePath });

  try {
    // 创建一个无边框窗口作为自定义通知
    const notificationWindow = new BrowserWindow({
      width: 360,
      height: 190,
      frame: false, // 无边框
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      },
    });

    // 加载自定义通知HTML页面，考虑不同环境下的路径问题
    let notificationUrl = "";
    try {
      // 尝试多种可能的路径，以确保在开发和生产环境都能正常工作
      const appPath = app.getAppPath();

      // 首先尝试直接在appPath下查找（打包后的根目录）
      const possiblePaths = [
        path.join(appPath, "notification.html"),
        path.join(appPath, "src/assets/notification.html"),
        path.join(appPath, "assets/notification.html"),
        path.join(__dirname, "../src/assets/notification.html"),
      ];

      // 尝试所有可能的路径直到找到文件
      for (const possiblePath of possiblePaths) {
        try {
          if (fs.existsSync(possiblePath)) {
            notificationUrl = possiblePath;
            console.log("找到通知HTML文件:", notificationUrl);
            break;
          }
        } catch (err) {
          console.log("检查路径失败:", possiblePath, err.message);
        }
      }

      // 如果找到了有效路径，加载文件
      if (notificationUrl) {
        notificationWindow.loadFile(notificationUrl);
      } else {
        // 如果所有路径都找不到，使用数据URL方式直接嵌入HTML内容
        console.log("找不到通知HTML文件，使用数据URL方式");

        // 直接嵌入HTML内容，避免路径问题
        const notificationHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>柯赛解密申请消息通知</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 16px 20px;
            width: 360px;
            height: 190px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            background-color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .notification-container {
            display: flex;
            align-items: center;
            width: 100%;
            height: 100%;
        }
        .notification-icon {
            width: 56px;
            height: 56px;
            border-radius: 8px;
            margin-right: 16px;
            background-color: #4a90e2;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 28px;
        }
        .notification-content {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .notification-title {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
        }
        .notification-body {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
            margin-bottom: 10px;
        }
        .status-info {
            margin-bottom: 8px;
        }
        .notification-button {
            background-color: #4a90e2;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .notification-button:hover { background-color: #357abd; }
           #status-sh{
            font-weight: bold;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="notification-container">
        <div class="notification-icon">🔒</div>
        <div class="notification-content">
            <div class="notification-title">柯赛解密申请消息通知</div>
            <div class="notification-body">${
              body || "这是一条来自柯赛解密申请系统的桌面通知！"
            }</div>
            <div class="status-info"><span>文件解密申请</span> <span id="status-sh">审核已通过</span></div>
              <button class="notification-button" id="notification-button">查看</button>
        </div>
    </div>
    <script>
        (function() {
            const { ipcRenderer } = require('electron');
              const filePath = '${filePath || ""}';
              // 存储文件路径和默认审核状态
              window.filePath = filePath;
              window.auditStatus = '${auditStatus || "审核通过"}';
              
              // 设置通知内容的全局函数
              window.setNotificationContent = function(title, body, filePath, auditStatus) {
                  // 设置标题和内容
                  if (document.querySelector('.notification-title')) {
                      document.querySelector('.notification-title').textContent = title || '柯赛解密申请消息通知';
                  }
                  if (document.querySelector('.notification-body')) {
                      document.querySelector('.notification-body').textContent = body || '这是一条来自柯赛解密申请系统的桌面通知！';
                  }
                  
                  // 设置审核状态
                  const statusElement = document.getElementById('status-sh');
                  if (statusElement) {
                      statusElement.textContent = auditStatus === '审核拒绝' ? '审核已拒绝' : '审核已通过';
                      // 根据审核状态更改状态文字颜色
                      statusElement.style.color = auditStatus === '审核拒绝' ? '#e74c3c' : '#2ecc71';
                  }
                  
                  // 更新按钮文本
                  const buttonElement = document.getElementById('notification-button');
                  if (buttonElement) {
                      buttonElement.textContent = auditStatus === '审核拒绝' ? '关闭' : '查看';
                  }
                  
                  // 存储文件路径和审核状态
                  window.filePath = filePath;
                  window.auditStatus = auditStatus || '审核通过';
              };
            
            // 点击按钮处理
              document.getElementById('notification-button').addEventListener('click', function() {
                  // 只有当审核通过时才发送查看操作
                  if (window.auditStatus === '审核通过') {
                      ipcRenderer.send('notification-action', { action: 'view', filePath: window.filePath || filePath });
                  }
                  // 无论何种状态都关闭窗口
                  window.close();
              });
              
              // 点击通知本身（但不是按钮）的处理
              document.querySelector('.notification-container').addEventListener('click', function(e) {
                  // 如果点击的不是按钮，则处理通知点击
                  if (!e.target.closest('.notification-button')) {
                      // 只有当审核通过时才发送查看操作
                      if (window.auditStatus === '审核通过') {
                          ipcRenderer.send('notification-action', { action: 'view', filePath: window.filePath || filePath });
                      }
                      // 无论何种状态都关闭窗口
                      window.close();
                  }
              });
            
            setTimeout(() => {
                ipcRenderer.send('notification-loaded');
            }, 100);
        })();
    </script>
</body>
</html>
        `;

        notificationWindow.loadURL(
          "data:text/html;charset=utf-8," + encodeURIComponent(notificationHtml)
        );
      }
    } catch (error) {
      console.error("加载通知失败:", error);
      // 回退到系统通知
      if (Notification.permission === "granted") {
        new Notification("柯赛解密申请消息通知", {
          body: body || "这是一条来自柯赛解密申请系统的桌面通知！",
        });
      }
    }

    // 监听通知页面加载完成事件
    ipcMain.once("notification-loaded", () => {
      console.log("通知页面加载完成");
    });

    // 确保窗口显示在屏幕右下角
    function positionNotification() {
      const { screen } = require("electron");
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;

      // 设置窗口位置到右下角，离底部有30px的距离
      notificationWindow.setPosition(
        width - 370, // 窗口宽度 + 10px边距
        height - 220 // 窗口高度 + 30px边距
      );
    }

    // 窗口加载完成后设置内容
    notificationWindow.webContents.on("did-finish-load", () => {
      // 使用更安全的方式传递参数，避免模板字符串转义问题
      const safeTitle = "柯赛解密申请消息通知";
      const safeBody = body || "这是一条来自柯赛解密申请系统的桌面通知！";
      const safeFilePath = filePath || "";
      const safeAuditStatus = auditStatus || "审核通过";

      // 使用JSON.stringify确保特殊字符被正确转义
      notificationWindow.webContents.executeJavaScript(
        `window.setNotificationContent(
            ${JSON.stringify(safeTitle)},
            ${JSON.stringify(safeBody)},
            ${JSON.stringify(safeFilePath)},
            ${JSON.stringify(safeAuditStatus)}
          );`
      );

      // 显示窗口（如果隐藏的话）
      if (!notificationWindow.isVisible()) {
        notificationWindow.show();
      }
    });

    // 打开文件路径的通用函数，支持文件不存在时打开父文件夹
    function openFilePathWithFallback(pathToOpen) {
      if (!pathToOpen) {
        console.log("没有提供文件路径");
        return false;
      }

      try {
        console.log("尝试打开文件路径:", pathToOpen);

        // 检查文件是否存在
        const fs = require("fs");
        const path = require("path");

        if (fs.existsSync(pathToOpen)) {
          // 文件存在，使用shell打开文件夹并选中文件
          shell.showItemInFolder(pathToOpen);
          return true;
        } else {
          // 文件不存在，尝试提取父文件夹路径
          console.log("文件不存在，尝试打开父文件夹");
          const parentDir = path.dirname(pathToOpen);

          if (fs.existsSync(parentDir)) {
            // 父文件夹存在，打开父文件夹
            shell.openPath(parentDir);
            console.log("已打开父文件夹:", parentDir);
            return true;
          } else {
            // 父文件夹也不存在，输出错误日志
            console.error("父文件夹也不存在:", parentDir);
            return false;
          }
        }
      } catch (error) {
        console.error("打开文件路径失败:", error);

        // 发生错误时，尝试提取并打开父文件夹
        try {
          const path = require("path");
          const parentDir = path.dirname(pathToOpen);
          shell.openPath(parentDir);
          console.log("发生错误，尝试打开父文件夹:", parentDir);
          return true;
        } catch (nestedError) {
          console.error("尝试打开父文件夹也失败:", nestedError);
          return false;
        }
      }
    }

    // 处理通知操作的IPC消息
    const handleNotificationAction = (event, data) => {
      if (data.action === "view" && data.filePath) {
        // 打开文件路径
        openFilePathWithFallback(data.filePath);

        // 确保应用在前台可见
        const windows = BrowserWindow.getAllWindows();
        if (windows && windows.length > 0) {
          // 过滤掉通知窗口，只处理主应用窗口
          const mainWindows = windows.filter((win) => {
            // 可以通过窗口URL或其他属性来识别主窗口
            return !win.getURL().includes("notification.html");
          });

          if (mainWindows.length > 0) {
            const mainWindow = mainWindows[0];
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
          } else {
            // 如果没有主窗口打开，则创建一个新窗口
            createWindow();
          }
        } else {
          // 如果没有窗口打开，则创建一个新窗口
          createWindow();
        }
      }
    };

    // 监听通知操作
    ipcMain.on("notification-action", handleNotificationAction);

    // 通知窗口关闭时清理监听器
    notificationWindow.on("closed", () => {
      ipcMain.removeListener("notification-action", handleNotificationAction);
    });

    // 设置窗口位置
    positionNotification();

    // 添加屏幕变化监听器，在屏幕尺寸变化时重新定位
    const { screen } = require("electron");
    const screenListener = screen.on("display-metrics-changed", () => {
      positionNotification();
    });

    // 窗口关闭时清理屏幕监听器
    notificationWindow.on("closed", () => {
      screen.removeListener("display-metrics-changed", screenListener);
    });

    // 返回通知窗口引用，以便外部可以控制它
    return notificationWindow;
  } catch (error) {
    console.error("创建自定义通知时出错:", error);

    // 回退到系统通知
    try {
      const fallbackNotification = new Notification({
        title: "柯赛解密申请消息通知",
        body: body || "这是一条来自柯赛解密申请系统的桌面通知！",
        requireInteraction: true,
      });

      fallbackNotification.on("click", () => {
        if (filePath) {
          // 打开文件路径的函数
          const fs = require("fs");
          const path = require("path");
          const shell = require("electron").shell;

          try {
            if (fs.existsSync(filePath)) {
              shell.showItemInFolder(filePath);
            } else {
              const parentDir = path.dirname(filePath);
              if (fs.existsSync(parentDir)) {
                shell.openPath(parentDir);
              }
            }
          } catch (e) {
            console.error("打开文件路径失败:", e);
          }
        }
      });

      fallbackNotification.show();
    } catch (fallbackError) {
      console.error("回退到系统通知也失败:", fallbackError);
    }
  }
}

// 处理渲染进程发送的通知请求
ipcMain.on("show-persistent-notification", (event, data) => {
  console.log("收到渲染进程的通知请求", data);
  // 提取参数
  const body = data && data.body ? data.body : undefined;
  const filePath = data && data.filePath ? data.filePath : undefined;
  const auditStatus = data && data.auditStatus ? data.auditStatus : "审核通过";
  showPersistentNotification(body, filePath, auditStatus);
  // 回复渲染进程通知已发送
  event.reply("notification-shown", { success: true });
});

// 监听应用退出事件
app.on("before-quit", () => {
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
