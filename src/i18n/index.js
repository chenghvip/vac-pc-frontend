import { createI18n } from "vue-i18n";
import vac_zh from "../locale/zh";
import vac_zh_tw from "../locale/zh-tw";
import vac_en_us from "../locale/en-us";

const messages = {
  zh: {
    ...vac_zh,
  },
  en_US: {
    ...vac_en_us,
  },
  zh_tw: {
    ...vac_zh_tw,
  },
};

// 从 localStorage 获取保存的语言设置，如果没有则使用默认的 'zh'
const savedLocale = localStorage.getItem('userLocale') || 'zh';

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  messages,
});

export default i18n;
