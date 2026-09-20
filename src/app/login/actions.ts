'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error: signUpError } = await supabase.auth.signUp(data)

  if (signUpError) {
    return { error: signUpError.message }
  }

  // Force sign-in immediately after sign-up to ensure session is active
  // This helps when Supabase doesn't auto-login after sign-up in some configs
  const { error: signInError } = await supabase.auth.signInWithPassword(data)
  
  if (signInError) {
    return { error: signInError.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}