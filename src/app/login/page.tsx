'use client'

import { login, signup } from './actions'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useEffect, useState } from 'react'

function LoadingButton() {
  return (
    <button 
      disabled
      className="w-1/2 mx-auto rounded-md bg-white px-4 py-2 text-black opacity-50 cursor-not-allowed"
    >
      <div className="flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        Loading...
      </div>
    </button>
  )
}

function FormButtons({ activeSwitch } : { activeSwitch : string }) {
  const { pending } = useFormStatus()
  
  if (pending) {
    return <LoadingButton />
  }

  return (
    <>
      {activeSwitch === 'login' ? (
       <button 
       type="submit"
       name="action"
       value="login"
       className="w-1/2 mx-auto rounded-xl bg-white px-4 py-2 text-black hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
     >
       Log in
     </button>
      ) : (
        <button 
        type="submit"
        name="action"
        value="signup"
        className="w-1/2 mx-auto rounded-xl bg-white px-4 py-2 text-black hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
      >
        Sign up
      </button>
      )}
    </>
  )
}

export default function LoginPage() {
  const [activeSwitch, setActiveSwitch] = useState('login')
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
      <div className="w-full max-w-md rounded-xl bg-gray-800 p-8 shadow-lg border border-gray-700">
      <h1 className="text-2xl text-center font-bold mb-7 relative overflow-hidden">
        <div className="inline-flex items-center">
          <span className="inline-block">
            <img src="/angle-glow-icon_light.png" alt="<" className="inline-block h-12 w-12 mr-2" />
          </span>
            <span className="inline-block text-3xl">Angle</span>
          </div>
        <p className="text-xs mt-0.5" style={{ fontSize: 'xx-small' }}>AI Animation Studio</p>
        </h1>        
      <div className="flex justify-center my-3">
      <div className="relative flex bg-gray-200 rounded-full p-1">
        <div
          className={`absolute inset-y-0 ${
            activeSwitch === "login" ? "left-0" : "left-1/2"
              } w-1/2 bg-white rounded-full shadow-md transition-all duration-300`}
            />
            <button
              onClick={() => setActiveSwitch("login")}
              className={`relative z-10 w-24 text-sm font-medium py-2 rounded-full transition-colors duration-200 ${
                activeSwitch === "login" ? "text-black" : "text-gray-500"
              } cursor-pointer`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveSwitch("signup")}
              className={`relative z-10 w-24 text-sm font-medium py-2 rounded-full transition-colors duration-200 ${
                activeSwitch === "signup" ? "text-black" : "text-gray-500 cursor-pointer"
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>
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
          <div className="flex gap-4 pt-5">
            <FormButtons
            activeSwitch={activeSwitch}
            />
          </div>
        </form>
      </div>
    </div>
  )
}