import {createI18n} from 'vue-i18n';
import zh from './package/zh-cn';
import en from './package/en';
export default createI18n({legacy: false, locale: 'zh-cn', fallbackLocale: 'zh-cn', globalInjection: true,
  messages: {'zh-cn': zh, en}, postTranslation: value => typeof value === 'string' ? value.replace(/__BRAND_NAME__/g, 'SuperPower') : value});
