/**
 * Thin wrapper around `../icons/registry.js`.
 *
 * The actual icon pack registry logic lives there; this module exists purely
 * to give the extension scanner a small, scanner-local import surface and to
 * keep `index.ts` focused on orchestration.
 */
export {
  registerIconPack,
  clearIconRegistry,
  getIcon,
  getIconPack,
  listIconPacks,
  getDefaultPackName,
} from '../icons/registry.js'
