<script lang="ts">
  import {
    GripVertical,
    Square,
    RefreshCw,
    FileText,
    Trash2,
    Plus,
    Globe,
  } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";

  let {
    serviceSections,
    servicesStatus,
    uciConfig,
    status,
    trans,
    onAdd,
    onEdit,
    onDelete,
    onToggle,
    onStop,
    onReload,
    onReorder,
  }: {
    serviceSections: string[];
    servicesStatus: Record<string, any>;
    uciConfig: any;
    status: any;
    trans: (k: string) => string;
    onAdd: () => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string, enabled: boolean) => void;
    onStop: (id: string) => void;
    onReload: (id: string) => void;
    onReorder: (
      dragId: string,
      targetId: string,
      sections: string[],
      idx: number,
    ) => void;
  } = $props();

  let dragSectionId = $state<string | null>(null);

  const nextUpdateLabels: Record<string, string> = {
    Verify: "Verify",
    "Run once": "Run once",
    Disabled: "Disabled",
    Stopped: "Stopped",
  };
</script>

<div class={cn("space-y-3")}>
  <div class={cn("flex", "items-center", "justify-between")}>
    <div class={cn("flex", "items-center", "gap-2.5")}>
      <h2 class={cn("text-sm", "font-semibold", "text-white")}>
        {trans("Services")}
      </h2>
      {#if serviceSections.length > 0}
        <span
          class={cn(
            "px-1.5",
            "py-0.5",
            "text-[10px]",
            "rounded-full",
            "bg-surface-2",
            "text-muted",
            "font-mono",
          )}
        >
          {serviceSections.length}
        </span>
      {/if}
    </div>
    <button
      onclick={onAdd}
      class={cn(
        "flex",
        "items-center",
        "gap-1.5",
        "px-3",
        "py-1.5",
        "text-xs",
        "rounded-lg",
        "font-medium",
        "transition-all",
        "cursor-pointer",
        "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20",
      )}
    >
      <Plus size={13} />
      {trans("Add service")}
    </button>
  </div>

  {#if serviceSections.length === 0}
    <div
      class={cn(
        "glass",
        "rounded-xl",
        "py-16",
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
        "gap-3",
      )}
    >
      <div
        class={cn(
          "w-10",
          "h-10",
          "rounded-xl",
          "bg-surface-2",
          "flex",
          "items-center",
          "justify-center",
        )}
      >
        <Globe size={18} class={cn("text-muted")} />
      </div>
      <p class={cn("text-sm", "text-muted")}>
        {trans("No DDNS services configured.")}
      </p>
      <button
        onclick={onAdd}
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-lg",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20",
        )}
      >
        <Plus size={12} />
        {trans("Add your first service")}
      </button>
    </div>
  {:else}
    <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
      <div class={cn("overflow-x-auto")}>
        <table class={cn("w-full", "text-xs")}>
          <thead>
            <tr class={cn("text-muted", "border-b", "border-border")}>
              <th class={cn("p-3", "w-8")}></th>
              <th
                class={cn("p-3", "text-left", "font-medium", "tracking-wider")}
                >{trans("Status")}</th
              >
              <th
                class={cn("p-3", "text-left", "font-medium", "tracking-wider")}
                >{trans("Name")}</th
              >
              <th
                class={cn("p-3", "text-left", "font-medium", "tracking-wider")}
                >{trans("Hostname / IP")}</th
              >
              <th
                class={cn(
                  "p-3",
                  "text-center",
                  "font-medium",
                  "tracking-wider",
                )}>{trans("Enabled")}</th
              >
              <th
                class={cn("p-3", "text-left", "font-medium", "tracking-wider")}
                >{trans("Schedule")}</th
              >
              <th
                class={cn(
                  "p-3",
                  "text-center",
                  "font-medium",
                  "tracking-wider",
                )}>{trans("Actions")}</th
              >
            </tr>
          </thead>
          <tbody>
            {#each serviceSections as sectionId, idx (sectionId)}
              {@const svc = servicesStatus[sectionId] || {}}
              {@const sectionData =
                (Object.values(uciConfig?.values || {}) as any[]).find(
                  (s: any) => s[".name"] === sectionId,
                ) || {}}
              {@const enabled = sectionData.enabled === "1"}
              {@const lookupHost =
                sectionData.lookup_host || trans("Configuration Error")}
              <tr
                class={cn(
                  "border-b",
                  "border-border",
                  "transition-colors",
                  "duration-150",
                  dragSectionId === sectionId
                    ? "opacity-40"
                    : "hover:bg-white/1.5",
                )}
                draggable="true"
                ondragstart={() => (dragSectionId = sectionId)}
                ondragover={(e) => e.preventDefault()}
                ondrop={() => {
                  onReorder(dragSectionId!, sectionId, serviceSections, idx);
                  dragSectionId = null;
                }}
                ondragend={() => (dragSectionId = null)}
              >
                <td
                  class={cn(
                    "p-3",
                    "cursor-grab",
                    "text-muted",
                    "hover:text-fg",
                    "transition-colors",
                  )}
                >
                  <GripVertical size={12} />
                </td>
                <td class={cn("p-3")}>
                  {#if svc.pid}
                    <span
                      class={cn(
                        "inline-flex",
                        "items-center",
                        "gap-1.5",
                        "px-2",
                        "py-0.5",
                        "rounded-full",
                        "text-accent",
                      )}
                      style="background:color-mix(in srgb, var(--accent) 12%, transparent)"
                    >
                      <span
                        class={cn(
                          "w-1.5",
                          "h-1.5",
                          "rounded-full",
                          "animate-pulse",
                        )}
                        style="background:var(--accent)"
                      ></span>
                      <span class={cn("text-[10px]", "font-semibold")}
                        >{trans("Running")}</span
                      >
                      <span class={cn("text-[10px]", "font-mono", "opacity-60")}
                        >{svc.pid}</span
                      >
                    </span>
                  {:else}
                    <span
                      class={cn(
                        "inline-flex",
                        "items-center",
                        "gap-1.5",
                        "px-2",
                        "py-0.5",
                        "rounded-full",
                        "bg-surface-2",
                        "text-muted",
                      )}
                    >
                      <span
                        class={cn("w-1.5", "h-1.5", "rounded-full")}
                        style="background:var(--text-muted)"
                      ></span>
                      <span class={cn("text-[10px]", "font-semibold")}
                        >{trans("Stopped")}</span
                      >
                    </span>
                  {/if}
                </td>
                <td class={cn("p-3")}>
                  <span class={cn("font-semibold", "text-fg")}>{sectionId}</span
                  >
                </td>
                <td class={cn("p-3")}>
                  <span class={cn("text-fg")}>{lookupHost}</span><br />
                  <span class={cn("text-[10px]", "font-mono", "text-muted")}
                    >{svc.ip || trans("—")}</span
                  >
                </td>
                <td class={cn("p-3", "text-center")}>
                  <button
                    aria-label={enabled ? trans("Disable") : trans("Enable")}
                    onclick={() => onToggle(sectionId, enabled)}
                    class={cn(
                      "relative",
                      "w-9",
                      "h-5",
                      "rounded-full",
                      "transition-colors",
                      "duration-200",
                      "cursor-pointer",
                      "border",
                      enabled
                        ? "bg-accent border-accent/30"
                        : "bg-surface-2 border-border",
                    )}
                  >
                    <span
                      class={cn(
                        "absolute",
                        "top-0.5",
                        "w-3.5",
                        "h-3.5",
                        "rounded-full",
                        "bg-white",
                        "transition-all",
                        "duration-200",
                        enabled ? "left-4.75" : "left-0.75",
                      )}
                    ></span>
                  </button>
                </td>
                <td class={cn("p-3", "text-muted")}>
                  <div class={cn("space-y-0.5")}>
                    <span class={cn("block", "text-[10px]")}
                      ><span class={cn("text-muted/60")}>U:</span>
                      {svc.last_update || trans("Never")}</span
                    >
                    <span class={cn("block", "text-[10px]")}
                      ><span class={cn("text-muted/60")}>V:</span>
                      {svc.next_check || trans("—")}</span
                    >
                    <span class={cn("block", "text-[10px]")}
                      ><span class={cn("text-muted/60")}>N:</span>
                      {nextUpdateLabels[svc.next_update as string] ||
                        svc.next_update ||
                        trans("—")}</span
                    >
                  </div>
                </td>
                <td class={cn("p-3")}>
                  <div
                    class={cn(
                      "flex",
                      "items-center",
                      "justify-center",
                      "gap-1",
                    )}
                  >
                    <button
                      title={trans("Stop")}
                      disabled={!svc.pid}
                      onclick={() => onStop(sectionId)}
                      class={cn(
                        "p-1.5",
                        "rounded-lg",
                        "transition-all",
                        "duration-150",
                        "cursor-pointer",
                        svc.pid
                          ? "text-danger hover:bg-danger/10"
                          : "text-muted opacity-30",
                      )}
                    >
                      <Square size={14} />
                    </button>
                    <button
                      title={trans("Reload")}
                      disabled={!status?._enabled || !enabled}
                      onclick={() => onReload(sectionId)}
                      class={cn(
                        "p-1.5",
                        "rounded-lg",
                        "transition-all",
                        "duration-150",
                        "cursor-pointer",
                        status?._enabled && enabled
                          ? "text-accent hover:bg-accent/10"
                          : "text-muted opacity-30",
                      )}
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      title={trans("Edit")}
                      onclick={() => onEdit(sectionId)}
                      class={cn(
                        "p-1.5",
                        "rounded-lg",
                        "transition-all",
                        "duration-150",
                        "cursor-pointer",
                        "text-muted",
                        "hover:text-fg",
                        "hover:bg-white/5",
                      )}
                    >
                      <FileText size={14} />
                    </button>
                    <button
                      title={trans("Delete")}
                      onclick={() => onDelete(sectionId)}
                      class={cn(
                        "p-1.5",
                        "rounded-lg",
                        "transition-all",
                        "duration-150",
                        "cursor-pointer",
                        "text-muted",
                        "hover:text-danger",
                        "hover:bg-danger/10",
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
