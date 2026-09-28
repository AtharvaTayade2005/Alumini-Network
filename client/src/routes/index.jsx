import Home from '../pages/Home.jsx'
import Login from '../pages/Login.jsx'
import Register from '../pages/Register.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Directory from '../pages/Directory.jsx'
import Jobs from '../pages/Jobs.jsx'
import Events from '../pages/Events.jsx'
import Mentorship from '../pages/Mentorship.jsx'
import Messages from '../pages/Messages.jsx'
import Admin from '../pages/Admin.jsx'

const routes = [
  { path: '/', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/directory', element: <Directory /> },
  { path: '/jobs', element: <Jobs /> },
  { path: '/events', element: <Events /> },
  { path: '/mentorship', element: <Mentorship /> },
  { path: '/messages', element: <Messages /> },
  { path: '/admin', element: <Admin /> },
]

export default routes
