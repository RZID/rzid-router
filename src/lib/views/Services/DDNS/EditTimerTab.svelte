<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    editForm,
    trans,
  }: {
    editForm: any;
    trans: (k: string) => string;
  } = $props();

  const unitOptions = [
    { value: "seconds", label: "seconds" },
    { value: "minutes", label: "minutes" },
    { value: "hours", label: "hours" },
    { value: "days", label: "days" },
  ];

  const retryUnitOptions = [
    { value: "seconds", label: "seconds" },
    { value: "minutes", label: "minutes" },
  ];
</script>

<div class={cn("space-y-4")}>
  <div class={cn("flex", "items-end", "gap-2")}>
    <div class={cn("flex-1")}>
      <Input
        label={trans("Check Interval")}
        bind:value={editForm.check_interval}
        placeholder="10"
      />
    </div>
    <div class={cn("w-28")}>
      <Select
        label={trans("Unit")}
        options={unitOptions.slice(0, 3)}
        bind:value={editForm.check_unit}
      />
    </div>
  </div>
  <div class={cn("flex", "items-end", "gap-2")}>
    <div class={cn("flex-1")}>
      <Input
        label={trans("Force Interval")}
        bind:value={editForm.force_interval}
        placeholder="72"
      />
    </div>
    <div class={cn("w-28")}>
      <Select
        label={trans("Unit")}
        options={unitOptions}
        bind:value={editForm.force_unit}
      />
    </div>
  </div>
  <div class={cn("glass", "p-3")}>
    <span
      class={cn(
        "block",
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "mb-2",
      )}
    >
      {trans("Retry Settings")}
    </span>
    <div class={cn("space-y-3")}>
      <Input
        label={trans("Error Max Retry Counter")}
        bind:value={editForm.retry_max_count}
        placeholder="0"
      />
      <div class={cn("flex", "items-end", "gap-2")}>
        <div class={cn("flex-1")}>
          <Input
            label={trans("Error Retry Interval")}
            bind:value={editForm.retry_interval}
            placeholder="60"
          />
        </div>
        <div class={cn("w-28")}>
          <Select
            label={trans("Unit")}
            options={retryUnitOptions}
            bind:value={editForm.retry_unit}
          />
        </div>
      </div>
    </div>
  </div>
</div>
