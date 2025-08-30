import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  Bell,
  Globe,
  Shield,
  Clock,
  Database,
  Key,
  AlertTriangle,
  CheckCircle,
  Volume2,
  Palette,
  Calendar,
  Zap
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { toast } from 'react-hot-toast'
import LoadingSpinner from './common/LoadingSpinner'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [isDirty, setIsDirty] = useState(false)
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => useApi.get('/settings')
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings) => useApi.put('/settings', newSettings),
    onSuccess: () => {
      toast.success('Settings updated successfully!')
      setIsDirty(false)
      queryClient.invalidateQueries(['settings'])
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update settings')
    }
  })

  const testConnectionMutation = useMutation({
    mutationFn: (service) => useApi.post(`/settings/test-connection/${service}`),
    onSuccess: (data) => {
      toast.success(`${data.service} connection successful!`)
    },
    onError: (error) => {
      toast.error(`Connection failed: ${error.message}`)
    }
  })

  const [formData, setFormData] = useState(settings || {})

  React.useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
    setIsDirty(true)
  }

  const handleSave = () => {
    updateSettingsMutation.mutate(formData)
  }

  const handleTestConnection = (service) => {
    testConnectionMutation.mutate(service)
  }

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'character', label: 'Alex Reid', icon: Volume2 },
    { id: 'content', label: 'Content', icon: Calendar },
    { id: 'social', label: 'Social Media', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" text="Loading settings..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure LARK Labs AI Influencer system</p>
        </div>
        <div className="flex items-center space-x-3">
          {isDirty && (
            <span className="text-sm text-amber-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || updateSettingsMutation.isPending}
            className="btn-primary"
          >
            {updateSettingsMutation.isPending ? (
              <LoadingSpinner size="small" color="white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          <div className="card">
            {activeTab === 'general' && (
              <GeneralSettings 
                data={formData.general || {}}
                onChange={(field, value) => handleInputChange('general', field, value)}
              />
            )}
            
            {activeTab === 'character' && (
              <CharacterSettings 
                data={formData.character || {}}
                onChange={(field, value) => handleInputChange('character', field, value)}
                onTestConnection={handleTestConnection}
              />
            )}
            
            {activeTab === 'content' && (
              <ContentSettings 
                data={formData.content || {}}
                onChange={(field, value) => handleInputChange('content', field, value)}
              />
            )}
            
            {activeTab === 'social' && (
              <SocialMediaSettings 
                data={formData.socialMedia || {}}
                onChange={(field, value) => handleInputChange('socialMedia', field, value)}
                onTestConnection={handleTestConnection}
              />
            )}
            
            {activeTab === 'notifications' && (
              <NotificationSettings 
                data={formData.notifications || {}}
                onChange={(field, value) => handleInputChange('notifications', field, value)}
              />
            )}
            
            {activeTab === 'security' && (
              <SecuritySettings 
                data={formData.security || {}}
                onChange={(field, value) => handleInputChange('security', field, value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const GeneralSettings = ({ data, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold">General Settings</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          System Timezone
        </label>
        <select
          value={data.timezone || 'America/Toronto'}
          onChange={(e) => onChange('timezone', e.target.value)}
          className="select-field"
        >
          <option value="America/Toronto">Eastern Time (Toronto)</option>
          <option value="America/Vancouver">Pacific Time (Vancouver)</option>
          <option value="America/Edmonton">Mountain Time (Edmonton)</option>
          <option value="America/Winnipeg">Central Time (Winnipeg)</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operating Mode
        </label>
        <select
          value={data.operatingMode || 'autonomous'}
          onChange={(e) => onChange('operatingMode', e.target.value)}
          className="select-field"
        >
          <option value="autonomous">Fully Autonomous</option>
          <option value="assisted">Human-Assisted</option>
          <option value="manual">Manual Only</option>
        </select>
      </div>
    </div>

    <div>
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={data.maintenanceMode || false}
          onChange={(e) => onChange('maintenanceMode', e.target.checked)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="ml-2 text-sm text-gray-700">Maintenance Mode</span>
      </label>
      <p className="text-xs text-gray-500 mt-1">Pauses all autonomous operations</p>
    </div>
  </div>
)

const CharacterSettings = ({ data, onChange, onTestConnection }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold">Alex Reid Character Settings</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Voice Model ID
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={data.voiceModelId || ''}
            onChange={(e) => onChange('voiceModelId', e.target.value)}
            placeholder="ElevenLabs Voice ID"
            className="input-field flex-1"
          />
          <button
            onClick={() => onTestConnection('elevenlabs')}
            className="btn-secondary"
          >
            Test
          </button>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Voice Stability
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={data.voiceStability || 0.85}
            onChange={(e) => onChange('voiceStability', parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 w-12">{data.voiceStability || 0.85}</span>
        </div>
      </div>
    </div>

    <div className="space-y-4">
      <h4 className="text-md font-medium">Personality Traits</h4>
      
      {['empathy_level', 'technical_complexity', 'safety_focus', 'brand_integration'].map(trait => (
        <div key={trait}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {trait.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="1"
              max="10"
              value={data[trait] || 5}
              onChange={(e) => onChange(trait, parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 w-8">{data[trait] || 5}/10</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const ContentSettings = ({ data, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold">Content Generation Settings</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Daily Content Limit
        </label>
        <input
          type="number"
          min="0"
          max="5"
          value={data.dailyContentLimit || 1}
          onChange={(e) => onChange('dailyContentLimit', parseInt(e.target.value))}
          className="input-field"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Publishing Schedule
        </label>
        <select
          value={data.publishingSchedule || 'morning'}
          onChange={(e) => onChange('publishingSchedule', e.target.value)}
          className="select-field"
        >
          <option value="morning">Morning (9:00 AM EST)</option>
          <option value="afternoon">Afternoon (2:00 PM EST)</option>
          <option value="evening">Evening (6:00 PM EST)</option>
          <option value="optimal">AI-Optimized</option>
        </select>
      </div>
    </div>

    <div className="space-y-3">
      <h4 className="text-md font-medium">Content Preferences</h4>
      
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={data.canadianFocus || true}
          onChange={(e) => onChange('canadianFocus', e.target.checked)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="ml-2 text-sm text-gray-700">Canadian HVAC Focus</span>
      </label>
      
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={data.safetyEmphasis || true}
          onChange={(e) => onChange('safetyEmphasis', e.target.checked)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="ml-2 text-sm text-gray-700">Safety Emphasis</span>
      </label>
      
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={data.generateAudio || true}
          onChange={(e) => onChange('generateAudio', e.target.checked)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="ml-2 text-sm text-gray-700">Generate Voice Audio</span>
      </label>
    </div>
  </div>
)

const SocialMediaSettings = ({ data, onChange, onTestConnection }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold">Social Media Integration</h3>
    
    <div className="space-y-6">
      {/* YouTube Settings */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            YouTube
          </h4>
          <button
            onClick={() => onTestConnection('youtube')}
            className="btn-secondary text-sm"
          >
            Test Connection
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel ID
            </label>
            <input
              type="text"
              value={data.youtube?.channelId || ''}
              onChange={(e) => onChange('youtube', { ...data.youtube, channelId: e.target.value })}
              className="input-field"
            />
          </div>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.youtube?.autoPublish || true}
              onChange={(e) => onChange('youtube', { ...data.youtube, autoPublish: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-publish content</span>
          </label>
        </div>
      </div>

      {/* LinkedIn Settings */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            LinkedIn
          </h4>
          <button
            onClick={() => onTestConnection('linkedin')}
            className="btn-secondary text-sm"
          >
            Test Connection
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page ID
            </label>
            <input
              type="text"
              value={data.linkedin?.pageId || ''}
              onChange={(e) => onChange('linkedin', { ...data.linkedin, pageId: e.target.value })}
              className="input-field"
            />
          </div>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.linkedin?.autoPublish || true}
              onChange={(e) => onChange('linkedin', { ...data.linkedin, autoPublish: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-publish content</span>
          </label>
        </div>
      </div>

      {/* Facebook Settings */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium flex items-center">
            <div className="w-2 h-2 bg-blue-700 rounded-full mr-2"></div>
            Facebook
          </h4>
          <button
            onClick={() => onTestConnection('facebook')}
            className="btn-secondary text-sm"
          >
            Test Connection
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page ID
            </label>
            <input
              type="text"
              value={data.facebook?.pageId || ''}
              onChange={(e) => onChange('facebook', { ...data.facebook, pageId: e.target.value })}
              className="input-field"
            />
          </div>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.facebook?.autoPublish || false}
              onChange={(e) => onChange('facebook', { ...data.facebook, autoPublish: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-publish content</span>
          </label>
        </div>
      </div>
    </div>
  </div>
)

const NotificationSettings = ({ data, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold">Notification Settings</h3>
    
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Notifications
        </label>
        <input
          type="email"
          value={data.emailAddress || ''}
          onChange={(e) => onChange('emailAddress', e.target.value)}
          placeholder="your@email.com"
          className="input-field"
        />
      </div>
      
      <div className="space-y-3">
        <h4 className="text-md font-medium">Notification Types</h4>
        
        {[
          { key: 'contentGenerated', label: 'Content Generated' },
          { key: 'contentPublished', label: 'Content Published' },
          { key: 'systemErrors', label: 'System Errors' },
          { key: 'performanceAlerts', label: 'Performance Alerts' },
          { key: 'maintenanceReminders', label: 'Maintenance Reminders' }
        ].map(notification => (
          <label key={notification.key} className="flex items-center">
            <input
              type="checkbox"
              checked={data[notification.key] || true}
              onChange={(e) => onChange(notification.key, e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">{notification.label}</span>
          </label>
        ))}
      </div>
    </div>
  </div>
)

const SecuritySettings = ({ data, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold">Security Settings</h3>
    
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API Rate Limit (requests/minute)
        </label>
        <input
          type="number"
          min="10"
          max="1000"
          value={data.apiRateLimit || 100}
          onChange={(e) => onChange('apiRateLimit', parseInt(e.target.value))}
          className="input-field"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Session Timeout (minutes)
        </label>
        <input
          type="number"
          min="15"
          max="480"
          value={data.sessionTimeout || 60}
          onChange={(e) => onChange('sessionTimeout', parseInt(e.target.value))}
          className="input-field"
        />
      </div>
      
      <div className="space-y-3">
        <h4 className="text-md font-medium">Security Options</h4>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.requireSSL || true}
            onChange={(e) => onChange('requireSSL', e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">Require SSL/HTTPS</span>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.logApiCalls || true}
            onChange={(e) => onChange('logApiCalls', e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">Log API Calls</span>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.enableBackups || true}
            onChange={(e) => onChange('enableBackups', e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">Automatic Backups</span>
        </label>
      </div>
    </div>
  </div>
)

export default Settings