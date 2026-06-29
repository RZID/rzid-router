<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { Plus, Pencil, Trash2 } from "@lucide/svelte";

  let {
    trans,
    boot6Sections = [] as [string, import("../../../types").UciSection][],
    onopen,
    ondelete,
  }: {
    trans: (k: string) => string;
    boot6Sections?: [string, import("../../../types").UciSection][];
    onopen?: (section?: string) => void;
    ondelete?: (section: string) => void;
  } = $props();

  let th = "text-xs font-medium pb-2 px-3 text-left whitespace-nowrap";
  let td = "py-1.5 px-3 text-xs font-mono whitespace-nowrap";
</script>

<p class={cn("text-xs", "text-muted", "mb-3")}>
  {trans("PXE over IPv6 boot options.")}
</p>

<div class={cn("flex", "justify-end", "mb-2")}>
  <button
    onclick={() => onopen?.()}
    class={cn(
      "flex",
      "px-2",
      "py-1",
      "gap-1",
      "text-xs",
      "rounded",
      "bg-accent",
      "items-center",
      "text-black",
      "cursor-pointer",
    )}
  >
    <Plus size={11} />{trans("Add boot entry")}
  </button>
</div>

{#if boot6Sections.length === 0}
  <p class={cn("py-2", "italic", "text-xs", "text-muted", "text-center")}>
    {trans("No boot options")}
  </p>
{:else}
  <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
    <table class={cn("w-full", "text-xs")}>
      <thead>
        <tr
          class={cn(
            "text-left",
            "bg-surface",
            "border-b",
            "text-muted",
            "border-border",
          )}
        >
          <th class={th}>{trans("URL")}</th>
          <th class={th}>{trans("Architecture")}</th>
          <th class={th}>{trans("Actions")}</th>
        </tr>
      </thead>
      <tbody>
        {#each boot6Sections as [name, sec], i}
          <tr
            class={cn(
              "border-b",
              "border-border",
              "hover:bg-white/4",
              i % 2 === 0 && "bg-white/1.5",
            )}
          >
            <td class={cn(td, "font-mono")}>{sec.url || "—"}</td>
            <td class={td}>{sec.arch || trans("(default)")}</td>
            <td class={td}>
              <button
                onclick={() => onopen?.(name)}
                class={cn(
                  "p-1",
                  "rounded",
                  "text-muted",
                  "hover:text-fg",
                  "cursor-pointer",
                )}
                title={trans("Edit")}
              >
                <Pencil size={11} />
              </button>
              <button
                onclick={() => ondelete?.(name)}
                class={cn(
                  "p-1",
                  "rounded",
                  "text-muted",
                  "cursor-pointer",
                  "hover:text-danger",
                )}
                title={trans("Delete")}
              >
                <Trash2 size={11} />
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
