<script lang="ts">
  import { Plus, Pencil, Trash2 } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import type { UciSection } from "../../../types";

  let {
    sections,
    isRule,
    tableName,
    busy,
    onadd,
    onedit,
    ondelete,
    trans,
  }: {
    sections: [string, UciSection][];
    isRule: boolean;
    tableName: (t: string | number) => string;
    busy: Record<string, string>;
    onadd: () => void;
    onedit: (name: string) => void;
    ondelete: (name: string) => void;
    trans: (k: string) => string;
  } = $props();

  const th = "text-xs font-medium pb-2 pr-3 text-left whitespace-nowrap";
  const td = "py-1.5 pr-3 text-xs font-mono whitespace-nowrap";
</script>

<div class={cn("flex", "justify-end")}>
  <button
    onclick={onadd}
    class={cn(
      "flex",
      "items-center",
      "gap-1.5",
      "px-3",
      "py-1.5",
      "text-xs",
      "font-medium",
      "rounded-lg",
      "bg-accent",
      "text-black",
      "hover:opacity-90",
      "transition-all",
      "cursor-pointer",
    )}
  >
    <Plus size={12} />
    {trans("Add")}
  </button>
</div>

{#if sections.length === 0}
  <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-8")}>
    {trans("No entries available")}
  </p>
{:else}
  <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
    <table class={cn("w-full", "text-xs")}>
      <thead>
        <tr class={cn("text-left", "text-muted", "border-b", "border-border")}>
          {#if isRule}
            <th class={th}>{trans("Priority")}</th><th class={th}
              >{trans("Action")}</th
            ><th class={th}>{trans("In")}</th>
            <th class={th}>{trans("Source")}</th><th class={th}
              >{trans("Proto")}</th
            ><th class={th}>{trans("Out")}</th>
            <th class={th}>{trans("Destination")}</th><th class={th}
              >{trans("Table")}</th
            >
          {:else}
            <th class={th}>{trans("Interface")}</th><th class={th}
              >{trans("Target")}</th
            ><th class={th}>{trans("Gateway")}</th>
            <th class={th}>{trans("Metric")}</th><th class={th}
              >{trans("Table")}</th
            ><th class={th}>{trans("Type")}</th>
          {/if}
          <th class={th}>{trans("Actions")}</th>
        </tr>
      </thead>
      <tbody>
        {#each sections as [name, sec]}
          <tr class={cn("border-b", "border-border", "hover:bg-white/2")}>
            {#if isRule}
              <td class={td}>{sec.priority || trans("auto")}</td>
              <td class={td}>{sec.action || "unicast"}</td>
              <td class={td}>{sec.in || "—"}</td>
              <td class={td}>{sec.src || trans("(any)")}</td>
              <td class={td}>{sec.ipproto ?? "—"}</td>
              <td class={td}>{sec.out || "—"}</td>
              <td class={td}>{sec.dest || trans("(any)")}</td>
              <td class={cn(td, "text-muted")}
                >{sec.lookup ? tableName(sec.lookup) : "—"}</td
              >
            {:else}
              <td class={td}>{sec.interface || "—"}</td>
              <td class={cn(td, "text-accent")}>{sec.target || "—"}</td>
              <td class={td}>{sec.gateway || "—"}</td>
              <td class={td}>{sec.metric ?? "—"}</td>
              <td class={cn(td, "text-muted")}
                >{sec.table ? tableName(sec.table) : "—"}</td
              >
              <td class={td}>{sec.type || "unicast"}</td>
            {/if}
            <td class={td}>
              <div class={cn("flex", "items-center", "gap-1")}>
                <button
                  onclick={() => onedit(name)}
                  class={cn(
                    "p-1",
                    "rounded",
                    "text-muted",
                    "hover:text-fg",
                    "hover:bg-white/5",
                    "transition-colors",
                    "cursor-pointer",
                  )}
                  title={trans("Edit")}><Pencil size={11} /></button
                >
                <button
                  onclick={() => ondelete(name)}
                  disabled={busy[name] !== undefined}
                  class={cn(
                    "p-1",
                    "rounded",
                    "text-muted",
                    "hover:text-danger",
                    "hover:bg-danger/5",
                    "transition-colors",
                    "disabled:opacity-30",
                    "cursor-pointer",
                  )}
                  title={trans("Delete")}><Trash2 size={11} /></button
                >
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
