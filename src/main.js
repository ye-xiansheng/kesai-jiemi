import { createApp } from 'vue'
import App from './App.vue'
// 全局引入Element Plus组件库
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)
// 使用Element Plus
app.use(ElementPlus)
app.mount('#app')
