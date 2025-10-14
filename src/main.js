import { createApp } from 'vue'
import App from './App.vue'
// 全局引入Element Plus组件库
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)
// 使用Element Plus
app.use(ElementPlus)

// 自定义防抖指令 - 两秒内只执行一次事件
app.directive('debounce', {
  mounted(el, binding) {
    // 获取延迟时间，默认为2000毫秒
    const delay = binding.arg ? parseInt(binding.arg) : 2000
    // 获取加载状态文本，默认为'处理中...'
    const loadingText = binding.value || '处理中..'
    
    // 保存原始文本和点击状态
    let originalText = ''
    let canClick = true
    
    // 点击事件处理函数
    const handleClick = function(event) {
      if (!canClick) {
        // 阻止默认行为和冒泡
        event.preventDefault()
        event.stopPropagation()
        return false
      }
      
      // 设置为不可点击状态
      canClick = false
      
      // 保存原始文本并设置加载文本（针对按钮元素）
      if (el.tagName === 'BUTTON' || el.classList.contains('el-button')) {
        originalText = el.textContent
        el.textContent = loadingText
        el.disabled = true
        
        // 处理Element Plus按钮的特殊情况
        if (el.__vueParentComponent && el.__vueParentComponent.proxy) {
          const btnInstance = el.__vueParentComponent.proxy
          if (btnInstance.setLoading) {
            btnInstance.setLoading(true)
          }
        }
      }
      
      // 延迟后恢复可点击状态
      setTimeout(() => {
        canClick = true
        if (el.tagName === 'BUTTON' || el.classList.contains('el-button')) {
          el.textContent = originalText
          el.disabled = false
          
          // 恢复Element Plus按钮状态
          if (el.__vueParentComponent && el.__vueParentComponent.proxy) {
            const btnInstance = el.__vueParentComponent.proxy
            if (btnInstance.setLoading) {
              btnInstance.setLoading(false)
            }
          }
        }
      }, delay)
    }
    
    // 保存原始点击事件
    const originalClick = el.onclick
    
    // 重写onclick方法
    el.onclick = function(event) {
      // 先执行防抖逻辑
      const shouldProceed = handleClick(event)
      
      // 如果允许继续执行，调用原始点击事件
      if (shouldProceed !== false && originalClick && typeof originalClick === 'function') {
        originalClick.call(this, event)
      }
    }
    
    // 保存原始状态以便清理
    el._debounceData = {
      originalClick: originalClick
    }
  },
  
  // 解绑时恢复原始状态
  unmounted(el) {
    if (el._debounceData) {
      el.onclick = el._debounceData.originalClick
      delete el._debounceData
    }
  }
})
const debounce = (fn, delay) => {
  let timer = null;
  return function() {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, arguments), delay);
  }
}
window.ResizeObserver = class extends ResizeObserver {
  constructor(callback) {
    super(debounce(callback, 16)); // 16ms对应浏览器帧率
  }
}
app.mount('#app')
