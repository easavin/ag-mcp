export interface FeatureFlags {
  mcpArchitecture: boolean
  // Remove individual server flags - they're always enabled
}

export class FeatureFlagManager {
  private flags: FeatureFlags

  constructor() {
    this.flags = {
      // Only keep the master architecture flag
      mcpArchitecture: process.env.ENABLE_MCP_ARCHITECTURE !== 'false', // Default to true
    }
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag]
  }

  // Helper method to check if MCP is enabled for any server
  isMCPEnabled(): boolean {
    return this.flags.mcpArchitecture
  }

  setFlag(flag: keyof FeatureFlags, value: boolean): void {
    this.flags[flag] = value
  }
}

export const featureFlags = new FeatureFlagManager()
