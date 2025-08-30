import React from 'react'
import { BarChart3, TrendingUp, Users, MessageCircle, Globe } from 'lucide-react'

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Detailed performance analytics and insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">25,847</p>
              <p className="text-xs text-green-600">+12.5% from last month</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Engagement Rate</p>
              <p className="text-2xl font-bold text-gray-900">8.9%</p>
              <p className="text-xs text-green-600">+0.8% from last month</p>
            </div>
            <MessageCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">3,421</p>
              <p className="text-xs text-green-600">+156 this month</p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">LARK Labs CTR</p>
              <p className="text-2xl font-bold text-gray-900">12.3%</p>
              <p className="text-xs text-green-600">+2.1% from last month</p>
            </div>
            <Globe className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Detailed Analytics Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            Advanced charts, audience insights, and performance trends will be available here
          </p>
        </div>
      </div>
    </div>
  )
}

export default Analytics