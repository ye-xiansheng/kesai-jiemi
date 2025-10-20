const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.png$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 10000
              }
            },
            {
              loader: 'image-webpack-loader',
              options: {
                pngquant: {
                  quality: [0.90, 0.95]
                },
                optipng: {
                  optimizationLevel: 7
                },
                gifsicle: {
                  interlaced: false
                },
                // 解决libpng的sRGB配置文件警告
                png: {
                  // 忽略iCCP错误
                  disable: true
                }
              }
            }
          ]
        }
      ]
    }
  },
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
      // 确保资源文件被正确打包 - 同时复制到多个可能的位置以提高兼容性
      extraResources: [
        // 复制到src/assets目录（与代码中的路径匹配）
        {
          from: 'src/assets',
          to: 'src/assets',
          filter: ['**/*']
        },
        // 同时复制到根目录的assets文件夹，增加找到图标的可能性
        {
          from: 'src/assets',
          to: 'assets',
          filter: ['**/*']
        },
        // 直接复制图标文件到根目录
        {
          from: 'src/assets/logoTitle.png',
          to: 'logoTitle.png'
        },
        // 添加通知HTML文件到资源中
        {
          from: 'src/assets/notification.html',
          to: 'src/assets/notification.html'
        }
      ],
      // 构建选项
      builderOptions: {
        win: {
          target: ['nsis'],
          icon: 'src/assets/logoTitle.png',
          // 添加额外的资源文件
          extraResources: [
            {
              from: 'src/assets',
              to: '.',
              filter: ['logoTitle.png']
            },
            // 添加通知HTML文件
            {
              from: 'src/assets/notification.html',
              to: 'notification.html'
            }
          ]
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true
        },
        // 确保所有资源文件都被正确打包
        files: [
          '**/*',
          {
            from: 'src/assets',
            to: 'src/assets',
            filter: ['**/*']
          },
          'src/assets/notification.html'
        ]
      }
    }
  }
})
