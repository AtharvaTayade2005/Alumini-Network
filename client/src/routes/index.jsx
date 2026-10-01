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
import EventDetails from '../pages/EventDetails.jsx'
import Mentorship from '../pages/Mentorship.jsx'
import Admin from '../pages/Admin.jsx'
import Settings from '../pages/Settings.jsx'
import Assistant from '../pages/Assistant.jsx'
import ResumeAnalyzer from '../pages/ResumeAnalyzer.jsx'
import JobReadiness from '../pages/JobReadiness.jsx'
import SemanticSearch from '../pages/SemanticSearch.jsx'
import NotFound from '../pages/NotFound.jsx'
import { Forbidden, Unauthorized, ServerError, Offline, Maintenance } from '../pages/SystemScreens.jsx'
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
  { path: '/jobs/company/:id', element: auth(<Jobs view="company" />) },
  { path: '/jobs/review/:id', element: auth(<Jobs view="review" />) },
  { path: '/jobs/saved', element: auth(<Jobs view="saved" />) },
  { path: '/jobs/applications', element: auth(<Jobs view="applications" />) },
  { path: '/jobs/:id', element: auth(<Jobs view="job" />) },
  { path: '/events', element: auth(<Events />) },
  { path: '/events/:id', element: auth(<EventDetails />) },
  { path: '/mentorship', element: auth(<Mentorship />) },
  { path: '/settings', element: auth(<Settings />) },
  { path: '/assistant', element: auth(<Assistant />) },
  { path: '/resume-analyzer', element: auth(<ResumeAnalyzer />) },
  { path: '/job-readiness', element: auth(<JobReadiness />) },
  { path: '/semantic-search', element: auth(<SemanticSearch />) },
  { path: '/admin', element: auth(<RequireStaff><Admin /></RequireStaff>) },
  { path: '/403', element: <Forbidden /> },
  { path: '/401', element: <Unauthorized /> },
  { path: '/500', element: <ServerError /> },
  { path: '/offline', element: <Offline /> },
  { path: '/maintenance', element: <Maintenance /> },
  { path: '*', element: <NotFound /> },
]

export default routes
