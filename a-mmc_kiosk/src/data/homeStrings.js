// Demo-quality translation lookup for the kiosk HOME SCREEN ONLY.
//
// This is a deliberately lightweight placeholder for mission F-KIOSKLANG-1 --
// a plain object map, not an i18n library. It intentionally covers only the
// strings visible on HomeScreen.jsx. The real multilingual build (full
// translation coverage, proper i18n tooling) is a separate future mission
// (F-I18N-1) and is out of scope here. Do not grow this file into a general
// translation table; if you need more than the home screen, do F-I18N-1.
//
// "Alagang MMC" is intentionally NOT translated -- it is a proper noun.

// NOTE: flag values below are PLACEHOLDER emoji, confirmed acceptable for the
// demo. They should be swapped for real flag icon assets when this feature is
// built for real -- do not treat the choice of emoji as a finished decision.
export const LANGUAGES = [
  { code: 'en', endonym: 'English', flag: '\u{1F1FA}\u{1F1F8}' }, // 🇺🇸 placeholder emoji -> real USA flag icon asset later
  { code: 'zh', endonym: '中文', flag: '\u{1F1E8}\u{1F1F3}' }, // 🇨🇳 placeholder emoji -> real China flag icon asset later
  { code: 'ja', endonym: '日本語', flag: '\u{1F1EF}\u{1F1F5}' }, // 🇯🇵 placeholder emoji -> real Japan flag icon asset later
]

export const DEFAULT_LANG = 'en'

export const HOME_STRINGS = {
  en: {
    findDoctorLabel: 'Find a Doctor',
    findDoctorSubtext: 'Browse our list of clinicians',
    triageLabel: 'Find the Right Doctor for You',
    triageSubtext: 'Answer a few questions to get matched',
    touchToStart: 'Touch the screen to get started',
    resetNotice: 'This station will reset after 2 minutes of inactivity',
  },
  zh: {
    findDoctorLabel: '寻找医生',
    findDoctorSubtext: '浏览我们的医生名单',
    triageLabel: '为您匹配合适的医生',
    triageSubtext: '回答几个问题即可匹配',
    touchToStart: '触摸屏幕即可开始',
    resetNotice: '本机将在闲置 2 分钟后重置',
  },
  ja: {
    findDoctorLabel: '医師を探す',
    findDoctorSubtext: '医師の一覧を見る',
    triageLabel: 'あなたに合った医師を見つける',
    triageSubtext: 'いくつかの質問に答えてマッチング',
    touchToStart: '画面にタッチして開始してください',
    resetNotice: 'この端末は2分間操作がないとリセットされます',
  },
}

export function stringsFor(langCode) {
  return HOME_STRINGS[langCode] || HOME_STRINGS[DEFAULT_LANG]
}
