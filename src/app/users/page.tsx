import { createClient } from '@/utils/supabase/server';

export default async function Users() {
  const supabase = await createClient();
  const { data: users } = await supabase.from("users").select();

  return <pre>{JSON.stringify(users, null, 2)}</pre>
}