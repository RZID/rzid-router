<script lang="ts">
  // Deps
  import { Pencil, Plus, Trash2, X } from "@lucide/svelte";

  // Helpers
  import { cn } from "../../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../../i18n";

  // Props
  let { openIpset, deleteSection, ltoA, getSections, th, td } = $props<{
    openIpset: (id?: string) => void;
    deleteSection: (id: string) => void;
    ltoA: (val: string | string[]) => string[];
    getSections: (type: string) => [string, import("../../../types").UciSection][];
    th: string;
    td: string;
  }>();

  // States
  let locale = $state(getLocale());

  // Derives
  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });

  // Effects
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );
</script>

<p class={cn("text-xs", "text-muted", "mb-2")}>
  {trans(
    "List of IP sets to populate with the IPs of DNS lookup results of the FQDNs also specified here.",
  )}<br />{trans(
    "The netfilter components below are only regarded when running fw4.",
  )}
</p>
<div class={cn("flex", "justify-end", "mb-2")}>
  <button
    onclick={() => openIpset()}
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
{#if getSections("ipset").length === 0}
  <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>
    {trans("This section contains no values yet")}
  </p>
{:else}
  <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
    <table class={cn("w-full", "text-xs")}>
      <thead
        ><tr
          class={cn(
            "border-b",
            "text-left",
            "text-muted",
            "bg-surface",
            "border-border",
          )}
        >
          <th class={th}>{trans("Name")}</th>
          <th class={th}>{trans("FQDN")}</th>
          <th class={th}>{trans("Table")}</th>
          <th class={th}>{trans("Family")}</th>
          <th class={th}>{trans("Actions")}</th>
        </tr>
      </thead>
      <tbody>
        {#each getSections("ipset") as [id, sec], i}
          <tr
            class={cn(
              "border-b",
              "border-border",
              "hover:bg-white/4",
              i % 2 === 0 && "bg-white/1.5",
            )}
          >
            <td class={td}>{ltoA(sec.name).join(", ") || "—"}</td>
            <td class={td}>{ltoA(sec.domain).join(", ") || "—"}</td>
            <td class={td}>{sec.table || "—"}</td>
            <td class={td}>{sec.table_family || "inet"}</td>
            <td class={td}>
              <button
                onclick={() => openIpset(id)}
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
                onclick={() => deleteSection(id)}
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
