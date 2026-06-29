<script lang="ts">
  import { cn } from "../../../helpers/classname";

  let {
    upnpStatus,
    trans,
  }: {
    upnpStatus: any;
    trans: (k: string) => string;
  } = $props();
</script>

{#if upnpStatus.rules?.length}
  <div class={cn("overflow-x-auto")}>
    <table class={cn("w-full", "text-xs")}>
      <thead>
        <tr class={cn("text-left", "text-muted")}>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Client")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Address")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Port")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("External")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Proto")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Expires")}</th>
        </tr>
      </thead>
      <tbody>
        {#each upnpStatus.rules as r}
          <tr class={cn("border-t", "border-border")}>
            <td class={cn("py-2", "pr-3", "font-medium")}>
              {r.descr || r.client || "—"}
            </td>
            <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}>
              {r.client_addr || "—"}
            </td>
            <td class={cn("py-2", "pr-3", "font-mono")}>
              {r.client_port || "—"}
            </td>
            <td class={cn("py-2", "pr-3", "font-mono", "text-accent")}>
              {r.ext_port || "—"}
            </td>
            <td class={cn("py-2", "pr-3")}>{r.protocol || "—"}</td>
            <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}>
              {r.expires || "—"}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p class={cn("text-sm", "text-center", "py-6", "text-muted")}>
    {trans("No active port maps")}
  </p>
{/if}
