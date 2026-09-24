import { useState } from 'react'
import { Loader2, Lock, Mail } from 'lucide-react'
import { auth } from './api'
import hbLogo from './assets/hb-logo.svg'
import { firstMissing } from './validation'

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@hbservicios.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const missing = firstMissing([
      ['Email', email],
      ['Contraseña', password],
    ])
    if (missing) {
      setError(missing)
      return
    }
    setLoading(true)
    try {
      await auth.login(email, password)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-brand-black px-4 overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-[420px] h-[420px] rounded-full bg-brand-red/30 blur-[110px] animate-pulse" />
        <div className="absolute inset-0 m-auto w-[220px] h-[220px] rounded-full bg-brand-red/40 blur-[70px]" />
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative bg-white shadow-2xl shadow-brand-red/20 rounded-2xl p-8 w-full max-w-sm animate-pop"
      >
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-brand-gray flex items-center justify-center mx-auto mb-4">
            <img src={hbLogo} alt="HB Servicios" className="w-14 h-14 rounded-xl" />
          </div>
          <h1 className="text-2xl font-semibold text-brand-black mb-1">HB Servicios</h1>
          <p className="text-slate-500">Iniciar sesión</p>
        </div>

        <label className="block text-sm text-slate-600 mb-1">Email</label>
        <div className="relative mb-4">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red"
          />
        </div>

        <label className="block text-sm text-slate-600 mb-1">Contraseña</label>
        <div className="relative mb-4">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red"
          />
        </div>

        {error && <p className="text-red-600 text-sm mb-4 animate-fade-in-fast">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-brand-red text-white rounded-lg px-3 py-2 font-medium hover:bg-brand-red-dark transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}

export default Login
