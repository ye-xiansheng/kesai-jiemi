<template>
  <div class="container">
    <!-- WebSocket连接状态显示 -->
    <div class="ws-status" :class="{ 'connected': wsConnected, 'disconnected': !wsConnected }">
      <span v-if="wsConnected" class="status-dot connected"></span>
      <span v-else class="status-dot disconnected"></span>
      <span class="status-text">
        {{ wsConnected ? 'WebSocket已连接' : 'WebSocket未连接' }}
        <span v-if="reconnectAttempts > 0">(重连中: {{ reconnectAttempts }}/{{ maxReconnectAttempts }})</span>
      </span>
    </div>
    
    <div v-if="userInfo">
      <div class="d-fb">
        <div>
          <span class="ud">{{ userInfo.dep }}</span>
          <span class="un">{{ userInfo.name }}</span>
        </div>
        <span style="font-size: 13px;margin: 0;cursor: pointer;" class="ud" @click="clearuserInfo">退出登陆</span>
        <!-- <el-button class="lgot" type="text" @click="clearuserInfo">退出登陆</el-button> -->
      </div>
      <el-radio-group v-model="radio1" @change="radioChange">
        <el-radio-button label="解密申请"></el-radio-button>
        <el-radio-button label="解密申请待审批列表"></el-radio-button>
      </el-radio-group>
      <div class="mt20" v-if="radio1 == '解密申请'">
        <el-upload class="uploader" :show-file-list="false" action="#" drag multiple :http-request="upload2">
          <div class="el-upload__text">
            将文件拖到此处，<em>或点击上传</em>
          </div>
        </el-upload>
        <div class="wj">
          <div v-for="(item, index) in wjlist" class="dcen" :key="index">
            <div class="dcen"><span style="color: #999;min-width: 70px;">文件名：</span> <span style="font-weight: bold;">{{
              item.name }}</span>
            </div>
            <div class="dcen" style="margin: 0 10px;"><span style="color: #999;min-width: 100px;">文件夹路径：</span> <span
                style="font-weight: bold;">{{ item.path }}</span></div>
            <el-button style="margin-right: 10px;" type="text" @click="wjdelate2(index)">删除</el-button>
          </div>
        </div>
        <div class="mt20"><span style="color: red;">*</span> 解密原因</div>
        <div class="mt20">
          <el-input :autosize="{ minRows: 4, maxRows: 8 }" :maxlength="200" v-model="jmyy" type="textarea"
            placeholder="请输入解密原因"></el-input>
        </div>
        <div class="tjbtn"><el-button style="width: 95%;" @click="submitjm" v-debounce:2000="'提交解密申请'"
            type="primary">提交解密申请</el-button></div>

        <!-- <el-button class="mt20" @click="tihuan" type="primary">测试审批通过替换文件</el-button> -->
        <el-button class="mt20" @click="xiaoxits" type="primary">电脑右下角弹窗消息</el-button>
        <!-- 文件下载工具 -->
        <!-- <div class="file-download-section">
          <h2>文件下载工具</h2>

          <div class="input-group">
            <input type="text" v-model="downloadUrl" placeholder="请输入要下载的在线链接..." class="file-path-input">
          </div>

          <div class="input-group">
            <input type="text" v-model="saveFileName" placeholder="请输入保存的文件名..." class="file-path-input">
          </div>

          <div class="download-path">
            <label>下载目录：</label>
            <span>{{ downloadDirectory }}</span>
          </div>

          <button @click="downloadFile" class="download-btn">
            {{ isDownloading ? '下载中...' : '开始下载' }}
          </button>
          <div v-if="isDownloading" class="progress-container">
            <div class="progress-bar">
              <div class="progress" :style="{ width: downloadProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ downloadProgress }}%</span>
          </div>

          <div v-if="downloadMessage" :class="['message', downloadMessageType]">
            {{ downloadMessage }}
          </div>
        </div> -->
      </div>
      <div class="mt20" v-else>
        <el-table :data="tableData" :header-cell-style="{ background: '#F5F7FA' }" border>
          <el-table-column prop="name" label="文件名称"> </el-table-column>
          <el-table-column prop="path" label="路径"> </el-table-column>
          <el-table-column prop="jmyy" label="解密原因"> </el-table-column>
          <el-table-column prop="sj" label="申请时间"></el-table-column>
        </el-table>
      </div>
    </div>
    <div v-else class="dzong">
      <!-- <div class="lbg"></div> -->
      <img src="./assets/bg.png" style="width: 250px;height: 250px;" alt="">
      <div style="flex: 1;">
        <div class="dtitle">柯赛标识</div>
        <div class="djs">解密申请</div>
        <div class="dleft">登陆名</div>
        <div> <el-input v-model="username" placeholder="请输入用户登陆名"></el-input> </div>
        <div class="dleft">密码</div>
        <div> <el-input v-model="userpwd" @keyup.enter="login" type="password" placeholder="请输入密码"></el-input> </div>
        <div><el-button class="dbtn" type="primary" @click="login" v-debounce:2000="'登录'">登录</el-button></div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'App',
  data() {
    return {
      tableData: [],
      radio1: '解密申请',
      filePath: '',
      message: '',
      messageType: 'info', // 'success', 'error', 'info'
      wjlist: [],
      // 下载相关变量
      downloadUrl: '',
      saveFileName: '',
      downloadDirectory: 'E:\\exelectron-vue\\aaa',
      isDownloading: false,
      downloadProgress: 0,
      downloadMessage: '',
      downloadMessageType: 'info',
      userInfo: undefined,
      username: '',
      userpwd: '',
      jmlist: null,
      jmyy: '',
      xzobj: null,
      baseUrl: "https://cosunerp.signcc.com/cosunErp/",
      // WebSocket相关状态
      ws: null,
      wsUrl: 'ws://172.16.112.21:9095/cosunErp/websocke',
      wsConnected: false,
      reconnectInterval: 5000, // 重连间隔(ms)
      reconnectAttempts: 0,
      maxReconnectAttempts: 10, // 最大重连次数
      heartbeatInterval: 30000, // 心跳间隔(ms)
      heartbeatTimer: null,
      reconnectTimer: null,
      cstime: null,
      csnum: 1,
    }
  },
  mounted() {
    // 初始化用户信息
    this.userInfo = JSON.parse(localStorage.getItem('userInfo'));
    this.xzobj = {
      key: 1760431459271,
      url: 'https://cosunerp.signcc.com/production/20251014/853dd2b09c2c41ec9c09fd9971680b09.pdf'
    }
    console.log(this.xzobj, '初始化')
  //  this.cstime = setInterval(()=>{
  //     this.csnum++
  //     this.xiaoxits()
  //     if(this.csnum>2){
  //       clearInterval(this.cstime)
  //     }
  //   },10000)
    // 初始化WebSocket连接
    // this.initWebSocket();
  },
  
  // 组件卸载前清理WebSocket连接
  beforeUnmount() {
    // this.closeWebSocket();
  },
  methods: {
    // 初始化WebSocket连接
    initWebSocket() {
      // 检查环境是否支持WebSocket
      if (!('WebSocket' in window)) {
        console.error('您的浏览器不支持WebSocket协议');
        return;
      }

      try {
        this.ws = new WebSocket(this.wsUrl);
        
        // 连接成功
        this.ws.onopen = this.onWebSocketOpen;
        
        // 接收消息
        this.ws.onmessage = this.onWebSocketMessage;
        
        // 连接关闭
        this.ws.onclose = this.onWebSocketClose;
        
        // 连接错误
        this.ws.onerror = this.onWebSocketError;
        
        console.log('正在尝试连接WebSocket服务器...');
      } catch (error) {
        console.error('WebSocket初始化失败:', error);
        this.reconnect();
      }
    },
    
    // WebSocket连接成功
    onWebSocketOpen() {
      console.log('WebSocket连接成功');
      this.wsConnected = true;
      this.reconnectAttempts = 0;
      
      // 启动心跳
      this.startHeartbeat();
      
      // 可以在这里发送认证信息或其他初始化数据
      // this.sendWebSocketMessage({ type: 'auth', data: '认证信息' });
    },
    
    // 接收WebSocket消息
    onWebSocketMessage(event) {
      try {
        const data = JSON.parse(event.data);
        console.log('接收到WebSocket消息:', data);
        
        // 根据消息类型处理
        switch (data.type) {
          case 'pong':
            // 收到心跳响应
            console.log('收到心跳响应');
            break;
          case 'notification':
            // 处理通知消息
            this.handleNotification(data);
            break;
          default:
            // 处理其他类型的消息
            this.handleOtherMessages(data);
        }
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
        // 处理非JSON格式的消息
        console.log('收到非JSON格式消息:', event.data);
      }
    },
    
    // WebSocket连接关闭
    onWebSocketClose(event) {
      console.log('WebSocket连接关闭', event.code, event.reason);
      this.wsConnected = false;
      
      // 停止心跳
      this.stopHeartbeat();
      
      // 如果不是手动关闭，尝试重连
      if (event.code !== 1000) {
        this.reconnect();
      }
    },
    
    // WebSocket连接错误
    onWebSocketError(error) {
      console.error('WebSocket连接错误:', error);
    },
    
    // 发送WebSocket消息
    sendWebSocketMessage(message) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          const msg = typeof message === 'string' ? message : JSON.stringify(message);
          this.ws.send(msg);
          console.log('发送WebSocket消息:', message);
        } catch (error) {
          console.error('发送WebSocket消息失败:', error);
        }
      } else {
        console.warn('WebSocket未连接，无法发送消息');
      }
    },
    
    // 启动心跳
    startHeartbeat() {
      this.stopHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.sendWebSocketMessage({ type: 'ping' });
        }
      }, this.heartbeatInterval);
    },
    
    // 停止心跳
    stopHeartbeat() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    },
    
    // 重连机制
    reconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(`已达到最大重连次数(${this.maxReconnectAttempts})，停止重连`);
        return;
      }
      
      // 清除之前的重连定时器
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.min(2 * this.reconnectAttempts, 30); // 指数退避，但不超过30倍
      
      console.log(`将在${delay}ms后进行第${this.reconnectAttempts}次重连...`);
      
      this.reconnectTimer = setTimeout(() => {
        this.initWebSocket();
      }, delay);
    },
    
    // 关闭WebSocket连接
    closeWebSocket() {
      this.stopHeartbeat();
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      if (this.ws) {
        this.ws.close(1000, '手动关闭');
        this.ws = null;
      }
      
      this.wsConnected = false;
      console.log('WebSocket连接已手动关闭');
    },
    
    // 处理通知消息
    handleNotification(data) {
      console.log('处理通知消息:', data);
      // 这里可以根据需要显示通知给用户
      // this.$message.info(data.content);
    },
    
    // 处理其他消息
    handleOtherMessages(data) {
      console.log('处理其他消息:', data);
      // 这里可以根据具体业务需求处理其他类型的消息
    },
    
    // 格式化日期时间
    formatDate(timestamp) {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份是从0开始的
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
    radioChange(val) {
      if (val === '解密申请待审批列表') {
        var cs = JSON.parse(localStorage.getItem('jmlist')) || [];
        this.tableData = JSON.parse(localStorage.getItem('jmlist')) || [];
        console.log(this.tableData, '舒服点', cs)
      }
    },
    submitjm() {
      if (this.wjlist.length === 0) {
        this.$message.error('请先上传文件');
        return;
      }
      if (this.jmyy === '') {
        this.$message.error('请输入解密原因');
        return;
      }
      var time = new Date().getTime();
      var tjlist = this.wjlist.map(item => {
        return {
          name: item.name,
          path: item.path,
          key: time,
          jmyy: this.jmyy,
          sj: this.formatDate(time),
        }
      })
      const loading = this.$loading({
        lock: true,
        text: '处理中',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)',
      })
      setTimeout(() => {
        this.$message.success('提交成功');
        loading.close()
        this.jmyy = '';
        this.wjlist = [];
        var zjmlist = JSON.parse(localStorage.getItem('jmlist')) || []
        tjlist = tjlist.concat(zjmlist)
        localStorage.setItem('jmlist', JSON.stringify(tjlist))
      }, 3000)
      // console.log(this.userInfo, '地方', this.wjlist)
    },
    clearuserInfo() {
      this.userInfo = undefined;
      localStorage.removeItem('userInfo');
    },
    login() {
      if (this.username === '') {
        this.$message.error('请输入用户登陆名');
        return;
      }
      if (this.userpwd === '') {
        this.$message.error('请输入密码');
        return;
      }
      var obj = {
        userName: this.username,
        pwd: this.userpwd,
      }
      const queryString = new URLSearchParams(obj).toString();
      const loading = this.$loading({
        lock: true,
        text: '处理中',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)',
      })
      fetch(`${this.baseUrl}login/loginByUserName`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: queryString,
      })
        .then((response) => response.json())
        .then((data) => {
          loading.close()
          if (data.result === 0) {
            var obj = data.data;
            this.userInfo = {
              username: this.username,
              userpwd: this.userpwd,
              name: obj.realName,
              dep: obj.depName,
            };
            localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
            this.$message.success('登录成功');
          } else {

            this.$message.error(data.msg);
          }
        }).catch(() => {
          loading.close()
          // this.$message.error('登录失败');
        })
    },
    wjdelate2(index) {
      this.wjlist.splice(index, 1);
    },
    // beforeUpload(file) {
    //   // console.log(file,'方法')
    //   // if (file.type=== "") {
    //   //   this.$message.error('不能上传文件夹');
    //   //   return false; // 阻止上传文件夹
    //   // }
    //   // return true; // 允许上传文件
    // },
    upload2(file) {
      var zobj = file.file;
      var tobj = {
        name: zobj.name,
        path: zobj.path,
      }
      this.wjlist.push(tobj)
      console.log(file, 'sdd')
    },
    // 删除文件
    deleteFile() {
      if (!this.filePath) {
        this.showMessage('请先输入或选择文件路径', 'info')
        return
      }

      try {
        // 在Electron环境中使用Node.js的fs模块删除文件
        if (window && window.process && window.process.type) {
          const fs = require('fs')

          // 检查文件是否存在
          if (fs.existsSync(this.filePath)) {
            // 检查是否为文件（非目录）
            if (fs.statSync(this.filePath).isFile()) {
              fs.unlinkSync(this.filePath)
              this.showMessage(`文件已成功删除: ${this.filePath}`, 'success')
              this.filePath = ''
            } else {
              this.showMessage('选择的路径不是一个文件', 'error')
            }
          } else {
            this.showMessage('文件不存在', 'error')
          }
        } else {
          this.showMessage('此功能需要在Electron环境中运行', 'error')
        }
      } catch (error) {
        this.showMessage(`删除文件失败: ${error.message}`, 'error')
      }
    },

    // 显示消息
    showMessage(text, type = 'info') {
      this.message = text
      this.messageType = type

      // 3秒后自动清除消息
      setTimeout(() => {
        this.message = ''
      }, 3000)
    },

    // 下载文件
    tihuan() {
      var sclist = this.tableData.filter(item => item.key === this.xzobj.key)
      var jmlist = this.tableData.filter(item => item.key !== this.xzobj.key)
      if (sclist.length > 0) {
        sclist.forEach(item => {
          this.downloadFile(this.xzobj.url, item.name, item.path.split('\\').slice(0, -1).join('\\'))
        })
      }
      localStorage.setItem('jmlist', JSON.stringify(jmlist))
      console.log(jmlist, 'obj', sclist, this.tableData)
    },
    async downloadFile(downloadUrl, saveFileName, downloadDirectory) {
      // localStorage.removeItem('jmlist')

      this.isDownloading = true
      // if (!this.downloadUrl || !this.saveFileName) {
      //   this.showDownloadMessage('请先输入下载链接和保存文件名', 'info')
      //   return
      // }

      try {
        // 在Electron环境中使用Node.js的模块下载文件
        if (window && window.process && window.process.type) {
          const fs = require('fs')
          const path = require('path')
          const https = require('https')
          const http = require('http')

          // 确保下载目录存在
          if (!fs.existsSync(downloadDirectory)) {
            fs.mkdirSync(downloadDirectory, { recursive: true })
          }

          // 完整的保存路径
          const savePath = path.join(downloadDirectory, saveFileName)

          // 设置下载状态
          this.isDownloading = true
          this.downloadProgress = 0
          this.showDownloadMessage('开始下载...', 'info')

          // 根据URL协议选择http或https模块
          const protocol = downloadUrl.startsWith('https') ? https : http

          await new Promise((resolve, reject) => {
            const request = protocol.get(downloadUrl, (response) => {
              // 检查响应状态码
              if (response.statusCode !== 200) {
                reject(new Error(`请求失败，状态码: ${response.statusCode}`))
                return
              }

              // 获取文件总大小
              const totalSize = parseInt(response.headers['content-length'], 10)
              let downloadedSize = 0

              // 创建写入流
              const fileStream = fs.createWriteStream(savePath)

              // 监听数据事件，更新进度
              response.on('data', (chunk) => {
                downloadedSize += chunk.length
                this.downloadProgress = Math.round((downloadedSize / totalSize) * 100)
              })

              // 管道到文件流
              response.pipe(fileStream)

              // 文件流完成事件
              fileStream.on('finish', () => {
                fileStream.close()
                resolve()
              })

              // 错误处理
              fileStream.on('error', (err) => {
                reject(new Error(`文件写入失败: ${err.message}`))
              })
            })

            // 请求错误处理
            request.on('error', (err) => {
              reject(new Error(`请求失败: ${err.message}`))
            })
          })

          // 下载完成
          this.isDownloading = false
          this.showDownloadMessage(`文件已成功下载到: ${savePath}`, 'success')
          this.downloadUrl = ''
          this.saveFileName = ''
          this.downloadProgress = 0
        } else {
          this.showDownloadMessage('此功能需要在Electron环境中运行', 'error')
        }
      } catch (error) {
        this.isDownloading = false
        this.downloadProgress = 0
        this.showDownloadMessage(`下载失败: ${error.message}`, 'error')
      }
    },

    // 显示下载功能的消息
    showDownloadMessage(text, type = 'info') {
      this.downloadMessage = text
      this.downloadMessageType = type

      // 3秒后自动清除消息
      setTimeout(() => {
        this.downloadMessage = ''
      }, 3000)
    },
    xiaoxits(){
      var list = JSON.parse(localStorage.getItem('jmlist'));
      var sj = list[0].sj;
      var xx = `您与${sj}发起的解密审批已通过！`
      
      // 如果有文件路径，可以传递给通知
      // const filePaths = this.wjlist.map(item => item.path);
      // if (filePaths.length > 0) {
      //   // 使用第一个文件路径作为示例
      //   this.showPersistentNotification(xx, filePaths[0])
      //   console.log('带文件路径的通知已发送:', { message: xx, filePath: filePaths[0] })
      // } else {
        this.showPersistentNotification(xx, list[0].path)
        // console.log(xx, 'ss', list[0].path)
      // }
    },
    // 显示桌面通知（只有用户点击才会消失）
    showPersistentNotification(body = '这是一条来自柯赛解密申请系统的桌面通知！', filePath = null) {
      try {
        // 检查是否在Electron环境中
        if (window && window.process && window.process.type) {
          console.log('通过IPC请求主进程显示持久化通知', { body, filePath });
          
          try {
            // 使用electron的ipcRenderer向主进程发送消息
            const { ipcRenderer } = require('electron');
            
            // 发送通知请求到主进程，带上body和filePath参数
            ipcRenderer.send('show-persistent-notification', { body, filePath });
            
            // 监听主进程的回复
            ipcRenderer.once('notification-shown', (event, arg) => {
              console.log(event, '通知请求已处理:', arg);
            });
            
            // 提示用户通知已请求
            this.$message.success('通知请求已发送');
          } catch (e) {
            console.error('IPC通信失败:', e);
            // 如果IPC失败，尝试备选方案
            this.fallbackNotificationMethod(body);
          }
        } else {
          // 非Electron环境下的备选方案
          this.fallbackNotificationMethod(body);
        }
      } catch (error) {
        console.error('显示通知失败:', error);
        this.$message.error('显示通知失败，请检查权限设置');
      }
    },
    
    // 备选通知方法（非Electron环境或IPC失败时使用）
    fallbackNotificationMethod(body = '这是一条来自柯赛解密申请系统的桌面通知！') {
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            const notification = new Notification('系统通知2', {
              body: body,
              icon: 'https://cosunerp.signcc.com/production/20251016/e515897959174c249a68ed17a4b5597a.png',
              requireInteraction: true // 请求用户交互，不会自动关闭
            });
            
            notification.onclick = () => {
              console.log('用户点击了备选通知');
            };
          } else {
            this.$message.error('需要通知权限才能显示桌面通知');
          }
        });
      } else {
        this.$message.error('您的环境不支持桌面通知');
      }
    }
  }
}
</script>

