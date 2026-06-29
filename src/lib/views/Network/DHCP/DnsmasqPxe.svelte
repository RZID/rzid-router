<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { Plus, Pencil, Trash2 } from "@lucide/svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Input from "../../../components/Input/Input.svelte";
  import SectionHeader from "../../../components/SectionHeader/SectionHeader.svelte";

  let {
    trans,
    dnsmasqForm = $bindable<Record<string, any>>({}),
    bootSections = [] as [string, any][],
    busy = {} as Record<string, string>,
    onopenboot,
    ondelete,
  }: {
    trans: (k: string) => string;
    dnsmasqForm: Record<string, any>;
    bootSections?: [string, any][];
    busy?: Record<string, string>;
    onopenboot?: (section?: string) => void;
    ondelete?: (section: string) => void;
  } = $props();

  let th = "text-xs font-medium pb-2 px-3 text-left whitespace-nowrap";
  let td = "py-1.5 px-3 text-xs font-mono whitespace-nowrap";
</script>

<div class={cn("space-y-4")}>
  <Toggle
    label={trans("Enable TFTP server")}
    bind:checked={dnsmasqForm.enable_tftp}
    description={trans("Enable the built-in single-instance TFTP server.")}
  />
  <Input
    label={trans("TFTP server root")}
    bind:value={dnsmasqForm.tftp_root}
    placeholder="/"
    description={trans("Root directory for files served via TFTP.")}
  />
  <Input
    bind:value={dnsmasqForm.dhcp_boot}
    label={trans("Network boot image")}
    placeholder="pxelinux.0"
    description={trans("Filename of the boot image advertised to clients.")}
  />

  <SectionHeader title={trans("PXE Boot Options")} open={true}>
    {#if bootSections.length === 0}
      <p class={cn("text-xs", "text-muted", "italic", "py-2")}>
        {trans("No boot options")}
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
              <th class={th}>{trans("Filename")}</th>
              <th class={th}>{trans("Server name")}</th>
              <th class={th}>{trans("Server address")}</th>
              <th class={th}>{trans("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {#each bootSections as [name, sec], i}
              <tr
                class={cn(
                  "border-b",
                  "border-border",
                  "hover:bg-white/4",
                  i % 2 === 0 && "bg-white/1.5",
                )}
              >
                <td class={td}>{sec.filename || "—"}</td>
                <td class={td}>{sec.servername || "—"}</td>
                <td class={td}>{sec.serveraddress || "—"}</td>
                <td class={td}>
                  <button
                    onclick={() => onopenboot?.(name)}
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
      onclick={() => onopenboot?.()}
      class={cn(
        "flex",
        "mt-2",
        "gap-1",
        "text-xs",
        "items-center",
        "text-accent",
        "cursor-pointer",
        "hover:underline",
      )}
    >
      <Plus size={11} />{trans("Add boot option")}
    </button>
  </SectionHeader>
</div>
