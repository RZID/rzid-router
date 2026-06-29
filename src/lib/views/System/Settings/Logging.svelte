<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    logSize,
    logIp,
    logPort,
    logProto,
    logFile,
    conloglevel,
    cronloglevel,
    trans,
  }: any = $props();
</script>

<div class={cn("space-y-4")}>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Input
      label={trans("System log buffer size (kiB)")}
      type="number"
      bind:value={logSize}
      placeholder="128"
      class={cn("max-w-xs")}
    />
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <span
      class={cn(
        "block",
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "mb-1.5",
      )}>{trans("External system log server")}</span
    >
    <div class={cn("flex", "flex-wrap", "items-center", "gap-2")}>
      <Input bind:value={logIp} placeholder="0.0.0.0" class={cn("w-44")} />
      <span class={cn("text-xs", "text-muted")}>:</span>
      <Input
        type="number"
        bind:value={logPort}
        placeholder="514"
        class={cn("w-24")}
      />
      <Select
        options={[
          { value: "udp", label: "UDP" },
          { value: "tcp", label: "TCP" },
        ]}
        bind:value={logProto}
        class={cn("w-20")}
      />
    </div>
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Input
      label={trans("Write system log to file")}
      bind:value={logFile}
      placeholder="/tmp/system.log"
      class={cn("max-w-sm")}
      mono
    />
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Select
      label={trans("Log output level")}
      options={[
        { value: "8", label: trans("Debug") },
        { value: "7", label: trans("Info") },
        { value: "6", label: trans("Notice") },
        { value: "5", label: trans("Warning") },
        { value: "4", label: trans("Error") },
        { value: "3", label: trans("Critical") },
        { value: "2", label: trans("Alert") },
        { value: "1", label: trans("Emergency") },
      ]}
      bind:value={conloglevel}
    />
    <p class={cn("text-[10px]", "text-muted", "mt-1")}>
      {trans("Only affects dmesg kernel log")}
    </p>
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Select
      label={trans("Cron Log Level")}
      options={[
        { value: "7", label: trans("Normal") },
        { value: "9", label: trans("Disabled") },
        { value: "5", label: trans("Debug") },
      ]}
      bind:value={cronloglevel}
    />
  </div>
</div>
