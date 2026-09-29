import Home from '../pages/Home.jsx'
import Login from '../pages/Login.jsx'
import Register from '../pages/Register.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Profile from '../pages/Profile.jsx'
import Directory from '../pages/Directory.jsx'
import AlumniProfile from '../pages/AlumniProfile.jsx'
import Messages from '../pages/Messages.jsx'
import Notifications from '../pages/Notifications.jsx'
import Jobs from '../pages/Jobs.jsx'
import Events from '../pages/Events.jsx'
import Mentorship from '../pages/Mentorship.jsx'
import Admin from '../pages/Admin.jsx'
import { RequireAnonymous, RequireAuth, RequireStaff } from './guards.jsx'

const auth = (element) => <RequireAuth>{element}</RequireAuth>
const anonymous = (element) => <RequireAnonymous>{element}</RequireAnonymous>

const routes = [
  { path: '/', element: <Home /> },
  { path: '/login', element: anonymous(<Login />) },
  { path: '/register', element: anonymous(<Register />) },
  { path: '/dashboard', element: auth(<Dashboard />) },
  { path: '/profile', element: auth(<Profile />) },
  { path: '/directory', element: auth(<Directory />) },
  { path: '/alumni/:userId', element: auth(<AlumniProfile />) },
  { path: '/messages', element: auth(<Messages />) },
  { path: '/messages/:peerId', element: auth(<Messages />) },
  { path: '/notifications', element: auth(<Notifications />) },
  { path: '/jobs', element: auth(<Jobs />) },
  { path: '/events', element: auth(<Events />) },
  { path: '/mentorship', element: auth(<Mentorship />) },
  { path: '/admin', element: auth(<RequireStaff><Admin /></RequireStaff>) },
]

export default routes
