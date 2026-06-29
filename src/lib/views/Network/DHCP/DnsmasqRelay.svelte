<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { Plus, Pencil, Trash2 } from "@lucide/svelte";

  let {
    trans,
    relaySections = [] as [string, any][],
    busy = {} as Record<string, string>,
    onopen,
    ondelete,
  }: {
    trans: (k: string) => string;
    relaySections?: [string, any][];
    busy?: Record<string, string>;
    onopen?: (section?: string) => void;
    ondelete?: (section: string) => void;
  } = $props();

  let th = "text-xs font-medium pb-2 px-3 text-left whitespace-nowrap";
  let td = "py-1.5 px-3 text-xs font-mono whitespace-nowrap";
</script>

<p class={cn("text-xs", "text-muted", "mb-3")}>
  {trans("Relay DHCP requests elsewhere.")}
</p>

{#if relaySections.length === 0}
  <p class={cn("py-2", "italic", "text-xs", "text-muted", "text-center")}>
    {trans("No relay entries")}
  </p>
{:else}
  <div class={cn("glass", "rounded-xl", "overflow-hidden", "mb-3")}>
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
          <th class={th}>{trans("Relay from")}</th>
          <th class={th}>{trans("Relay to address")}</th>
          <th class={th}>{trans("Interface")}</th>
          <th class={th}>{trans("Actions")}</th>
        </tr>
      </thead>
      <tbody>
        {#each relaySections as [name, sec], i}
          <tr
            class={cn(
              "border-b",
              "border-border",
              "hover:bg-white/4",
              i % 2 === 0 && "bg-white/1.5",
            )}
          >
            <td class={td}>{sec.local_addr || "—"}</td>
            <td class={td}>{sec.server_addr || "—"}</td>
            <td class={td}>{sec.interface || "—"}</td>
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

<button
  onclick={() => onopen?.()}
  class={cn(
    "flex",
    "gap-1",
    "text-xs",
    "items-center",
    "text-accent",
    "cursor-pointer",
    "hover:underline",
  )}
>
  <Plus size={11} />{trans("Add relay entry")}
</button>
