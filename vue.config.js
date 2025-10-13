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
      productName: '柯赛解密申请'
    }
  }
})
