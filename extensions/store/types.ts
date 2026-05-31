export interface StoreExtension {
  id: string
  name: string
  description: string
  version: string
  type: 'tool' | 'provider' | 'orchestrator' | 'helper' | 'theme' | 'iconpack' | 'uikit'
  author: string
  downloadUrl: string
  permissions?: string[]
  icon?: string
}

export interface RegistryIndex {
  version: number
  extensions: StoreExtension[]
}

export interface ExtensionListItem extends StoreExtension {
  installed: boolean
  installedVersion?: string
  canUpdate: boolean
  isSystem: boolean
}
