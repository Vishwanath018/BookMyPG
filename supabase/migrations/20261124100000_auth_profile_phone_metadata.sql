-- Ensure email-based customer and owner signups
-- populate the profile phone column from Auth metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    requested_role TEXT;
BEGIN
    requested_role :=
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'customer');

    IF requested_role NOT IN ('customer', 'owner') THEN
        requested_role := 'customer';
    END IF;

    INSERT INTO public.profiles (
        id,
        full_name,
        phone,
        avatar_url,
        role
    )
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data ->> 'full_name',
            NEW.raw_user_meta_data ->> 'name',
            ''
        ),
        COALESCE(
            NEW.phone,
            NEW.raw_user_meta_data ->> 'phone'
        ),
        NEW.raw_user_meta_data ->> 'avatar_url',
        requested_role
    );

    RETURN NEW;
END;
$$;
