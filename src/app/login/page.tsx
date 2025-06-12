'use client'

import { login, signup } from './actions'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useEffect, useState } from 'react'

function LoadingButton() {
  return (
    <button 
      disabled
      className="w-full rounded-md bg-blue-600 px-4 py-2 text-white opacity-50 cursor-not-allowed"
    >
      <div className="flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        Loading...
      </div>
    </button>
  )
}

function FormButtons() {
  const { pending } = useFormStatus()
  
  if (pending) {
    return <LoadingButton />
  }

  return (
    <>
      <button 
        type="submit"
        name="action"
        value="login"
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
      >
        Log in
      </button>
      <button 
        type="submit"
        name="action"
        value="signup"
        className="w-full rounded-md border border-blue-500 bg-gray-800 px-4 py-2 text-blue-400 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
      >
        Sign up
      </button>
    </>
  )
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [formState, formAction] = useActionState(
    async (prevState: { error: string } | null, formData: FormData) => {
      const action = formData.get('action')
      const result = action === 'signup' 
        ? await signup(formData)
        : await login(formData)
      return result
    },
    null
  )

  useEffect(() => {
    if (formState?.error) {
      setError(formState.error)
    }
  }, [formState])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-lg border border-gray-700">
        <h2 className="mb-6 text-center text-2xl font-semibold text-gray-100">Log in/Sign up</h2>
        <form className="space-y-4" action={formAction}>
          {error && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email:</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 p-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password:</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              minLength={6}
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 p-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-4 pt-2">
            <FormButtons />
          </div>
        </form>
      </div>
    </div>
  )
}