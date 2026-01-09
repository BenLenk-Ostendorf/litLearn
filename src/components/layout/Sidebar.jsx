import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Inbox, 
  BookOpen, 
  Brain, 
  Search, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/inbox', icon: Inbox, label: 'Inbox' },
  { path: '/reading', icon: BookOpen, label: 'Lesen' },
  { path: '/review', icon: Brain, label: 'Review' },
  { path: '/search', icon: Search, label: 'Suche' },
  { path: '/settings', icon: Settings, label: 'Einstellungen' },
]

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!collapsed && (
          <span className="text-xl font-bold text-primary">LitLearn</span>
        )}
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${collapsed ? 'mx-auto' : ''}`}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
      
      <nav className="p-2 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${isActive 
                ? 'bg-primary text-white' 
                : 'text-gray-700 hover:bg-gray-100'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
