import React from 'react'
import { User, Mic, Eye, CheckCircle } from 'lucide-react'

const CharacterProfile = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alex Reid Character Profile</h1>
          <p className="text-gray-600">Manage the AI character's personality, voice, and consistency</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Character Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empathy Level
                </label>
                <div className="flex items-center space-x-3">
                  <input type="range" min="1" max="10" defaultValue="8" className="flex-1" />
                  <span className="text-sm text-gray-600 w-8">8/10</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technical Complexity
                </label>
                <div className="flex items-center space-x-3">
                  <input type="range" min="1" max="10" defaultValue="7" className="flex-1" />
                  <span className="text-sm text-gray-600 w-8">7/10</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Focus
                </label>
                <div className="flex items-center space-x-3">
                  <input type="range" min="1" max="10" defaultValue="10" className="flex-1" />
                  <span className="text-sm text-gray-600 w-8">10/10</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Integration
                </label>
                <div className="flex items-center space-x-3">
                  <input type="range" min="1" max="10" defaultValue="7" className="flex-1" />
                  <span className="text-sm text-gray-600 w-8">7/10</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button className="btn-primary">
                Save Settings
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Voice Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voice Stability
                </label>
                <div className="flex items-center space-x-3">
                  <input type="range" min="0" max="1" step="0.1" defaultValue="0.85" className="flex-1" />
                  <span className="text-sm text-gray-600 w-8">0.85</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voice Clarity
                </label>
                <div className="flex items-center space-x-3">
                  <input type="range" min="0" max="1" step="0.1" defaultValue="0.90" className="flex-1" />
                  <span className="text-sm text-gray-600 w-8">0.90</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button className="btn-secondary">
                <Mic className="h-4 w-4" />
                Test Voice
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Character Health</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Personality Consistency</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">95%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Voice Match</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">92%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Visual Consistency</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">98%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Signature Elements</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Catchphrases</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>"Safety first, solutions second, success follows"</li>
                  <li>"Let's troubleshoot this together"</li>
                  <li>"Remember, every expert was once a beginner"</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Sign-offs</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>"Stay safe out there"</li>
                  <li>"See you next week, HVAC family"</li>
                  <li>"Keep learning, keep growing"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CharacterProfile