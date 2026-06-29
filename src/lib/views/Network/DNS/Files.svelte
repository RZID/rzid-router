<script lang="ts">
  // Deps
  import { Plus, X } from "@lucide/svelte";

  // Helpers
  import { cn } from "../../../helpers/classname";
  import { getLocale, onLocaleChange, t } from "../../../i18n";

  // Components
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Input from "../../../components/Input/Input.svelte";

  // Props
  let { dnsForm, labelCls, updateList, rmList, addList, newItems } = $props<{
    dnsForm: Record<string, string | boolean | string[]>;
    labelCls: string;
    updateList: (key: string, index: number, value: string) => void;
    rmList: (key: string, index: number) => void;
    addList: (key: string) => void;
    newItems: Record<string, string>;
  }>();

  // States
  let locale = $state(getLocale());

  // Derives
  let trans = $derived.by(() => {
    locale;
    return (k: string) => t(k);
  });

  // Effects
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );
</script>

<Toggle label={trans("Ignore resolv file")} bind:checked={dnsForm.noresolv} />
{#if !dnsForm.noresolv}
  <Input
    label={trans("Resolv file")}
    bind:value={dnsForm.resolvfile}
    placeholder="/tmp/resolv.conf.d/resolv.conf.auto"
    description={trans("File with upstream resolvers.")}
  />
{/if}
<Toggle
  label={trans("Strict order")}
  description={trans(
    "Query upstream resolvers in the order they appear in the resolv file.",
  )}
  bind:checked={dnsForm.strictorder}
/>
<Toggle
  label={trans("Ignore hosts files directory")}
  description={trans(
    "On: use instance specific hosts file only. Off: use all files in the directory including the instance specific hosts file.",
  )}
  bind:checked={dnsForm.ignore_hosts_dir}
/>
<Toggle
  bind:checked={dnsForm.nohosts}
  label={trans("Ignore /etc/hosts file")}
  description={trans("Ignore /etc/hosts file")}
/>
<div>
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class={labelCls}>{trans("Additional hosts files")}</label>
  {#each dnsForm.addnhosts as item, i}
    <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
      <input
        type="text"
        value={item}
        oninput={(e) => updateList("addnhosts", i, e.currentTarget.value)}
        placeholder="/etc/dnsmasq.hosts"
        class={cn(
          "flex-1",
          "px-2.5",
          "py-1.5",
          "border",
          "text-xs",
          "text-fg",
          "font-mono",
          "rounded-md",
          "outline-none",
          "bg-surface",
          "transition-all",
          "border-border",
          "focus:border-(--accent)",
        )}
      />
      <button
        onclick={() => rmList("addnhosts", i)}
        class={cn(
          "p-1.5",
          "rounded",
          "shrink-0",
          "text-muted",
          "cursor-pointer",
          "hover:text-danger",
        )}
      >
        <X size={12} />
      </button>
    </div>
  {/each}
  <div class={cn("flex", "items-center", "gap-1.5")}>
    <input
      type="text"
      bind:value={newItems.addnhosts}
      onkeydown={(e) => {
        if (e.key === "Enter") addList("addnhosts");
      }}
      placeholder="/etc/dnsmasq.hosts"
      class={cn(
        "flex-1",
        "px-2.5",
        "py-1.5",
        "border",
        "text-xs",
        "text-fg",
        "font-mono",
        "rounded-md",
        "bg-surface",
        "outline-none",
        "transition-all",
        "border-border",
        "focus:border-(--accent)",
        "placeholder:text-text-muted",
      )}
    />
    <button
      onclick={() => addList("addnhosts")}
      class={cn(
        "flex",
        "px-2",
        "gap-1",
        "py-1.5",
        "text-xs",
        "shrink-0",
        "rounded-md",
        "bg-accent",
        "font-medium",
        "items-center",
        "text-black",
        "cursor-pointer",
        "hover:opacity-90",
      )}
    >
      <Plus size={12} />
      {trans("Add")}
    </button>
  </div>
</div>
