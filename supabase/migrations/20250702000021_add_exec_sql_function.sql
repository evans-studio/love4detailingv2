-- Create function to execute raw SQL with proper permissions
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;

-- Add RLS policy
ALTER FUNCTION exec_sql SECURITY DEFINER; 