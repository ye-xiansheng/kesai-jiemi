const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  pages: {
    index: {
      entry: 'src/main.js',
      title: '柯赛解密申请'
    }
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      productName: '柯赛解密申请',
      // 禁用asar打包，避免路径问题
      asar: false,
      // 设置桌面图标
      icon: 'src/assets/logoTitle.png',
      // 确保资源文件被正确打包
      extraResources: [
        {
          from: 'src/assets',
          to: 'src/assets',
          filter: ['**/*']
        }
      ],
      // 构建选项
      builderOptions: {
        win: {
          target: ['nsis'],
          icon: 'src/assets/logoTitle.png'
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true
        }
      }
    }
  }
})
