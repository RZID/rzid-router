<script lang="ts">
  import { RefreshCw, Trash2 } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";

  let { activeRules, onrefresh, ondelete, formatExpires, trans }: {
    activeRules: any[];
    onrefresh: () => void;
    ondelete: (num: number) => void;
    formatExpires: (secs: number | undefined) => string;
    trans: (k: string) => string;
  } = $props();
</script>

<div class={cn("glass", "rounded-xl", "overflow-hidden")}>
  <div class={cn("p-5", "pb-0")}>
    <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
      <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Active Service Port Maps")}</span>
      <button onclick={onrefresh} class={cn("p-1", "rounded-md", "hover:bg-white/5", "transition-colors", "text-muted", "hover:text-fg", "cursor-pointer")}><RefreshCw size={12} /></button>
    </div>
  </div>
  {#if activeRules.length === 0}
    <div class={cn("px-5", "pb-5")}>
      <div class={cn("border", "border-border", "rounded-lg", "p-6", "text-center")}>
        <p class={cn("text-xs", "text-muted", "italic")}>{trans("There are no active port maps.")}</p>
      </div>
    </div>
  {:else}
    <div class={cn("px-5", "pb-5", "overflow-x-auto")}>
      <table class={cn("w-full", "text-xs")}>
        <thead>
          <tr class={cn("text-left", "text-muted")}>
            <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Client Name")}</th>
            <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Client Address")}</th>
            <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Client Port")}</th>
            <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("External Port")}</th>
            <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Protocol")}</th>
            <th class={cn("pb-2", "pr-3", "font-medium", "text-right")}>{trans("Expires")}</th>
            <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Description")}</th>
            <th class={cn("pb-2", "font-medium", "w-16")}></th>
          </tr>
        </thead>
        <tbody>
          {#each activeRules as r}
            <tr class={cn("border-t", "border-border")}>
              <td class={cn("py-2", "pr-3", "font-medium")}>{r.host_hint || trans("Unknown")}</td>
              <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}>{r.intaddr || "—"}</td>
              <td class={cn("py-2", "pr-3", "font-mono")}>{r.intport || "—"}</td>
              <td class={cn("py-2", "pr-3", "font-mono", "text-accent")}>{r.extport || "—"}</td>
              <td class={cn("py-2", "pr-3")}>{r.proto || "—"}</td>
              <td class={cn("py-2", "pr-3", "font-mono", "text-muted", "text-right", "whitespace-nowrap")}>{formatExpires(r.expires)}</td>
              <td class={cn("py-2", "pr-3", "text-muted")}>{r.descr || "—"}</td>
              <td class={cn("py-2")}>
                <button onclick={() => ondelete(r.num)} class={cn("btn", "cbi-button-remove", "inline-flex", "items-center", "gap-1", "px-2", "py-1", "text-[10px]", "rounded-md", "font-medium", "text-danger", "bg-danger/5", "border", "border-danger/15", "hover:bg-danger/15", "cursor-pointer", "transition-all")}>
                  <Trash2 size={10} /> {trans("Delete")}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
