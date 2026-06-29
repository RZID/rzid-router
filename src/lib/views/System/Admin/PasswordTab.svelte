<script lang="ts">
  import { KeyRound, Save } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import { setPassword } from "../../../api/ubus";

  let {
    hasUhttpd,
    knownUsers,
    trans,
  }: {
    hasUhttpd: boolean;
    knownUsers: string[];
    trans: (k: string) => string;
  } = $props();
  let emitFeedback = $state<(msg: string, type: "success" | "error") => void>(
    () => {},
  );

  let saving = $state(false);
  let pwRpcd = $state(false);
  let pwRpcUser = $state("root");
  let pwUser = $state("root");
  let pwOld = $state("");
  let pwNew = $state("");
  let pwConfirm = $state("");

  const pwStrength = $derived.by(() => {
    const v = pwNew;
    if (!v) return { label: "", color: "" };
    if (/^(?=.{8,})(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*\W).*$/.test(v))
      return { label: "Strong", color: "var(--accent)" };
    if (
      /^(?=.{7,})(((?=.*[A-Z])(?=.*[a-z]))|((?=.*[A-Z])(?=.*[0-9]))|((?=.*[a-z])(?=.*[0-9]))).*$/.test(
        v,
      )
    )
      return { label: "Medium", color: "var(--warn)" };
    if (/(?=.{6,}).*/.test(v)) return { label: "Weak", color: "var(--danger)" };
    return { label: "Too short", color: "var(--danger)" };
  });

  const savePassword = async () => {
    if (pwRpcd && !pwOld) {
      emitFeedback("Old password required for rpcd user", "error");
      return;
    }
    if (!pwNew) {
      emitFeedback("New password required", "error");
      return;
    }
    if (pwNew !== pwConfirm) {
      emitFeedback("Passwords do not match", "error");
      return;
    }
    saving = true;
    const user = pwRpcd ? pwRpcUser : pwUser;
    const res = await setPassword(user, pwNew, pwOld, pwRpcd);
    if (res?.result) {
      emitFeedback("Password changed successfully", "success");
      pwOld = pwNew = pwConfirm = "";
    } else {
      emitFeedback("Password change failed", "error");
    }
    saving = false;
  };

  const sectionLabel =
    "inline-flex items-center gap-1.5 text-[10px] uppercase text-muted font-semibold tracking-wider mb-1.5";
  const btnBase =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 cursor-pointer select-none";
  const btnPrimary = (d: boolean) =>
    cn(
      btnBase,
      d
        ? "border text-muted bg-surface-3 border-transparent cursor-not-allowed"
        : "border text-accent bg-accent/10 border-accent/20",
    );
</script>

<div class={cn("space-y-4", "max-w-lg")}>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <div class={cn("flex", "items-center", "gap-2", "mb-4")}>
      <KeyRound size={14} class={cn("text-accent")} />
      <span class={sectionLabel}>{trans("Change Password")}</span>
    </div>
    {#if hasUhttpd}
      <div class={cn("mb-4")}>
        <Toggle
          label={trans("Change password for rpcd user")}
          bind:checked={pwRpcd}
        />
      </div>
      {#if pwRpcd}
        <div class={cn("space-y-3", "mb-4")}>
          <Select
            label={trans("rpcd Username")}
            options={knownUsers
              .filter((u) => u !== "root")
              .map((u) => ({ value: u, label: u }))}
            bind:value={pwRpcUser}
          />
          <Input
            label={trans("Old Password")}
            type="password"
            bind:value={pwOld}
            placeholder="••••••••"
          />
        </div>
      {:else}
        <div class={cn("mb-4")}>
          <Select
            label={trans("Router Username")}
            options={knownUsers.map((u) => ({ value: u, label: u }))}
            bind:value={pwUser}
          />
        </div>
      {/if}
    {:else}
      <div class={cn("mb-4")}>
        <Select
          label={trans("Router Username")}
          options={knownUsers.map((u) => ({ value: u, label: u }))}
          bind:value={pwUser}
        />
      </div>
    {/if}
    <div class={cn("space-y-3")}>
      <div>
        <Input
          label={trans("New Password")}
          type="password"
          bind:value={pwNew}
          placeholder="••••••••"
        />
        {#if pwNew}
          <div class={cn("flex", "items-center", "gap-2", "mt-1")}>
            <div
              class={cn(
                "h-1",
                "rounded-full",
                "transition-all",
                "duration-300",
              )}
              style={`width: ${pwStrength.label === "Strong" ? "100%" : pwStrength.label === "Medium" ? "66%" : pwStrength.label === "Weak" ? "33%" : "10%"}; background: ${pwStrength.color};`}
            ></div>
            <span
              class={cn("text-[10px]", "font-mono")}
              style="color: {pwStrength.color}">{pwStrength.label}</span
            >
          </div>
        {/if}
      </div>
      <Input
        label={trans("Confirmation")}
        type="password"
        bind:value={pwConfirm}
        placeholder="••••••••"
      />
    </div>
    <div class={cn("flex", "items-center", "gap-2", "mt-4")}>
      <button
        onclick={savePassword}
        disabled={saving}
        class={btnPrimary(saving)}
      >
        {#if saving}<Save size={12} class={cn("animate-pulse")} />{:else}<Save
            size={12}
          />{/if}
        {saving ? trans("Saving…") : trans("Save & Apply")}
      </button>
    </div>
  </div>
</div>
