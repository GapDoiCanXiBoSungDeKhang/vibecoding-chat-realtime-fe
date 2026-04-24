import React from 'react'
import AuthPage from './AuthPage'
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <div className="App">
      <Toaster 
        position="top-right" 
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '10px',
            fontSize: '14px',
          },
        }} 
      />
      <AuthPage />
    </div>
  )
}

export default App
