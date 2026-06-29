<script lang="ts">
  import { cn } from "../../../../helpers/classname";
  import Toggle from "../../../../components/Toggle/Toggle.svelte";
  import Input from "../../../../components/Input/Input.svelte";

  interface Props {
    trans?: (k: string) => string;
    ban_mailnotification?: boolean;
    ban_mailreceiver?: string;
    ban_mailsender?: string;
    ban_mailtopic?: string;
    ban_mailprofile?: string;
  }

  let {
    trans = (k: string) => k,
    ban_mailnotification = $bindable(false),
    ban_mailreceiver = $bindable(""),
    ban_mailsender = $bindable(""),
    ban_mailtopic = $bindable(""),
    ban_mailprofile = $bindable(""),
  }: Props = $props();
</script>

<div class={cn("flex", "items-center", "gap-2")}>
  <span
    class={cn(
      "text-[10px]",
      "uppercase",
      "text-muted",
      "font-semibold",
      "tracking-wider",
    )}>{trans("E-Mail Settings")}</span
  >
</div>
<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "text-muted")}>
  {trans(
    "To enable email notifications, set up the 'msmtp' package and specify a valid E-Mail receiver address.",
  )}
</p>
<div class={cn("h-px", "bg-border")}></div>

<Toggle
  label={trans("E-Mail Notification")}
  bind:checked={ban_mailnotification}
/>
<Input
  label={trans("E-Mail Receiver Address")}
  bind:value={ban_mailreceiver}
  placeholder="name@example.com"
/>
<Input
  label={trans("E-Mail Sender Address")}
  bind:value={ban_mailsender}
  placeholder="no-reply@banIP"
/>
<Input
  label={trans("E-Mail Topic")}
  bind:value={ban_mailtopic}
  placeholder="banIP notification"
/>
<Input
  label={trans("E-Mail Profile")}
  bind:value={ban_mailprofile}
  placeholder="ban_notify"
/>
