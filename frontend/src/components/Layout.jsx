import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Video, 
  BarChart3, 
  User, 
  Search, 
  Share2, 
  MessageCircle, 
  Settings,
  CircleDot,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

const Layout = ({ children }) => {
  const location = useLocation()
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Content Pipeline', href: '/content', icon: Video },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Alex Reid Profile', href: '/character', icon: User },
    { name: 'Research', href: '/research', icon: Search },
    { name: 'Social Media', href: '/social', icon: Share2 },
    { name: 'Engagement', href: '/engagement', icon: MessageCircle },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">LARK Labs AI Influencer</h1>
                  <p className="text-sm text-gray-500">Alex Reid - HVAC Education System</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* System Status */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <CircleDot className="h-3 w-3 text-green-500" />
                  <span className="text-sm text-gray-600">System Active</span>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                <Link 
                  to="/content"
                  className="btn-primary text-sm"
                >
                  <Video className="h-4 w-4" />
                  Generate Content
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.href)
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          
          {/* System Health Widget */}
          <div className="p-4 border-t border-gray-200 mt-8">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">System Health</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-green-700">
                  <span>AI Engine</span>
                  <span>Healthy</span>
                </div>
                <div className="flex justify-between text-xs text-green-700">
                  <span>Character</span>
                  <span>95% Consistent</span>
                </div>
                <div className="flex justify-between text-xs text-green-700">
                  <span>Content Queue</span>
                  <span>3 Ready</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout