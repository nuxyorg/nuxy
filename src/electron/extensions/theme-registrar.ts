/**
 * Thin wrapper around `../themes/extension-themes.js`.
 *
 * The actual theme registry logic lives there; this module exists purely to
 * give the extension scanner a small, scanner-local import surface and to
 * keep `index.ts` focused on orchestration.
 */
export {
  registerExtensionTheme,
  clearExtensionThemes,
  getExtensionTheme,
  getDefaultTheme,
  getDefaultThemeName,
  listExtensionThemeNames,
} from '../themes/extension-themes.js'
