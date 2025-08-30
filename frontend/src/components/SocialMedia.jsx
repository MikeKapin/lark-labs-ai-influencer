import React from 'react'
import { Share2, Youtube, Linkedin, Facebook } from 'lucide-react'

const SocialMedia = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
          <p className="text-gray-600">Manage publishing across YouTube, LinkedIn, and Facebook</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Youtube className="h-8 w-8 text-red-600" />
            <h3 className="text-lg font-semibold">YouTube</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Channel Status: Connected</p>
            <p className="text-sm text-gray-600">Videos Published: 15</p>
            <p className="text-sm text-gray-600">Total Views: 25,847</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Linkedin className="h-8 w-8 text-blue-600" />
            <h3 className="text-lg font-semibold">LinkedIn</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Page Status: Connected</p>
            <p className="text-sm text-gray-600">Posts Published: 12</p>
            <p className="text-sm text-gray-600">Impressions: 8,432</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Facebook className="h-8 w-8 text-blue-700" />
            <h3 className="text-lg font-semibold">Facebook</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Page Status: Connected</p>
            <p className="text-sm text-gray-600">Posts Published: 10</p>
            <p className="text-sm text-gray-600">Reach: 5,621</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="text-center py-12">
          <Share2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Social Media Management Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            Advanced publishing, scheduling, and analytics tools for all platforms
          </p>
        </div>
      </div>
    </div>
  )
}

export default SocialMedia