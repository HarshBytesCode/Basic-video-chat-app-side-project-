import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { useEffect } from 'react'
import { connectWs } from './main'

function App() {
  const [count, setCount] = useState(false)
  useEffect(() => {
    if(count) {
      connectWs()
    }
    setCount(true)
  }, [count])

  return (
    <>
      <div>
        Heyy
      </div>
    </>
  )
}

export default App
