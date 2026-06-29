<script lang="ts">
  import { Plus, Trash2 } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";

  let {
    instances,
    newInstanceName = $bindable(""),
    busy,
    onadd,
    onremove,
    trans,
  }: {
    instances: { id: string; name: string; isDefault: boolean }[];
    newInstanceName: string;
    busy: Record<string, string>;
    onadd: () => void;
    onremove: (id: string) => void;
    trans: (k: string) => string;
  } = $props();
</script>

<div class={cn("mt-4", "glass", "rounded-xl", "p-5")}>
  <h3 class={cn("text-sm", "font-semibold", "text-text", "mb-2")}>
    {trans("Server Instances")}
  </h3>
  {#each instances as inst, i}
    <div
      class={cn(
        "flex",
        "px-2",
        "py-1.5",
        "rounded",
        "items-center",
        "justify-between",
        "hover:bg-white/3",
        i % 2 === 1 && "bg-white/1.5",
      )}
    >
      <span class={cn("text-xs", "text-text")}>
        {inst.name ||
          (inst.isDefault
            ? trans("Default instance")
            : trans("Unnamed instance") + " #" + (i + 1))}
      </span>
      {#if !inst.isDefault}
        <button
          onclick={() => onremove(inst.id)}
          disabled={busy["del_" + inst.id] !== undefined}
          class={cn(
            "p-1",
            "rounded",
            "text-muted",
            "cursor-pointer",
            "hover:text-danger",
            "disabled:opacity-50",
          )}
        >
          <Trash2 size={12} />
        </button>
      {/if}
    </div>
  {/each}
  <div
    class={cn(
      "flex",
      "mt-3",
      "pt-3",
      "gap-2",
      "border-t",
      "items-center",
      "border-border",
    )}
  >
    <input
      type="text"
      bind:value={newInstanceName}
      onkeydown={(e) => {
        if (e.key === "Enter") onadd();
      }}
      placeholder={trans("New instance name...")}
      class={cn(
        "flex-1",
        "px-2.5",
        "py-1.5",
        "border",
        "text-xs",
        "rounded-md",
        "text-text",
        "bg-surface",
        "outline-none",
        "transition-all",
        "border-border",
        "focus:border-accent",
        "placeholder:text-text-muted",
      )}
    />
    <button
      onclick={onadd}
      class={cn(
        "flex",
        "px-3",
        "gap-1",
        "py-1.5",
        "text-xs",
        "shrink-0",
        "rounded-md",
        "font-medium",
        "bg-accent",
        "items-center",
        "text-white",
        "cursor-pointer",
        "hover:opacity-90",
      )}
    >
      <Plus size={12} />{trans("Add server instance")}
    </button>
  </div>
</div>
