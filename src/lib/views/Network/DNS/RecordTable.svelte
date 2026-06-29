<script lang="ts">
  import { Pencil, Plus, Trash2 } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";

  let {
    type,
    columns,
    sections,
    description,
    openRec,
    deleteSection,
    trans,
    td,
    th,
  }: {
    type: string;
    columns: { key: string; label: string; render?: (v: string) => string }[];
    sections: [string, import("../../../types").UciSection][];
    description: string;
    openRec: (type: string, id?: string) => void;
    deleteSection: (id: string) => void;
    trans: (k: string) => string;
    td: string;
    th: string;
  } = $props();
</script>

<p class={cn("text-xs", "text-muted", "mb-2")}>{trans(description)}</p>
<div class={cn("flex", "justify-end", "mb-2")}>
  <button
    onclick={() => openRec(type)}
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
    <Plus size={11} />{trans("Add")}
  </button>
</div>
{#if sections.length === 0}
  <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>
    {trans("This section contains no values yet")}
  </p>
{:else}
  <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
    <table class={cn("w-full", "text-xs")}>
      <thead>
        <tr
          class={cn(
            "border-b",
            "text-left",
            "text-muted",
            "bg-surface",
            "border-border",
          )}
        >
          {#each columns as col}
            <th class={th}>{col.label}</th>
          {/each}
          <th class={th}>{trans("Actions")}</th>
        </tr>
      </thead>
      <tbody>
        {#each sections as [id, sec], i}
          <tr
            class={cn(
              "border-b",
              "border-border",
              "hover:bg-white/4",
              i % 2 === 0 && "bg-white/1.5",
            )}
          >
            {#each columns as col}
              <td class={td}
                >{col.render
                  ? col.render(sec[col.key])
                  : sec[col.key] || "—"}</td
              >
            {/each}
            <td class={td}>
              <button
                onclick={() => openRec(type, id)}
                class={cn(
                  "p-1",
                  "rounded",
                  "text-muted",
                  "hover:text-fg",
                  "cursor-pointer",
                )}
                title={trans("Edit")}><Pencil size={11} /></button
              >
              <button
                onclick={() => deleteSection(id)}
                class={cn(
                  "p-1",
                  "rounded",
                  "text-muted",
                  "cursor-pointer",
                  "hover:text-danger",
                )}
                title={trans("Delete")}><Trash2 size={11} /></button
              >
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
