import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { MessageSquare, FileSearch, Code2, Brain, Settings, LogOut, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
  { to: '/files', label: 'Analisis File', icon: FileSearch },
  { to: '/snippets', label: 'Code Snippets', icon: Code2 },
  { to: '/knowledge', label: 'Pengetahuan AI', icon: Brain },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-5">
          <Sparkles className="h-6 w-6 text-indigo-400" />
          <div>
            <h1 className="text-sm font-bold">AI Dashboard</h1>
            <p className="text-[11px] text-slate-500">Training Center</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <p className="truncate px-2 pb-2 text-xs text-slate-500">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
