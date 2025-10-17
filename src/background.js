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
  try {
    // 创建浏览器窗口 - 使用健壮的图标路径处理
    let iconPath;
    try {
      if (app.isPackaged) {
        // 打包环境 - 尝试多种可能的路径
        const potentialPaths = [
          path.join(process.resourcesPath, 'src', 'assets', 'logoTitle.png'),
          path.join(process.execPath, '..', 'src', 'assets', 'logoTitle.png'),
          path.join(process.cwd(), 'src', 'assets', 'logoTitle.png')
        ];
        
        const fs = require('fs');
        for (const potentialPath of potentialPaths) {
          if (fs.existsSync(potentialPath)) {
            iconPath = potentialPath;
            console.log('找到窗口图标:', iconPath);
            break;
          }
        }
      } else {
        // 开发环境
        iconPath = path.join(__dirname, '../src/assets/logoTitle.png');
      }
    } catch (iconError) {
      console.error('查找窗口图标路径时出错:', iconError);
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
      win.on('close', (event) => {
        try {
          // 如果不是通过托盘菜单退出，则隐藏窗口
          if (!global.isQuitting) {
            event.preventDefault();
            win.hide();
          }
        } catch (closeEventError) {
          console.error('窗口关闭事件处理错误:', closeEventError);
        }
      });
    } catch (eventError) {
      console.error('设置窗口关闭事件错误:', eventError);
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
          console.error('创建协议失败:', protocolError);
          // 协议创建失败时继续尝试加载页面
        }
        // Load the index.html when not in development
        await win.loadURL("app://./index.html");
      }
    } catch (loadError) {
      console.error('加载应用内容失败:', loadError);
      // 尝试加载本地文件作为后备
      try {
        const indexPath = path.join(__dirname, 'index.html');
        const fs = require('fs');
        if (fs.existsSync(indexPath)) {
          await win.loadFile(indexPath);
        }
      } catch (fallbackLoadError) {
        console.error('加载后备文件也失败:', fallbackLoadError);
      }
    }
    
    return win;
  } catch (windowError) {
    console.error('创建窗口失败:', windowError);
    // 如果窗口创建失败，至少确保应用可以继续在后台运行
    return null;
  }

}

// 窗口关闭时隐藏到托盘而不是退出应用
app.on('browser-window-close', (event, win) => {
  // 阻止默认关闭行为
  event.preventDefault();
  // 隐藏窗口而不是关闭
  win.hide();
});

// 添加全局错误处理，确保应用不会因未捕获的异常而崩溃
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  // 在生产环境中，可以将错误记录到日志文件
});

