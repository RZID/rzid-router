<script lang="ts">
  // Deps
  import { Plus, X } from "@lucide/svelte";

  // Helpers
  import { cn } from "../../../helpers/classname";
  import { getLocale, onLocaleChange, t } from "../../../i18n";

  // Components
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  // Types
  type Props = {
    dnsForm: Record<string, string | boolean | string[]>;
    labelCls: string;
    updateList: (key: string, index: number, value: string) => void;
    rmList: (key: string, index: number) => void;
    addList: (key: string) => void;
    newItems: Record<string, string>;
  };

  // Props
  let { dnsForm, labelCls, updateList, rmList, addList, newItems }: Props =
    $props();

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

<Toggle
  label={trans("Non-wildcard")}
  description={trans(
    "Bind only to configured interface addresses, instead of the wildcard address.",
  )}
  bind:checked={dnsForm.nonwildcard}
/>
<div>
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class={labelCls}>{trans("Listen interfaces")}</label>
  {#each dnsForm.interface as item, i}
    <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
      <input
        type="text"
        value={item}
        oninput={(e) => updateList("interface", i, e.currentTarget.value)}
        class={cn(
          "flex-1",
          "px-2.5",
          "py-1.5",
          "border",
          "text-xs",
          "text-fg",
          "rounded-md",
          "bg-surface",
          "outline-none",
          "transition-all",
          "border-border",
          "focus:border-(--accent)",
        )}
      />
      <button
        onclick={() => rmList("interface", i)}
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
      bind:value={newItems.interface}
      onkeydown={(e) => {
        if (e.key === "Enter") addList("interface");
      }}
      placeholder={trans("(all)")}
      class={cn(
        "border",
        "flex-1",
        "px-2.5",
        "py-1.5",
        "text-xs",
        "text-fg",
        "rounded-md",
        "outline-none",
        "bg-surface",
        "transition-all",
        "border-border",
        "focus:border-(--accent)",
        "placeholder:text-text-muted",
      )}
    />
    <button
      onclick={() => addList("interface")}
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
<div>
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class={labelCls}>{trans("Listen addresses")}</label>
  {#each dnsForm.listen_address as item, i}
    <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
      <input
        type="text"
        value={item}
        oninput={(e) => updateList("listen_address", i, e.currentTarget.value)}
        class={cn(
          "border",
          "flex-1",
          "px-2.5",
          "py-1.5",
          "text-fg",
          "text-xs",
          "font-mono",
          "rounded-md",
          "bg-surface",
          "outline-none",
          "transition-all",
          "border-border",
          "focus:border-(--accent)",
        )}
      />
      <button
        onclick={() => rmList("listen_address", i)}
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
      bind:value={newItems.listen_address}
      onkeydown={(e) => {
        if (e.key === "Enter") addList("listen_address");
      }}
      placeholder="0.0.0.0"
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
        "placeholder:text-text-muted",
      )}
    />
    <button
      onclick={() => addList("listen_address")}
      class={cn(
        "px-2",
        "flex",
        "gap-1",
        "py-1.5",
        "text-xs",
        "shrink-0",
        "rounded-md",
        "bg-accent",
        "font-medium",
        "text-black",
        "items-center",
        "cursor-pointer",
        "hover:opacity-90",
      )}
    >
      <Plus size={12} />
      {trans("Add")}
    </button>
  </div>
</div>
<div>
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class={labelCls}>{trans("Exclude interfaces")}</label>
  {#each dnsForm.notinterface as item, i}
    <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
      <input
        type="text"
        value={item}
        oninput={(e) => updateList("notinterface", i, e.currentTarget.value)}
        class={cn(
          "flex-1",
          "px-2.5",
          "py-1.5",
          "border",
          "text-xs",
          "text-fg",
          "rounded-md",
          "bg-surface",
          "outline-none",
          "transition-all",
          "border-border",
          "focus:border-(--accent)",
        )}
      />
      <button
        onclick={() => rmList("notinterface", i)}
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
      bind:value={newItems.notinterface}
      onkeydown={(e) => {
        if (e.key === "Enter") addList("notinterface");
      }}
      placeholder={trans("(none)")}
      class={cn(
        "flex-1",
        "px-2.5",
        "py-1.5",
        "border",
        "text-xs",
        "text-fg",
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
      onclick={() => addList("notinterface")}
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
        "text-black",
        "items-center",
        "cursor-pointer",
        "hover:opacity-90",
      )}
    >
      <Plus size={12} />{trans("Add")}
    </button>
  </div>
</div>
<div class={cn("flex", "items-center", "gap-2", "opacity-40")}>
  <div class={cn("h-px", "flex-1", "bg-border")}></div>
  <span
    class={cn(
      "uppercase",
      "text-muted",
      "text-[10px]",
      "font-semibold",
      "tracking-wider",
    )}
  >
    {trans("Ports")}
  </span>
  <div class={cn("h-px", "flex-1", "bg-border")}></div>
</div>
<Input
  type="number"
  placeholder="53"
  bind:value={dnsForm.port}
  label={trans("DNS server port")}
  description={trans("Listening port for inbound DNS queries.")}
/>
<Input
  type="number"
  placeholder={trans("any")}
  bind:value={dnsForm.queryport}
  label={trans("DNS query port")}
  description={trans("Fixed source port for outbound DNS queries.")}
/>
{#if !dnsForm.queryport}
  <Input
    type="number"
    placeholder="1024"
    bind:value={dnsForm.minport}
    label={trans("Minimum source port #")}
    description={trans(
      "Min valid value 1024. Useful for systems behind firewalls.",
    )}
  />
  <Input
    type="number"
    placeholder="50000"
    bind:value={dnsForm.maxport}
    label={trans("Maximum source port #")}
    description={trans(
      "Max valid value 65535. Useful for systems behind firewalls.",
    )}
  />
{/if}
