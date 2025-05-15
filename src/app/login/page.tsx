import { login, signup } from './actions'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-lg border border-gray-700">
        <h2 className="mb-6 text-center text-2xl font-semibold text-gray-100">Log in/Sign up</h2>
        <form className="space-y-4">
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
              className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 p-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-4 pt-2">
            <button 
              formAction={login}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
              >Log in</button>
            <button 
              formAction={signup}
              className="w-full rounded-md border border-blue-500 bg-gray-800 px-4 py-2 text-blue-400 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
              >Sign up</button>
          </div>
        </form>
      </div>
    </div>
  )
}