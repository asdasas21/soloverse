-- Check current JWT secret configuration
SELECT name, setting FROM pg_settings WHERE name LIKE 'supabase%';
