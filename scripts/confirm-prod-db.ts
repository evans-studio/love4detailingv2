import { validateConnection } from '../src/lib/supabase';

async function run() {
  const isConnected = await validateConnection();
  if (!isConnected) {
    process.exit(1);
  }
}

run().catch(error => {
  console.error('Failed to run connection test:', error);
  process.exit(1);
}); 