import React from 'react'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'

function App() {
  const { isAuthenticated } = useAuth();

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
      {isAuthenticated ? (
        <ChatPage />
      ) : (
        <AuthPage />
      )}
    </div>
  )
}

export default App
