<script setup>
import { computed } from 'vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import localZh from './locale/zh';
import localZhTw from './locale/zh-tw';
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// 获取对应的语言包
const getLocaleConfig = (lang) => {
  switch(lang) {
    case 'zh_tw':
      return { ...zhTw, ...localZhTw }
    default:
      return { ...zhCn, ...localZh }
  }
}
// 计算当前的语言配置
const localeConfig = computed(() => getLocaleConfig(locale.value))
</script>

<template>
  <el-config-provider :locale="localeConfig">
    <router-view/>
  </el-config-provider>
</template>

<style scoped>
</style>
