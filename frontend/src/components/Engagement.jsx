import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  MessageCircle, 
  Heart, 
  Share2, 
  Reply, 
  Send, 
  Filter,
  Clock,
  User,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Archive,
  Flag,
  MoreHorizontal,
  Youtube,
  Linkedin,
  Facebook,
  ThumbsUp,
  TrendingUp,
  Eye
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { toast } from 'react-hot-toast'
import LoadingSpinner from './common/LoadingSpinner'

const Engagement = () => {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const queryClient = useQueryClient()

  const { data: engagementData, isLoading } = useQuery({
    queryKey: ['engagement', selectedFilter, selectedPlatform],
    queryFn: () => useApi.get(`/engagement?filter=${selectedFilter}&platform=${selectedPlatform}`),
    refetchInterval: autoRefresh ? 30000 : false
  })

  const respondMutation = useMutation({
    mutationFn: ({ commentId, response, tone }) => 
      useApi.post(`/engagement/respond`, { commentId, response, tone }),
    onSuccess: () => {
      toast.success('Response sent successfully!')
      queryClient.invalidateQueries(['engagement'])
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send response')
    }
  })

  const moderateMutation = useMutation({
    mutationFn: ({ commentId, action }) => 
      useApi.post(`/engagement/moderate`, { commentId, action }),
    onSuccess: (_, variables) => {
      toast.success(`Comment ${variables.action}d successfully!`)
      queryClient.invalidateQueries(['engagement'])
    },
    onError: (error) => {
      toast.error(error.message || 'Moderation action failed')
    }
  })

  const filters = [
    { value: 'all', label: 'All Engagement' },
    { value: 'pending', label: 'Needs Response' },
    { value: 'questions', label: 'Questions' },
    { value: 'compliments', label: 'Positive' },
    { value: 'criticism', label: 'Needs Attention' },
    { value: 'technical', label: 'Technical' },
    { value: 'flagged', label: 'Flagged' }
  ]

  const platforms = [
    { value: 'all', label: 'All Platforms', icon: null },
    { value: 'youtube', label: 'YouTube', icon: Youtube },
    { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { value: 'facebook', label: 'Facebook', icon: Facebook }
  ]

  const handleRespond = (commentId, response, tone = 'helpful') => {
    respondMutation.mutate({ commentId, response, tone })
  }

  const handleModerate = (commentId, action) => {
    moderateMutation.mutate({ commentId, action })
  }

  const engagementStats = engagementData?.stats || {}
  const comments = engagementData?.comments || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" text="Loading engagement data..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Engagement</h1>
          <p className="text-gray-600">Manage Alex Reid's community interactions and responses</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
            />
            Auto-refresh
          </label>
          <div className="text-sm text-gray-500 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Engagement</p>
              <p className="text-2xl font-bold text-gray-900">{engagementStats.totalEngagement || 0}</p>
              <p className="text-xs text-green-600">+{engagementStats.engagementGrowth || 0}% this week</p>
            </div>
            <MessageCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Responses</p>
              <p className="text-2xl font-bold text-gray-900">{engagementStats.pendingResponses || 0}</p>
              <p className="text-xs text-amber-600">Needs attention</p>
            </div>
            <Reply className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900">{engagementStats.responseRate || 0}%</p>
              <p className="text-xs text-green-600">Target: 95%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{engagementStats.avgResponseTime || 0}h</p>
              <p className="text-xs text-green-600">Target: &lt;2h</p>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sentiment Score</p>
              <p className="text-2xl font-bold text-gray-900">{engagementStats.sentimentScore || 0}%</p>
              <p className="text-xs text-green-600">Positive overall</p>
            </div>
            <Heart className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="select-field"
          >
            {filters.map(filter => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="select-field"
        >
          {platforms.map(platform => (
            <option key={platform.value} value={platform.value}>
              {platform.label}
            </option>
          ))}
        </select>
      </div>

      {/* Engagement Feed */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Community Interactions</h3>
          <div className="text-sm text-gray-500">
            {comments.length} {selectedFilter === 'all' ? 'total' : selectedFilter} interactions
          </div>
        </div>

        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <EngagementItem
                key={comment.id}
                comment={comment}
                onRespond={handleRespond}
                onModerate={handleModerate}
                isResponding={respondMutation.isPending}
                isModerating={moderateMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No interactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedFilter === 'all' 
                ? 'No community interactions yet' 
                : `No ${selectedFilter} interactions found`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const EngagementItem = ({ comment, onRespond, onModerate, isResponding, isModerating }) => {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [selectedTone, setSelectedTone] = useState('helpful')
  const replyInputRef = useRef(null)

  useEffect(() => {
    if (showReplyForm && replyInputRef.current) {
      replyInputRef.current.focus()
    }
  }, [showReplyForm])

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-600" />
      case 'linkedin':
        return <Linkedin className="h-4 w-4 text-blue-600" />
      case 'facebook':
        return <Facebook className="h-4 w-4 text-blue-700" />
      default:
        return <MessageCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-100'
      case 'negative':
        return 'text-red-600 bg-red-100'
      case 'neutral':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const handleSubmitReply = (e) => {
    e.preventDefault()
    if (replyText.trim()) {
      onRespond(comment.id, replyText, selectedTone)
      setReplyText('')
      setShowReplyForm(false)
    }
  }

  const tones = [
    { value: 'helpful', label: '🤝 Helpful' },
    { value: 'educational', label: '🎓 Educational' },
    { value: 'empathetic', label: '💙 Empathetic' },
    { value: 'professional', label: '👔 Professional' },
    { value: 'enthusiastic', label: '⚡ Enthusiastic' }
  ]

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Comment Header */}
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex items-center space-x-2">
              {getPlatformIcon(comment.platform)}
              <span className="text-sm font-medium text-gray-900">{comment.author}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(comment.sentiment)}`}>
                {comment.sentiment}
              </span>
              {comment.isQuestion && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Question
                </span>
              )}
              {comment.isFlagged && (
                <Flag className="h-4 w-4 text-red-600" />
              )}
            </div>
            <span className="text-sm text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Original Content Context */}
          {comment.contentTitle && (
            <div className="mb-2 p-2 bg-gray-50 rounded text-sm">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">On: {comment.contentTitle}</span>
                <a href={comment.contentUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Comment Text */}
          <div className="mb-3">
            <p className="text-gray-900">{comment.text}</p>
          </div>

          {/* Engagement Metrics */}
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center space-x-1">
              <ThumbsUp className="h-4 w-4" />
              <span>{comment.likes || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Reply className="h-4 w-4" />
              <span>{comment.replies || 0}</span>
            </div>
            {comment.reach && (
              <div className="flex items-center space-x-1">
                <Eye className="h-4 w-4" />
                <span>{comment.reach} reach</span>
              </div>
            )}
          </div>

          {/* Alex Reid's Previous Response */}
          {comment.alexResponse && (
            <div className="mt-3 p-3 bg-primary-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-4 w-4 text-primary-600" />
                <span className="text-sm font-medium text-primary-700">Alex Reid responded</span>
                <span className="text-sm text-gray-500">
                  {new Date(comment.alexResponse.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700 text-sm">{comment.alexResponse.text}</p>
            </div>
          )}

          {/* Reply Form */}
          {showReplyForm && (
            <form onSubmit={handleSubmitReply} className="mt-4 space-y-3">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Tone:</label>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value)}
                  className="select-field text-sm"
                >
                  {tones.map(tone => (
                    <option key={tone.value} value={tone.value}>
                      {tone.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <textarea
                  ref={replyInputRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type Alex Reid's response..."
                  rows={3}
                  className="input-field resize-none"
                  disabled={isResponding}
                />
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  disabled={!replyText.trim() || isResponding}
                  className="btn-primary text-sm"
                >
                  {isResponding ? (
                    <LoadingSpinner size="small" color="white" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Response
                </button>
                <button
                  type="button"
                  onClick={() => setShowReplyForm(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {!comment.alexResponse && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="btn-secondary text-sm"
            >
              <Reply className="h-4 w-4" />
              Reply
            </button>
          )}
          
          <div className="relative">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {/* Dropdown menu would go here */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Engagement