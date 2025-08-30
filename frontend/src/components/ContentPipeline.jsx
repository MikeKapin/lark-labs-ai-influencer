import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Play, 
  Pause, 
  Upload, 
  Settings, 
  MoreHorizontal,
  Calendar,
  Clock,
  Eye,
  MessageSquare,
  TrendingUp,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit3
} from 'lucide-react'
import { contentApi } from '../hooks/useApi'
import { toast } from 'react-hot-toast'
import LoadingSpinner from './common/LoadingSpinner'

const ContentPipeline = () => {
  const [selectedContentType, setSelectedContentType] = useState('all')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: contentData, isLoading } = useQuery({
    queryKey: ['content-calendar'],
    queryFn: () => contentApi.getCalendar({ days: 30 }),
    refetchInterval: 30000
  })

  const generateContentMutation = useMutation({
    mutationFn: contentApi.generateContent,
    onSuccess: (data) => {
      toast.success('Content generated successfully!')
      queryClient.invalidateQueries(['content-calendar'])
      setShowGenerateModal(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate content')
    }
  })

  const publishContentMutation = useMutation({
    mutationFn: ({ id, platforms }) => contentApi.publishContent(id, platforms),
    onSuccess: () => {
      toast.success('Content published successfully!')
      queryClient.invalidateQueries(['content-calendar'])
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to publish content')
    }
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'ready':
        return <Play className="h-4 w-4 text-blue-600" />
      case 'generating':
        return <div className="animate-spin"><Pause className="h-4 w-4 text-yellow-600" /></div>
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'ready':
        return 'bg-blue-100 text-blue-800'
      case 'generating':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const contentTypes = [
    { value: 'all', label: 'All Content' },
    { value: 'technical', label: 'Technical' },
    { value: 'safety', label: 'Safety' },
    { value: 'customer_service', label: 'Customer Service' },
    { value: 'industry_update', label: 'Industry Updates' },
    { value: 'wellness', label: 'Wellness' }
  ]

  const filteredContent = selectedContentType === 'all' 
    ? contentData?.content || []
    : (contentData?.content || []).filter(item => item.content_type === selectedContentType)

  const handleGenerateContent = (formData) => {
    generateContentMutation.mutate({
      force_topic: formData.topic || null,
      content_type: formData.content_type || null,
      canadian_focus: formData.canadian_focus,
      generate_audio: formData.generate_audio,
      difficulty_level: formData.difficulty_level
    })
  }

  const handlePublishContent = (contentId, platforms = ['youtube']) => {
    publishContentMutation.mutate({ id: contentId, platforms })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" text="Loading content pipeline..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Pipeline</h1>
          <p className="text-gray-600">Manage Alex Reid's educational content creation and publishing</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={selectedContentType}
            onChange={(e) => setSelectedContentType(e.target.value)}
            className="select-field"
          >
            {contentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn-primary"
            disabled={generateContentMutation.isPending}
          >
            {generateContentMutation.isPending ? (
              <LoadingSpinner size="small" color="white" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Generate Content
          </button>
        </div>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Content</p>
              <p className="text-2xl font-bold text-gray-900">{filteredContent.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredContent.filter(c => c.status === 'published').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready to Publish</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredContent.filter(c => c.status === 'ready').length}
              </p>
            </div>
            <Play className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Views</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(filteredContent.reduce((sum, c) => sum + (c.analytics?.total_views || 0), 0) / filteredContent.length) || 0}
              </p>
            </div>
            <Eye className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Content Queue</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {filteredContent.length > 0 ? (
          <div className="space-y-4">
            {filteredContent.map((content) => (
              <div key={content.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(content.status)}
                      <h4 className="text-lg font-medium text-gray-900">
                        {content.topic}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(content.status)}`}>
                        {content.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span className="capitalize">{content.content_type?.replace('_', ' ')}</span>
                      <span>Difficulty: {content.difficulty_level}/5</span>
                      {content.canadian_specific && (
                        <span className="inline-flex items-center text-blue-600">
                          🍁 Canadian Focus
                        </span>
                      )}
                      {content.safety_related && (
                        <span className="inline-flex items-center text-red-600">
                          ⚠️ Safety Content
                        </span>
                      )}
                      <span>{new Date(content.created_at).toLocaleDateString()}</span>
                    </div>

                    {content.analytics && (
                      <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{content.analytics.total_views || 0} views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{content.analytics.avg_engagement || 0}% engagement</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>{content.analytics.platforms_published || 0} platforms</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {content.status === 'ready' && (
                      <button
                        onClick={() => handlePublishContent(content.id, ['youtube'])}
                        className="btn-success text-sm"
                        disabled={publishContentMutation.isPending}
                      >
                        {publishContentMutation.isPending ? (
                          <LoadingSpinner size="small" color="white" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Publish
                      </button>
                    )}
                    
                    <button className="btn-secondary text-sm">
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                    
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No content found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedContentType === 'all' 
                ? 'Get started by generating your first piece of content'
                : `No ${selectedContentType} content found`
              }
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowGenerateModal(true)}
                className="btn-primary"
              >
                <Zap className="h-4 w-4" />
                Generate Content
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Content Modal */}
      {showGenerateModal && (
        <GenerateContentModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerateContent}
          isGenerating={generateContentMutation.isPending}
        />
      )}
    </div>
  )
}

const GenerateContentModal = ({ onClose, onGenerate, isGenerating }) => {
  const [formData, setFormData] = useState({
    topic: '',
    content_type: '',
    canadian_focus: true,
    generate_audio: true,
    difficulty_level: 3
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onGenerate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">Generate New Content</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic (Optional)
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="Leave blank for autonomous topic selection"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Type
            </label>
            <select
              value={formData.content_type}
              onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value }))}
              className="select-field"
            >
              <option value="">Auto-select based on schedule</option>
              <option value="technical">Technical Deep-Dive</option>
              <option value="safety">Safety & Best Practices</option>
              <option value="customer_service">Customer Service</option>
              <option value="industry_update">Industry Updates</option>
              <option value="wellness">Wellness & Career</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty Level
            </label>
            <select
              value={formData.difficulty_level}
              onChange={(e) => setFormData(prev => ({ ...prev, difficulty_level: parseInt(e.target.value) }))}
              className="select-field"
            >
              <option value={1}>Beginner (1)</option>
              <option value={2}>Intermediate (2)</option>
              <option value={3}>Advanced (3)</option>
              <option value={4}>Expert (4)</option>
              <option value={5}>Master (5)</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.canadian_focus}
                onChange={(e) => setFormData(prev => ({ ...prev, canadian_focus: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Canadian HVAC focus</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.generate_audio}
                onChange={(e) => setFormData(prev => ({ ...prev, generate_audio: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Generate voice audio</span>
            </label>
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <button
              type="submit"
              disabled={isGenerating}
              className="btn-primary flex-1 justify-center"
            >
              {isGenerating ? (
                <LoadingSpinner size="small" color="white" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ContentPipeline