<script lang="ts">
  import {
    Package,
    Download,
    RefreshCw,
    Trash2,
    CheckCircle2,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    Search,
  } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import { fmtBytes } from "../../../helpers/format";

  const PAGE_SIZE = 100;

  let {
    loading = false,
    pagedRows = [] as any[][],
    currentRows = [] as any[][],
    pageOffset = 0,
    sortField = "name",
    sortDir = "asc",
    operating = false,
    trans,
    isApk = false,
    filter = "",
    ongoprev,
    ongonext,
    onsort,
    onshowdetail,
    onremovemodal,
    onreset,
  }: {
    loading?: boolean;
    pagedRows?: any[][];
    currentRows?: any[][];
    pageOffset?: number;
    sortField?: "name" | "version" | "size";
    sortDir?: "asc" | "desc";
    operating?: boolean;
    trans: (k: string) => string;
    isApk?: boolean;
    filter?: string;
    ongoprev?: () => void;
    ongonext?: () => void;
    onsort?: (field: "name" | "version" | "size") => void;
    onshowdetail?: (name: string) => void;
    onremovemodal?: (name: string) => void;
    onreset?: () => void;
  } = $props();

  const formatSize = (size: number): string => {
    return fmtBytes(size).replace(" ", "");
  };
</script>

{#if loading}
  <div class={cn("flex-1", "flex", "items-center", "justify-center")}>
    <div class={cn("flex", "flex-col", "items-center", "gap-3")}>
      <div class={cn("relative")}>
        <div
          class={cn(
            "w-10",
            "h-10",
            "rounded-xl",
            "bg-surface-3",
            "animate-pulse",
            "flex",
            "items-center",
            "justify-center",
          )}
        >
          <Package size={18} class="text-accent/40" />
        </div>
        <div
          class={cn(
            "absolute",
            "-top-1",
            "-right-1",
            "w-3",
            "h-3",
            "rounded-full",
            "bg-accent/30",
            "animate-ping",
          )}
        ></div>
      </div>
      <span class={cn("text-xs", "text-muted", "animate-pulse")}
        >{trans("Loading package information…")}</span
      >
    </div>
  </div>
{:else}
  <div class={cn("shrink-0", "flex", "items-center", "justify-center")}>
    <div
      class={cn(
        "inline-flex",
        "items-center",
        "gap-2",
        "px-3",
        "py-1",
        "rounded-lg",
        "bg-surface-2",
        "border",
        "border-border",
      )}
    >
      <button
        onclick={ongoprev}
        disabled={pageOffset < 100}
        class={cn(
          "px-2 py-1 text-xs rounded-md font-medium border transition-all duration-150",
          pageOffset < 100
            ? "text-muted/30 bg-surface-3 border-border cursor-not-allowed"
            : "text-muted bg-surface-2 border-border hover:bg-surface-3 cursor-pointer active:scale-95",
        )}
      >
        <ArrowLeft size={12} />
      </button>
      <span class={cn("text-xs", "text-muted", "tabular-nums")}>
        {currentRows.length
          ? trans("Displaying {n}-{m} of {total}")
              .replace("{n}", String(pageOffset + 1))
              .replace(
                "{m}",
                String(Math.min(pageOffset + PAGE_SIZE, currentRows.length)),
              )
              .replace("{total}", String(currentRows.length))
          : trans("No packages")}
      </span>
      <button
        onclick={ongonext}
        disabled={pageOffset + PAGE_SIZE >= currentRows.length}
        class={cn(
          "px-2 py-1 text-xs rounded-md font-medium border transition-all duration-150",
          pageOffset + PAGE_SIZE >= currentRows.length
            ? "text-muted/30 bg-surface-3 border-border cursor-not-allowed"
            : "text-muted bg-surface-2 border-border hover:bg-surface-3 cursor-pointer active:scale-95",
        )}
      >
        <ArrowRight size={12} />
      </button>
    </div>
  </div>

  <div class={cn("flex-1", "min-h-0", "rounded-xl", "overflow-hidden")}>
    <div class={cn("glass", "rounded-xl", "h-full", "overflow-y-auto")}>
      <table class={cn("w-full", "text-xs")}>
        <thead class={cn("sticky", "top-0", "z-10")}>
          <tr
            class={cn(
              "border-b",
              "border-border",
              "bg-surface-2/95",
              "backdrop-blur-sm",
            )}
          >
            <th
              onclick={() => onsort?.("name")}
              class={cn(
                "text-left",
                "p-3",
                "text-[10px]",
                "uppercase",
                "text-muted",
                "font-semibold",
                "tracking-wider",
                "cursor-pointer",
                "hover:text-white",
                "select-none",
              )}
            >
              <span class={cn("inline-flex", "items-center", "gap-1")}>
                {trans("Package name")}
                {#if sortField === "name" && sortDir === "asc"}<ArrowUp
                    size={10}
                    class={cn("text-accent")}
                  />{/if}
                {#if sortField === "name" && sortDir === "desc"}<ArrowDown
                    size={10}
                    class={cn("text-accent")}
                  />{/if}
              </span>
            </th>
            <th
              onclick={() => onsort?.("version")}
              class={cn(
                "text-left",
                "p-3",
                "text-[10px]",
                "uppercase",
                "text-muted",
                "font-semibold",
                "tracking-wider",
                "hidden",
                "sm:table-cell",
                "cursor-pointer",
                "hover:text-white",
                "select-none",
              )}
            >
              <span class={cn("inline-flex", "items-center", "gap-1")}>
                {trans("Version")}
                {#if sortField === "version" && sortDir === "asc"}<ArrowUp
                    size={10}
                    class={cn("text-accent")}
                  />{/if}
                {#if sortField === "version" && sortDir === "desc"}<ArrowDown
                    size={10}
                    class={cn("text-accent")}
                  />{/if}
              </span>
            </th>
            <th
              onclick={() => onsort?.("size")}
              class={cn(
                "text-center",
                "p-3",
                "text-[10px]",
                "uppercase",
                "text-muted",
                "font-semibold",
                "tracking-wider",
                "hidden",
                "md:table-cell",
                "cursor-pointer",
                "hover:text-white",
                "select-none",
              )}
            >
              <span class={cn("inline-flex", "items-center", "gap-1")}>
                {trans("Size ({ext})").replace(
                  "{ext}",
                  isApk ? ".apk" : ".ipk",
                )}
                {#if sortField === "size" && sortDir === "asc"}<ArrowUp
                    size={10}
                    class={cn("text-accent")}
                  />{/if}
                {#if sortField === "size" && sortDir === "desc"}<ArrowDown
                    size={10}
                    class={cn("text-accent")}
                  />{/if}
              </span>
            </th>
            <th
              class={cn(
                "text-left",
                "p-3",
                "text-[10px]",
                "uppercase",
                "text-muted",
                "font-semibold",
                "tracking-wider",
                "hidden",
                "lg:table-cell",
              )}>{trans("Description")}</th
            >
            <th
              class={cn(
                "text-right",
                "p-3",
                "text-[10px]",
                "uppercase",
                "text-muted",
                "font-semibold",
                "tracking-wider",
              )}>&nbsp;</th
            >
          </tr>
        </thead>
        <tbody>
          {#each pagedRows as [name, version, size, desc, btn], i}
            <tr
              class={cn(
                "border-b border-border/50 transition-all duration-150 cursor-pointer group",
                "hover:bg-surface-1/60",
                i % 2 === 0 ? "bg-surface-1/20" : "bg-transparent",
              )}
              onclick={() => onshowdetail?.(name)}
              style="animation: slideUp 0.2s ease-out {i * 15}ms both;"
            >
              <td
                class={cn(
                  "p-3",
                  "font-medium",
                  "text-white",
                  "truncate",
                  "max-w-0",
                )}
              >
                <div class={cn("flex", "items-center", "gap-2")}>
                  <span class={cn("truncate", "block")}>{@html name}</span>
                </div>
              </td>
              <td
                class={cn(
                  "p-3",
                  "font-mono",
                  "hidden",
                  "sm:table-cell",
                  "truncate",
                  "max-w-40",
                )}
              >
                {#if btn.action === "upgrade"}
                  <span class={cn("text-accent", "text-[10px]")}
                    >{@html version}</span
                  >
                {:else}
                  <span class={cn("text-muted")}>{version}</span>
                {/if}
              </td>
              <td
                class={cn(
                  "p-3",
                  "text-center",
                  "text-muted",
                  "font-mono",
                  "hidden",
                  "md:table-cell",
                )}
              >
                {size ? formatSize(size) : "-"}
              </td>
              <td
                class={cn(
                  "p-3",
                  "text-muted",
                  "truncate",
                  "max-w-0",
                  "hidden",
                  "lg:table-cell",
                )}
              >
                <span class={cn("truncate", "block", "text-[11px]")}
                  >{@html desc || "-"}</span
                >
              </td>
              <td class={cn("p-3", "text-right")}>
                {#if btn.action === "install"}
                  <button
                    onclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      onshowdetail?.(name);
                    }}
                    class={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md font-medium border transition-all duration-150 cursor-pointer active:scale-95",
                      "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25",
                    )}
                  >
                    <Download size={10} />
                    {trans("Install…")}
                  </button>
                {:else if btn.action === "upgrade"}
                  <button
                    onclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      onshowdetail?.(name);
                    }}
                    class={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md font-medium border transition-all duration-150 cursor-pointer active:scale-95",
                      "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25",
                    )}
                  >
                    <RefreshCw size={10} />
                    {trans("Upgrade…")}
                  </button>
                {:else if btn.action === "remove"}
                  <button
                    onclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      onremovemodal?.(name);
                    }}
                    class={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md font-medium border transition-all duration-150 cursor-pointer active:scale-95",
                      "text-danger bg-danger/8 border-danger/15 hover:bg-danger/15 hover:border-danger/25",
                    )}
                  >
                    <Trash2 size={10} />
                    {trans("Remove…")}
                  </button>
                {:else}
                  <span
                    class={cn(
                      "inline-flex",
                      "items-center",
                      "gap-1",
                      "px-2",
                      "py-1",
                      "text-[10px]",
                      "font-medium",
                      "text-accent/60",
                    )}
                  >
                    <CheckCircle2 size={10} />
                    {trans("Installed")}
                  </span>
                {/if}
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="5">
                <div
                  class={cn(
                    "flex",
                    "flex-col",
                    "items-center",
                    "gap-3",
                    "py-12",
                    "text-center",
                  )}
                >
                  <div
                    class={cn(
                      "w-10",
                      "h-10",
                      "rounded-xl",
                      "bg-surface-3",
                      "flex",
                      "items-center",
                      "justify-center",
                    )}
                  >
                    <Package size={16} class={cn("text-muted")} />
                  </div>
                  <div>
                    <p class={cn("text-sm", "font-medium", "text-muted")}>
                      {filter
                        ? trans('No packages matching "{filter}".').replace(
                            "{filter}",
                            filter,
                          )
                        : trans("No packages")}
                    </p>
                    {#if filter}
                      <button
                        onclick={onreset}
                        class={cn(
                          "text-xs",
                          "text-accent",
                          "hover:underline",
                          "mt-1",
                          "cursor-pointer",
                        )}>{trans("Reset")}</button
                      >
                    {/if}
                  </div>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class={cn("shrink-0", "flex", "items-center", "justify-center")}>
    <div
      class={cn(
        "inline-flex",
        "items-center",
        "gap-2",
        "px-3",
        "py-1",
        "rounded-lg",
        "bg-surface-2",
        "border",
        "border-border",
      )}
    >
      <button
        onclick={ongoprev}
        disabled={pageOffset < 100}
        class={cn(
          "px-2 py-1 text-xs rounded-md font-medium border transition-all duration-150",
          pageOffset < 100
            ? "text-muted/30 bg-surface-3 border-border cursor-not-allowed"
            : "text-muted bg-surface-2 border-border hover:bg-surface-3 cursor-pointer active:scale-95",
        )}
      >
        <ArrowLeft size={12} />
      </button>
      <span class={cn("text-xs", "text-muted", "tabular-nums")}>
        {currentRows.length
          ? trans("Displaying {n}-{m} of {total}")
              .replace("{n}", String(pageOffset + 1))
              .replace(
                "{m}",
                String(Math.min(pageOffset + PAGE_SIZE, currentRows.length)),
              )
              .replace("{total}", String(currentRows.length))
          : trans("No packages")}
      </span>
      <button
        onclick={ongonext}
        disabled={pageOffset + PAGE_SIZE >= currentRows.length}
        class={cn(
          "px-2 py-1 text-xs rounded-md font-medium border transition-all duration-150",
          pageOffset + PAGE_SIZE >= currentRows.length
            ? "text-muted/30 bg-surface-3 border-border cursor-not-allowed"
            : "text-muted bg-surface-2 border-border hover:bg-surface-3 cursor-pointer active:scale-95",
        )}
      >
        <ArrowRight size={12} />
      </button>
    </div>
  </div>
{/if}
