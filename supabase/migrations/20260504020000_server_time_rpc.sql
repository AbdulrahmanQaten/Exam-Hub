-- ==========================================
-- Server Time Utility
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN now();
END;
$$;
