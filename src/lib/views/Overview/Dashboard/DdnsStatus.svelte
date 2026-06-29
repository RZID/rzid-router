<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import type { DdnsStatusRow } from "./types";

  let {
    ddnsStatus,
    trans,
  }: {
    ddnsStatus: DdnsStatusRow[];
    trans: (k: string) => string;
  } = $props();
</script>

<div class={cn("overflow-x-auto")}>
  <table class={cn("w-full", "text-xs")}>
    <thead>
      <tr class={cn("text-left", "text-muted")}>
        <th class={cn("pb-2", "pr-3", "font-medium")}
          >{trans("Configuration")}</th
        >
        <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Next Update")}</th
        >
        <th class={cn("pb-2", "pr-3", "font-medium")}
          >{trans("Lookup Hostname")}</th
        >
        <th class={cn("pb-2", "pr-3", "font-medium")}
          >{trans("Registered IP")}</th
        >
        <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Network")}</th>
      </tr>
    </thead>
    <tbody>
      {#each ddnsStatus as s}
        <tr class={cn("border-t border-border")}>
          <td class={cn("py-2", "pr-3", "font-medium")}>{s._name}</td>
          <td class={cn("py-2", "pr-3")}>
            <span
              class={cn("px-2", "py-0.5", "rounded-full", "text-xs")}
              style="background:{s.pid
                ? 'rgba(0,212,170,0.1)'
                : 'rgba(255,77,79,0.1)'};color:{s.pid
                ? 'var(--accent)'
                : 'var(--danger)'}"
            >
              {s.pid ? trans("Running") : s.next_update || trans("Stopped")}
            </span>
          </td>
          <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}
            >{s._lookup_host || "—"}</td
          >
          <td class={cn("py-2", "pr-3", "font-mono")}>{s.ip || "—"}</td>
          <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}
            >{s._network || "—"}</td
          >
        </tr>
      {/each}
    </tbody>
  </table>
</div>
