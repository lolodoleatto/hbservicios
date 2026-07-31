import { useState } from 'react'
import { auth } from './api'
import Login from './Login'
import Products from './Products'

function App() {
  const [loggedIn, setLoggedIn] = useState(auth.isLoggedIn())

  function handleLogout() {
    auth.logout()
    setLoggedIn(false)
  }

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />
  }

  return <Products onLogout={handleLogout} />
}

export default App
