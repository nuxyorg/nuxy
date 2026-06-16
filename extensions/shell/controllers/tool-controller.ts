import type { ReactiveController, ReactiveControllerHost } from '@nuxyorg/core'
import type { Tool, Orchestrator, UsageStats } from '../types.ts'

export interface ToolControllerOptions {
  onToolChange?: (toolId: string | null) => void
}

export class ToolController implements ReactiveController {
  private _activeTool: string | null = null
  private _tools: Tool[] = []
  private _orchestrators: Orchestrator[] = []
  private _recentToolIds: string[] = []
  private _usageStats: UsageStats = {}

  get activeTool(): string | null {
    return this._activeTool
  }
  get tools(): Tool[] {
    return this._tools
  }
  get orchestrators(): Orchestrator[] {
    return this._orchestrators
  }
  get recentToolIds(): string[] {
    return this._recentToolIds
  }
  get usageStats(): UsageStats {
    return this._usageStats
  }

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly options: ToolControllerOptions = {}
  ) {
    host.addController(this)
  }

  hostConnected(): void {}

  setTools(tools: Tool[]): void {
    this._tools = tools
    this.host.requestUpdate()
  }

  setOrchestrators(orchestrators: Orchestrator[]): void {
    this._orchestrators = orchestrators
    this.host.requestUpdate()
  }

  setRecentToolIds(ids: string[]): void {
    this._recentToolIds = ids
    this.host.requestUpdate()
  }

  setUsageStats(stats: UsageStats): void {
    this._usageStats = stats
    this.host.requestUpdate()
  }

  setActiveTool(toolId: string | null): void {
    if (this._activeTool === toolId) return
    this._activeTool = toolId
    this.host.requestUpdate()
    this.options.onToolChange?.(toolId)
  }

  get activeToolName(): string | null {
    if (!this._activeTool) return null
    const tool = this._tools.find((t) => t.id === this._activeTool)
    return tool?.manifest.name ?? this._activeTool
  }

  get activeToolPlaceholder(): string | null {
    if (!this._activeTool) return null
    const tool = this._tools.find((t) => t.id === this._activeTool)
    return (tool?.manifest as { placeholder?: string } | undefined)?.placeholder ?? null
  }
}
