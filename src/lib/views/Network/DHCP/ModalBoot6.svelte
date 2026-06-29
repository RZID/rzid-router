<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { Save } from "@lucide/svelte";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    trans,
    editingBoot6 = $bindable<string | null>(null),
    boot6Form = $bindable<Record<string, any>>({}),
    onsave,
  }: {
    trans: (k: string) => string;
    editingBoot6: string | null;
    boot6Form: Record<string, any>;
    onsave?: () => void;
  } = $props();

  let close = () => {
    editingBoot6 = null;
  };
</script>

{#if editingBoot6}
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class={cn(
      "z-50",
      "flex",
      "fixed",
      "pt-24",
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
        "max-w-md",
        "rounded-xl",
        "shadow-2xl",
        "animate-fade-in",
      )}
    >
      <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-4")}>
        {trans("Edit PXE over IPv6 boot entry")}
      </h2>
      <div class={cn("space-y-4")}>
        <Input
          label={trans("URL")}
          bind:value={boot6Form.url}
          placeholder="tftp://[fd11::1]/pxe.efi"
        />
        <Select
          label={trans("Architecture")}
          bind:value={boot6Form.arch}
          options={[
            { value: "", label: trans("(default)") },
            { value: "0", label: "00: x86 BIOS" },
            { value: "6", label: "06: x86 UEFI (IA32)" },
            { value: "7", label: "07: x64 UEFI" },
            { value: "10", label: "10: ARM 32-bit UEFI" },
            { value: "11", label: "11: ARM 64-bit UEFI" },
            { value: "15", label: "15: x86 UEFI boot from HTTP" },
            { value: "16", label: "16: x64 UEFI boot from HTTP" },
            { value: "17", label: "17: ebc boot from HTTP" },
            { value: "18", label: "18: ARM UEFI 32 boot from HTTP" },
            { value: "19", label: "19: ARM UEFI 64 boot from HTTP" },
            { value: "20", label: "20: pc/at bios boot from HTTP" },
            { value: "21", label: "21: ARM 32 uboot" },
            { value: "22", label: "22: ARM 64 uboot" },
            { value: "23", label: "23: ARM uboot 32 boot from HTTP" },
            { value: "24", label: "24: ARM uboot 64 boot from HTTP" },
            { value: "25", label: "25: RISC-V 32-bit UEFI" },
            { value: "26", label: "26: RISC-V 32-bit UEFI boot from HTTP" },
            { value: "27", label: "27: RISC-V 64-bit UEFI" },
            { value: "28", label: "28: RISC-V 64-bit UEFI boot from HTTP" },
            { value: "29", label: "29: RISC-V 128-bit UEFI" },
            { value: "30", label: "30: RISC-V 128-bit UEFI boot from HTTP" },
            { value: "31", label: "31: s390 Basic" },
            { value: "32", label: "32: s390 Extended" },
            { value: "33", label: "33: MIPS 32-bit UEFI" },
            { value: "34", label: "34: MIPS 64-bit UEFI" },
            { value: "35", label: "35: Sunway 32-bit UEFI" },
            { value: "36", label: "36: Sunway 64-bit UEFI" },
            { value: "37", label: "37: LoongArch 32-bit UEFI" },
            { value: "38", label: "38: LoongArch 32-bit UEFI boot from HTTP" },
            { value: "39", label: "39: LoongArch 64-bit UEFI" },
            { value: "40", label: "40: LoongArch 64-bit UEFI boot from HTTP" },
            { value: "41", label: "41: ARM rpiboot" },
          ]}
          placeholder={trans("Select...")}
        />
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-4")}>
        <button
          onclick={close}
          class={cn(
            "px-3",
            "py-1.5",
            "border",
            "text-xs",
            "text-muted",
            "rounded-lg",
            "bg-surface-2",
            "cursor-pointer",
            "border-border",
          )}
        >
          {trans("Cancel")}
        </button>
        <button
          onclick={onsave}
          class={cn(
            "px-3",
            "py-1.5",
            "text-xs",
            "rounded-lg",
            "bg-accent",
            "text-black",
            "cursor-pointer",
          )}
        >
          <Save size={12} />{trans("Save")}
        </button>
      </div>
    </div>
  </div>
{/if}
