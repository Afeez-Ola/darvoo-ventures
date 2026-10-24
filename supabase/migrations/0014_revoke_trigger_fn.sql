-- The order notification trigger function is only for the trigger, never for API calls.
revoke execute on function public.notify_order_change() from public, anon, authenticated;
