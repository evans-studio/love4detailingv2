/**
 * Session Reset Utility
 * Provides functions to clear authentication state and handle session issues
 */

import { createClient } from '@supabase/supabase-js'

export function clearBrowserAuthState() {
  if (typeof window === 'undefined') return
  
  try {
    // Clear localStorage
    const localStorageKeysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        localStorageKeysToRemove.push(key)
      }
    }
    localStorageKeysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`Cleared localStorage key: ${key}`)
    })
    
    // Clear sessionStorage
    const sessionStorageKeysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        sessionStorageKeysToRemove.push(key)
      }
    }
    sessionStorageKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key)
      console.log(`Cleared sessionStorage key: ${key}`)
    })
    
    console.log('✅ Browser auth state cleared')
  } catch (error) {
    console.error('Error clearing browser auth state:', error)
  }
}

export async function forceSignOut() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    await supabase.auth.signOut()
    clearBrowserAuthState()
    
    console.log('✅ Force sign out completed')
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  } catch (error) {
    console.error('Error during force sign out:', error)
    
    // Even if sign out fails, clear browser state and redirect
    clearBrowserAuthState()
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  }
}

export function addSessionResetButton() {
  if (typeof window === 'undefined') return
  
  // Add a debug button to the page for easy session reset
  const resetButton = document.createElement('button')
  resetButton.textContent = 'Reset Session'
  resetButton.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    background: #ff4444;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `
  resetButton.onclick = forceSignOut
  
  document.body.appendChild(resetButton)
  
  // Remove after 10 seconds
  setTimeout(() => {
    if (resetButton.parentNode) {
      resetButton.parentNode.removeChild(resetButton)
    }
  }, 10000)
}

// Add to window for console access
if (typeof window !== 'undefined') {
  ;(window as any).clearAuthState = clearBrowserAuthState
  ;(window as any).forceSignOut = forceSignOut
}