<style>
.el-upload-dragger {
  height: 120px !important;
  line-height: 36px !important;
}

body {
  margin: 0;
  padding: 0;
}

/* WebSocket连接状态样式 */
.ws-status {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 15px;
  border-radius: 20px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  transition: all 0.3s ease;
}

.ws-status.connected {
  background-color: rgba(64, 169, 77, 0.9);
}

.ws-status.disconnected {
  background-color: rgba(245, 108, 108, 0.9);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-dot.connected {
  background-color: #40A94E;
}

.status-dot.disconnected {
  background-color: #F56C6C;
  animation: none;
}

.status-text {
  font-family: PingFang SC, sans-serif;
  font-weight: 500;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 169, 77, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(64, 169, 77, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 169, 77, 0);
  }
}

.mt20 {
  margin-top: 10px;
}

.d-fb {
  display: flex;
  justify-content: space-between;
  align-content: center;
  margin-bottom: 10px;
}

.ud {
  color: rgba(0, 0, 0, 0.7);
  margin-right: 20px;
}

.un {
  font-weight: bold;
}

.lbg {
  width: 250px;
  height: 250px;
  background: url(./assets/bg.png) no-repeat;
  background-size: 100%;
}

.dzong {
  width: 500px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(153, 153, 153, 0.1);
  padding: 30px;
  border-radius: 20px;
  display: flex;
  align-items: center;
}

