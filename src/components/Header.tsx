import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/LanguageContext'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t, toggleLang } = useT()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-blue-600 no-underline">
            {t('nav.brand')}
          </Link>

          <div className="flex items-center gap-6">
            {user && (
              <>
                <nav className="flex gap-4">
                  <Link to="/" className="text-gray-600 hover:text-blue-600 no-underline text-sm font-medium">
                    {t('nav.dashboard')}
                  </Link>
                  <Link to="/papers" className="text-gray-600 hover:text-blue-600 no-underline text-sm font-medium">
                    {t('nav.papers')}
                  </Link>
                  <Link to="/papers/upload" className="text-gray-600 hover:text-blue-600 no-underline text-sm font-medium">
                    {t('nav.upload')}
                  </Link>
                </nav>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <span className="text-sm text-gray-500">
                    {user.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-none"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              </>
            )}
            <button
              onClick={toggleLang}
              className="px-2.5 py-1 text-xs font-bold border border-gray-300 rounded-md bg-white hover:bg-gray-50 cursor-pointer text-gray-700"
            >
              {t('lang.toggle')}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
