// preload.js
// 此文件用于在渲染进程中安全地暴露Electron的API

const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    // 通知相关的API
    sendNotificationAction: (action, filePath) => {
      ipcRenderer.send('notification-action', { action, filePath });
    },
    notificationLoaded: () => {
      ipcRenderer.send('notification-loaded');
    },
    // 添加获取版本号的方法
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    // 其他可能需要的API可以在这里添加
    onNotificationShown: (callback) => ipcRenderer.on('notification-shown', callback)
  }
);

// 允许渲染进程访问必要的模块
window.electron = {
  ipcRenderer: {
    send: (channel, data) => {
      // 限制只允许发送特定的消息通道
      const validChannels = ['notification-action', 'notification-loaded'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    on: (channel, func) => {
      // 限制只允许监听特定的消息通道
      const validChannels = ['notification-shown'];
      if (validChannels.includes(channel)) {
        // 避免内存泄漏，使用一个引用保留回调
        const subscription = (...args) => func(...args);
        ipcRenderer.on(channel, subscription);

        // 返回一个清理函数
        return () => ipcRenderer.removeListener(channel, subscription);
      }
    },
    invoke: async (channel, ...args) => {
      // 限制只允许调用特定的消息通道
      const validChannels = ['get-app-version'];
      if (validChannels.includes(channel)) {
        try {
          console.log(`Preload: 处理invoke请求: ${channel}`);
          const result = await ipcRenderer.invoke(channel, ...args);
          console.log(`Preload: invoke结果: ${JSON.stringify(result)}`);
          return result;
        } catch (error) {
          console.error(`Preload: invoke错误: ${error}`);
          throw error;
        }
      } else {
        throw new Error(`不允许访问的频道: ${channel}`);
      }
    }
  }
};