import { useState } from 'react'
import './App.css'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const API_BASE = 'http://localhost:8000'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const endpoint = isLogin ? '/login' : '/register'
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.token)
          setMessage('Login successful! Token stored.')
        } else {
          setMessage('Registration successful! Please login.')
          setEmail('')
          setPassword('')
        }
      } else {
        setMessage(data.error || 'Error occurred')
      }
    } catch (error) {
      setMessage('Network error. Is backend running?')
    }

    setLoading(false)
  }

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        {message && <p className="message">{message}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          required
          disabled={loading}
        />
        <div className="button-group">
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setMessage('')
              setEmail('')
              setPassword('')
            }}
            className="register-btn"
            disabled={loading}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default App
