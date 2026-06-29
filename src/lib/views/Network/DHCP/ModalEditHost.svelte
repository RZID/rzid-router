<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { X, Save } from "@lucide/svelte";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  let {
    trans,
    editing = $bindable<{ section: string; type: string } | null>(null),
    form = $bindable<Record<string, any>>({}),
    busy = {} as Record<string, string>,
    onsave,
  }: {
    trans: (k: string) => string;
    editing: { section: string; type: string } | null;
    form: Record<string, any>;
    busy?: Record<string, string>;
    onsave?: () => void;
  } = $props();

  let close = () => {
    editing = null;
  };
</script>

{#if editing}
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class={cn(
      "z-50",
      "flex",
      "pt-12",
      "fixed",
      "inset-0",
      "items-start",
      "justify-center",
    )}
    onclick={close}
    role="dialog"
    aria-modal="true"
  >
    <div
      class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")}
    ></div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={(e: MouseEvent) => e.stopPropagation()}
      class={cn(
        "p-5",
        "glass",
        "w-full",
        "relative",
        "max-w-lg",
        "rounded-xl",
        "shadow-2xl",
        "max-h-[85vh]",
        "overflow-y-auto",
        "animate-fade-in",
      )}
    >
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>
          {trans("Edit static lease")}:
          <span class={cn("font-mono", "text-accent")}>{editing.section}</span>
        </h2>
        <button
          onclick={close}
          class={cn(
            "p-1",
            "rounded",
            "text-muted",
            "hover:text-fg",
            "cursor-pointer",
          )}
        >
          <X size={14} />
        </button>
      </div>
      <div class={cn("space-y-4")}>
        <Input
          placeholder="myhost"
          bind:value={form.name}
          label={trans("Hostname")}
          description={trans("The hostname for this host (optional).")}
        />
        <Input
          bind:value={form.mac}
          label={trans("MAC Addresses")}
          placeholder="xx:xx:xx:xx:xx:xx"
          description={trans(
            "MAC address(es) of this host. Separate multiple with spaces.",
          )}
        />
        <Input
          bind:value={form.ip}
          placeholder="192.168.1.100"
          label={trans("IPv4 address")}
          description={trans(
            "The IPv4 address for this host, or 'ignore' to ignore DHCP requests.",
          )}
        />
        <Select
          label={trans("Lease time")}
          bind:value={form.leasetime}
          placeholder={trans("Select...")}
          options={[
            { value: "", label: trans("(default)") },
            { value: "5m", label: "5m (5 minutes)" },
            { value: "3h", label: "3h (3 hours)" },
            { value: "12h", label: "12h (12 hours - default)" },
            { value: "7d", label: "7d (7 days)" },
            { value: "infinite", label: trans("infinite") },
          ]}
        />
        <Input
          bind:value={form.duid}
          label={trans("DUID/IAIDs")}
          placeholder="00:01:00:01:..."
          description={trans(
            "DHCPv6 DUIDs and optional IAIDs. Separate multiple with spaces.",
          )}
        />
        <Input
          placeholder="::1"
          bind:value={form.hostid}
          label={trans("IPv6 Token")}
          description={trans("The hexadecimal IPv6 token for this host.")}
        />
        <Input
          bind:value={form.tag}
          label={trans("Set Tag")}
          description={trans("Additional tags for this host.")}
        />
        <Input
          label={trans("Match Tag")}
          bind:value={form.match_tag}
          description={trans("Tags to match for this host.")}
        />
        <Input
          label={trans("Instance")}
          bind:value={form.instance}
          description={trans("Dnsmasq instance to bind to.")}
        />
        <Toggle label={trans("Broadcast")} bind:checked={form.broadcast} />
        <Toggle
          bind:checked={form.dns}
          label={trans("Forward/reverse DNS")}
          description={trans(
            "Add static forward and reverse DNS entries for this host.",
          )}
        />
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-5")}>
        <button
          onclick={close}
          class={cn(
            "px-3",
            "py-1.5",
            "border",
            "text-xs",
            "text-muted",
            "rounded-lg",
            "hover:text-fg",
            "bg-surface-2",
            "border-border",
            "cursor-pointer",
          )}
        >
          {trans("Cancel")}
        </button>
        <button
          onclick={onsave}
          disabled={busy[editing.section] !== undefined}
          class={cn(
            "flex",
            "px-3",
            "py-1.5",
            "gap-1.5",
            "text-xs",
            "bg-accent",
            "rounded-lg",
            "items-center",
            "text-black",
            "cursor-pointer",
            "hover:opacity-90",
            "disabled:opacity-50",
          )}
        >
          <Save size={12} />{trans("Save")}
        </button>
      </div>
    </div>
  </div>
{/if}
