import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import ContentPipeline from './components/ContentPipeline'
import Analytics from './components/Analytics'
import CharacterProfile from './components/CharacterProfile'
import Settings from './components/Settings'
import Research from './components/Research'
import SocialMedia from './components/SocialMedia'
import Engagement from './components/Engagement'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/content" element={<ContentPipeline />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/character" element={<CharacterProfile />} />
        <Route path="/research" element={<Research />} />
        <Route path="/social" element={<SocialMedia />} />
        <Route path="/engagement" element={<Engagement />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App