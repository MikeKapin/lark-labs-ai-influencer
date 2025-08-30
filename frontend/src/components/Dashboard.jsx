import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  BarChart3, 
  MessageCircle, 
  CheckCircle,
  Video,
  TrendingUp,
  Clock,
  Globe,
  AlertTriangle,
  Zap
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { useApi } from '../hooks/useApi'
import LoadingSpinner from './common/LoadingSpinner'
import MetricCard from './common/MetricCard'

const Dashboard = () => {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => useApi.get('/analytics/dashboard?period=30'),
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const { data: characterStatus } = useQuery({
    queryKey: ['character-status'],
    queryFn: () => useApi.get('/character/profile'),
    refetchInterval: 60000 // Refresh every minute
  })

  const { data: recentContent } = useQuery({
    queryKey: ['recent-content'],
    queryFn: () => useApi.get('/content/calendar?days=7'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">Failed to load dashboard data. Please refresh the page.</p>
        </div>
      </div>
    )
  }

  const metrics = dashboardData?.engagement_metrics || {}
  const contentMetrics = dashboardData?.content_metrics || {}
  const growthMetrics = dashboardData?.growth_metrics || {}

  // Sample data for charts
  const performanceData = [
    { name: 'Mon', views: 120, engagement: 8.5, clicks: 15 },
    { name: 'Tue', views: 98, engagement: 7.2, clicks: 12 },
    { name: 'Wed', views: 150, engagement: 9.1, clicks: 18 },
    { name: 'Thu', views: 87, engagement: 6.8, clicks: 10 },
    { name: 'Fri', views: 201, engagement: 11.3, clicks: 25 },
    { name: 'Sat', views: 134, engagement: 8.9, clicks: 16 },
    { name: 'Sun', views: 167, engagement: 9.7, clicks: 21 }
  ]

  const contentTypeData = [
    { name: 'Technical', value: contentMetrics.technical_content || 8, color: '#3b82f6' },
    { name: 'Safety', value: contentMetrics.safety_content || 5, color: '#ef4444' },
    { name: 'Customer Service', value: 3, color: '#10b981' },
    { name: 'Industry Updates', value: 2, color: '#f59e0b' }
  ]

  const topContent = dashboardData?.top_performing_content || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of Alex Reid's performance and system health</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm text-gray-500">Last updated</p>
            <p className="text-sm font-medium">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Views"
          value={metrics.total_views?.toLocaleString() || '0'}
          change={growthMetrics.views_growth || '0%'}
          changeType="positive"
          icon={BarChart3}
          color="blue"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${metrics.avg_engagement_rate || '0'}%`}
          change="+0.5%"
          changeType="positive"
          icon={MessageCircle}
          color="green"
        />
        <MetricCard
          title="LARK Labs Clicks"
          value={metrics.lark_labs_clicks?.toLocaleString() || '0'}
          change={growthMetrics.clicks_growth || '0%'}
          changeType="positive"
          icon={Globe}
          color="purple"
        />
        <MetricCard
          title="Content Published"
          value={contentMetrics.published_content || '0'}
          change="+2 this week"
          changeType="positive"
          icon={Video}
          color="orange"
        />
      </div>

      {/* Alex Reid Character Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Performance Trends</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Views</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Engagement</span>
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Character Health */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Alex Reid Health</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Personality Consistency</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '95%'}}></div>
                  </div>
                  <span className="text-sm font-medium">95%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Voice Consistency</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '92%'}}></div>
                  </div>
                  <span className="text-sm font-medium">92%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Technical Accuracy</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '98%'}}></div>
                  </div>
                  <span className="text-sm font-medium">98%</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Overall Health</span>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Excellent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full btn-primary justify-center">
                <Zap className="h-4 w-4" />
                Generate Content
              </button>
              <button className="w-full btn-secondary justify-center">
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </button>
              <button className="w-full btn-secondary justify-center">
                <MessageCircle className="h-4 w-4" />
                Check Engagement
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Type Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Content Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contentTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {contentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px' 
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            {contentTypeData.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Content */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Top Performing Content</h3>
          <div className="space-y-4">
            {topContent.length > 0 ? topContent.slice(0, 5).map((content, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {content.topic}
                  </h4>
                  <p className="text-xs text-gray-500">{content.content_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{content.views || 0} views</p>
                  <p className="text-xs text-gray-500">{content.engagement || 0}% engagement</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Video className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No content yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by generating your first video</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {dashboardData?.recent_activity?.slice(0, 8).map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                {activity.activity_type === 'content_created' ? (
                  <Video className="h-5 w-5 text-blue-500" />
                ) : (
                  <BarChart3 className="h-5 w-5 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {activity.activity_type === 'content_created' ? 'Created content: ' : 'Research completed: '}
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          )) || (
            <div className="text-center py-8 text-gray-500">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard