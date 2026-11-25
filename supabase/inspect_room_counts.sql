SELECT
    (SELECT COUNT(*) FROM public.rooms) AS total_rooms,
    (SELECT COUNT(*) FROM public.rooms WHERE is_active = TRUE) AS active_rooms,
    (SELECT COUNT(*) FROM public.room_rates) AS total_rates,
    (SELECT COUNT(*) FROM public.room_rates
      WHERE is_available = TRUE
      AND stay_duration = 'monthly') AS available_monthly_rates;
