import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { clsx } from 'clsx'

const MetricCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon, 
  color = 'blue',
  description 
}) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600', 
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600'
  }

  const bgColorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50', 
    orange: 'bg-orange-50',
    red: 'bg-red-50'
  }

  const changeColorClasses = {
    positive: 'text-green-600 bg-green-100',
    negative: 'text-red-600 bg-red-100',
    neutral: 'text-gray-600 bg-gray-100'
  }

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {Icon && (
              <div className={clsx('p-2 rounded-lg', bgColorClasses[color])}>
                <Icon className={clsx('h-5 w-5', colorClasses[color])} />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            
            {change && (
              <div className={clsx(
                'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                changeColorClasses[changeType]
              )}>
                {changeType === 'positive' && <TrendingUp className="h-3 w-3" />}
                {changeType === 'negative' && <TrendingDown className="h-3 w-3" />}
                <span>{change}</span>
              </div>
            )}
          </div>
          
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default MetricCard