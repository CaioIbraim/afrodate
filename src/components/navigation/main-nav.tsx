import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'

export function MainNavigation() {
  const router = useRouter()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    {
      label: 'Discover',
      href: '/discover',
      icon: '🔍',
      protected: true
    },
    {
      label: 'Messages',
      href: '/messages',
      icon: '💬',
      protected: true
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: '👤',
      protected: true
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: '⚙️',
      protected: true
    }
  ]

  const filteredItems = menuItems.filter(item => 
    !item.protected || (item.protected && user)
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex justify-around items-center">
          {filteredItems.map((item) => (
            <motion.button
              key={item.href}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center p-2 ${
                router.pathname === item.href ? 'text-oraculo-purple' : 'text-gray-500'
              }`}
              onClick={() => router.push(item.href)}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </nav>
  )
}