.dleft {
  text-align: left;
  margin-top: 20px;
  margin-bottom: 15px;
  font-size: 16px;
  font-family: PingFang SC;
  font-weight: 600;
  color: #1c1c1c;
}

.dbtn {
  margin-top: 40px;
  width: 100%;
}

.dtitle {
  margin: 0 0 7px;
  font-size: 30px;
  font-family: PingFang SC;
  font-weight: 700;
  color: #1c1c1c;
}

.djs {
  font-size: 14px;
  font-family: PingFang SC;
  font-weight: 400;
  color: #a6a6a6;
}

.wj {
  display: flex;
  flex-wrap: wrap;
  margin-top: 10px;
}

.dcen {
  display: flex;
  align-items: center;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.container {
  /* max-width: 800px; */
  margin: 0 auto;
  min-width: 400px;
  padding: 20px;
  padding-bottom: 60px;
}

.tjbtn {
  position: fixed;
  bottom: 20px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;

}

.file-delete-section {
  margin-top: 40px;
  padding: 30px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.file-delete-section h2 {
  margin-bottom: 20px;
  color: #333;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.file-path-input {
  flex: 1;
  min-width: 200px;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.select-btn {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  white-space: nowrap;
}

.select-btn:hover {
  background-color: #3aa575;
}

.delete-btn {
  padding: 12px 30px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.delete-btn:hover:not(:disabled) {
  background-color: #c0392b;
}

.delete-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.message {
  margin-top: 20px;
  padding: 10px 15px;
  border-radius: 4px;
  font-size: 14px;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.message.info {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

/* 下载工具样式 */
.file-download-section {
  margin-top: 40px;
  padding: 30px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.file-download-section h2 {
  margin-bottom: 20px;
  color: #333;
}

.download-path {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.download-path label {
  margin-right: 10px;
  font-weight: bold;
}

.download-path span {
  flex: 1;
  min-width: 200px;
  text-align: left;
  word-break: break-all;
}

.change-dir-btn {
  padding: 5px 15px;
  background-color: #95a5a6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 10px;
}

.change-dir-btn:hover {
  background-color: #7f8c8d;
}

.download-btn {
  padding: 12px 30px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.download-btn:hover:not(:disabled) {
  background-color: #2980b9;
}

.download-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.progress-container {
  margin-top: 20px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #ecf0f1;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress {
  height: 100%;
  background-color: #3498db;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #333;
}
</style>
