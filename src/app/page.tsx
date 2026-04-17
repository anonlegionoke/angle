import { createClient } from '@/utils/supabase/server'
import LandingPage from "@/components/LandingPage"
import PublicLanding from "@/components/PublicLanding"

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return <LandingPage />
  }

  return <PublicLanding />
}