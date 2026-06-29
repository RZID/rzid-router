<script lang="ts">
  import { Shield } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  let {
    config_file,
    config_file_err,
    work_dir,
    work_dir_err,
    user,
    group,
    verbose,
    validateConfigFile,
    validateWorkDir,
    trans,
  }: {
    config_file: string;
    config_file_err: string;
    work_dir: string;
    work_dir_err: string;
    user: string;
    group: string;
    verbose: boolean;
    validateConfigFile: (v: string) => string;
    validateWorkDir: (v: string) => string;
    trans: (k: string) => string;
  } = $props();

  const DEFAULT_CONFIG_FILE = "/etc/adguardhome/adguardhome.yaml";
  const DEFAULT_WORK_DIR = "/var/lib/adguardhome";
  const DEFAULT_USER = "adguardhome";
  const DEFAULT_GROUP = "adguardhome";
</script>

<div class={cn("space-y-5")}>
  <div class={cn("flex", "items-center", "gap-2")}>
    <Shield size={14} class={cn("text-accent")} />
    <span
      class={cn(
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
      )}>{trans("General Settings")}</span
    >
  </div>
  <div class={cn("h-px", "bg-border")}></div>
  <Input
    label={trans("Configuration file")}
    bind:value={config_file}
    placeholder={DEFAULT_CONFIG_FILE}
    oninput={() => {
      config_file_err = validateConfigFile(config_file);
    }}
  />
  {#if config_file_err}
    <p class={cn("text-[10px]", "text-danger", "mt-1")}>{config_file_err}</p>
  {:else}
    <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
      {trans(
        "Configuration file must be stored in its own directory, and not in '/etc'.",
      )}<br />{trans("Parent directory will be owned by the service user.")}<br
      />{trans("If empty, defaults to")} '{DEFAULT_CONFIG_FILE}'.
    </p>
  {/if}
  <Input
    label={trans("Working directory")}
    bind:value={work_dir}
    placeholder={DEFAULT_WORK_DIR}
    oninput={() => {
      work_dir_err = validateWorkDir(work_dir);
    }}
  />
  {#if work_dir_err}
    <p class={cn("text-[10px]", "text-danger", "mt-1")}>{work_dir_err}</p>
  {:else}
    <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
      {trans("Directory where filters, logs, and statistics are stored.")}<br
      />{trans("Will be owned by the service user.")}<br />{trans(
        "If empty, defaults to",
      )} '{DEFAULT_WORK_DIR}'.
    </p>
  {/if}
  <div class={cn("grid", "grid-cols-2", "gap-4")}>
    <Input
      label={trans("Service user")}
      bind:value={user}
      placeholder={DEFAULT_USER}
    />
    <Input
      label={trans("Service group")}
      bind:value={group}
      placeholder={DEFAULT_GROUP}
    />
  </div>
  <div class={cn("h-px", "bg-border")}></div>
  <Toggle
    label={trans("Verbose logging")}
    bind:checked={verbose}
    description={trans("Enable verbose logging for troubleshooting")}
  />
</div>
