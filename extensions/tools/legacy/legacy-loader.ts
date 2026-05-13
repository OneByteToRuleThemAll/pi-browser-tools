import registerBrowserToolsLegacy from "../../browser-tools-core.ts";

type LegacyToolSpec = any;
type LegacyCommandSpec = any;

type LegacyCatalog = {
  tools: Map<string, LegacyToolSpec>;
  commands: Map<string, LegacyCommandSpec>;
};

let catalog: LegacyCatalog | null = null;
let building = false;

function buildCatalog(): LegacyCatalog {
  if (catalog) return catalog;
  if (building) throw new Error("Legacy browser tool catalog is being initialized recursively.");
  building = true;
  try {
    const tools = new Map<string, LegacyToolSpec>();
    const commands = new Map<string, LegacyCommandSpec>();

    const shim: any = {
      registerTool(spec: LegacyToolSpec) {
        if (spec && typeof spec.name === "string") {
          tools.set(spec.name, spec);
        }
      },
      registerCommand(name: string, spec: LegacyCommandSpec) {
        if (typeof name === "string") {
          commands.set(name, spec);
        }
      },
      registerTrigger: () => undefined,
      registerPrompt: () => undefined,
      registerAction: () => undefined,
      registerResource: () => undefined,
      registerCommandAlias: () => undefined,
    };

    registerBrowserToolsLegacy(shim as any);
    catalog = { tools, commands };
    return catalog;
  } finally {
    building = false;
  }
}

export function registerLegacyTool(pi: any, name: string) {
  const tool = buildCatalog().tools.get(name);
  if (!tool) {
    throw new Error(`Legacy tool not found: ${name}`);
  }
  if (!pi || typeof pi.registerTool !== "function") {
    throw new Error("registerLegacyTool requires a valid extension API object");
  }
  pi.registerTool(tool);
}

export function registerLegacyCommand(pi: any, name: string) {
  const spec = buildCatalog().commands.get(name);
  if (!spec) return;
  if (!pi || typeof pi.registerCommand !== "function") {
    throw new Error("registerLegacyCommand requires a valid extension API object");
  }
  pi.registerCommand(name, spec);
}