// 添加全局Promise拒绝处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
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
            path.join(process.resourcesPath, 'src', 'assets', 'logoTitle.png'),
            path.join(process.execPath, '..', 'src', 'assets', 'logoTitle.png'),
            path.join(process.cwd(), 'src', 'assets', 'logoTitle.png')
          ];
          
          const fs = require('fs');
          for (const potentialPath of potentialPaths) {
            if (fs.existsSync(potentialPath)) {
              iconPath = potentialPath;
              console.log('找到托盘图标:', iconPath);
              break;
            }
          }
        } else {
          // 开发环境
          iconPath = path.join(__dirname, '../src/assets/logoTitle.png');
        }
      } catch (iconError) {
        console.error('查找图标路径时出错:', iconError);
      }
      
      // 尝试创建托盘，即使没有图标也应该继续
      let tray;
      try {
        if (iconPath) {
          tray = new Tray(iconPath);
        } else {
          console.warn('未找到托盘图标，使用系统默认托盘图标');
          // 在Windows上可以使用空字符串，在macOS上可能需要默认图标
          if (process.platform === 'win32') {
            tray = new Tray('');
          } else {
            // 对于其他平台，尝试使用占位图标或创建基本托盘
            try {
              tray = new Tray(path.join(__dirname, '../src/assets/logo.png'));
            } catch (fallbackError) {
              console.error('无法创建回退托盘图标:', fallbackError);
              // 作为最后手段，尝试使用基本托盘
              tray = new Tray(path.join(__dirname, 'icon.png'));
            }
          }
        }
      } catch (trayError) {
        console.error('创建托盘失败:', trayError);
        // 如果无法创建托盘，至少不应该阻止应用启动
        return null;
      }
      
      // 如果tray为null，直接返回
      if (!tray) {
        return null;
      }
      
      // 设置托盘图标提示文本
      try {
        tray.setToolTip('柯赛解密申请');
      } catch (tooltipError) {
        console.error('设置托盘提示文本失败:', tooltipError);
      }
      
      // 创建托盘菜单
      try {
        const contextMenu = Menu.buildFromTemplate([
          {
            label: '显示窗口',
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
                console.error('托盘菜单项点击错误:', menuClickError);
              }
            }
          },
          {
            label: '退出',
            click: () => {
              try {
                app.quit();
              } catch (quitError) {
                console.error('退出应用错误:', quitError);
                process.exit(0); // 强制退出作为最后手段
              }
            }
          }
        ]);
        
        // 设置托盘菜单
        tray.setContextMenu(contextMenu);
      } catch (menuError) {
        console.error('创建托盘菜单失败:', menuError);
      }
      
      // 点击托盘图标显示/隐藏窗口
      try {
        tray.on('click', () => {
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
            console.error('托盘点击错误:', clickError);
          }
        });
      } catch (eventError) {
        console.error('设置托盘点击事件失败:', eventError);
      }
      
      return tray;
    } catch (error) {
      console.error('创建托盘时发生错误:', error);
      // 即使创建托盘失败，也不应该阻止应用启动
      return null;
    }
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
    requireInteraction: true, // 关键设置：要求用户交互才能关闭
    urgency: 'critical' // 设置为最高优先级
  };
  
  // 处理图标路径 - 确保在开发和打包环境都能正常工作
  try {
    // 由于在vue.config.js中设置了asar: false，我们需要调整路径处理
    let iconPath;
    
    if (app.isPackaged) {
      // 打包后的应用 - 尝试多种可能的路径
      const potentialPaths = [
        // 直接在resources目录下
        path.join(process.resourcesPath, 'src', 'assets', 'logoTitle.png'),
        // 在应用根目录附近
        path.join(process.execPath, '..', 'src', 'assets', 'logoTitle.png'),
        // 备选路径
        path.join(process.cwd(), 'src', 'assets', 'logoTitle.png')
      ];
      
      // 查找存在的图标文件
      const fs = require('fs');
      for (const potentialPath of potentialPaths) {
        if (fs.existsSync(potentialPath)) {
          iconPath = potentialPath;
          break;
        }
      }
    } else {
      // 开发环境
      iconPath = path.join(__dirname, '../src/assets/logoTitle.png');
    }
    
    // 如果找到了有效的图标路径，则设置
    const fs = require('fs');
    if (iconPath && fs.existsSync(iconPath)) {
      notificationOptions.icon = iconPath;
    } else {
      console.log('未找到图标文件，使用系统默认图标');
      // 不设置图标，使用系统默认图标
    }
  } catch (error) {
    console.error('设置通知图标时出错:', error);
    // 出错时不设置图标，使用系统默认图标
  }
  
  // 根据平台添加按钮支持
  if (process.platform === 'win32' || process.platform === 'darwin') {
    notificationOptions.actions = [
      { type: 'button', text: '查看' }
    ];
  }
  
  // 为Windows添加额外设置
  if (process.platform === 'win32') {
    notificationOptions.timeoutType = 'never'; // 永不超时
  }
  
  // 创建通知
  const notification = new Notification(notificationOptions);
  
  // 打开文件路径的通用函数，支持文件不存在时打开父文件夹
  function openFilePathWithFallback(pathToOpen) {
    if (!pathToOpen) {
      console.log('没有提供文件路径');
      return false;
    }
    
    try {
      console.log('尝试打开文件路径:', pathToOpen);
      
      // 检查文件是否存在
      const fs = require('fs');
      const path = require('path');
      
      if (fs.existsSync(pathToOpen)) {
        // 文件存在，使用shell打开文件夹并选中文件
        shell.showItemInFolder(pathToOpen);
        return true;
      } else {
        // 文件不存在，尝试提取父文件夹路径
        console.log('文件不存在，尝试打开父文件夹');
        const parentDir = path.dirname(pathToOpen);
        
        if (fs.existsSync(parentDir)) {
          // 父文件夹存在，打开父文件夹
          shell.openPath(parentDir);
          console.log('已打开父文件夹:', parentDir);
          return true;
        } else {
          // 父文件夹也不存在，输出错误日志
          console.error('父文件夹也不存在:', parentDir);
          return false;
        }
      }
    } catch (error) {
      console.error('打开文件路径失败:', error);
      
      // 发生错误时，尝试提取并打开父文件夹
      try {
        const path = require('path');
        const parentDir = path.dirname(pathToOpen);
        shell.openPath(parentDir);
        console.log('发生错误，尝试打开父文件夹:', parentDir);
        return true;
      } catch (nestedError) {
        console.error('尝试打开父文件夹也失败:', nestedError);
        return false;
      }
    }
  }
  
  // 通知点击事件
  notification.on('click', () => {
    console.log('用户点击了通知');
    
    // 使用通用函数处理文件路径
    if (filePath) {
      openFilePathWithFallback(filePath);
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
    
    // 点击"查看"按钮时使用通用函数处理
    if (index === 0 && filePath) {
      openFilePathWithFallback(filePath);
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
