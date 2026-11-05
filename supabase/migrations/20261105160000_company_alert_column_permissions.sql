-- Companies uses column-level grants to keep AI keys private.
-- New alert columns need their own grants; existing RLS policies still apply.
GRANT SELECT (report_alert_threshold, report_alert_window_days)
  ON public.companies TO authenticated;

GRANT UPDATE (report_alert_threshold, report_alert_window_days)
  ON public.companies TO authenticated;
