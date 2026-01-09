import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import Reading from './pages/Reading'
import Review from './pages/Review'
import Search from './pages/Search'
import Settings from './pages/Settings'
import { DataProvider } from './context/DataContext'

function App() {
  return (
    <DataProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/reading/:paperId" element={<Reading />} />
          <Route path="/review" element={<Review />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </DataProvider>
  )
}

export default App
