import React from 'react'
import { Search, TrendingUp, Globe, AlertTriangle } from 'lucide-react'

const Research = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Research & Trends</h1>
          <p className="text-gray-600">HVAC industry research and trending topics</p>
        </div>
        <button className="btn-primary">
          <Search className="h-4 w-4" />
          Start Research
        </button>
      </div>

      <div className="card">
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Research Tools Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            Industry trend analysis, Canadian regulation tracking, and content research tools
          </p>
        </div>
      </div>
    </div>
  )
}

export default Research