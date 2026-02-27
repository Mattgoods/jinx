import { Routes, Route } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth.tsx'
import { AppLayout } from './components/AppLayout.tsx'
import { LandingPage } from './pages/LandingPage.tsx'
import { SignInPage } from './pages/SignInPage.tsx'
import { SignUpPage } from './pages/SignUpPage.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { CreateGroupPage } from './pages/CreateGroupPage.tsx'
import { JoinGroupPage } from './pages/JoinGroupPage.tsx'
import { GroupSettingsPage } from './pages/GroupSettingsPage.tsx'
import { CreateMarketPage } from './pages/CreateMarketPage.tsx'
import { MarketDetailPage } from './pages/MarketDetailPage.tsx'
import { ResolveMarketPage } from './pages/ResolveMarketPage.tsx'
import { LeaderboardPage } from './pages/LeaderboardPage.tsx'
import { ProfilePage } from './pages/ProfilePage.tsx'
import { GroupDetailPage } from './pages/GroupDetailPage.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/group/create" element={<CreateGroupPage />} />
          <Route path="/group/join" element={<JoinGroupPage />} />
          <Route path="/group/:groupId" element={<GroupDetailPage />} />
          <Route path="/group/:groupId/settings" element={<GroupSettingsPage />} />
          <Route path="/group/:groupId/markets/new" element={<CreateMarketPage />} />
          <Route path="/group/:groupId/leaderboard" element={<LeaderboardPage />} />
          <Route path="/markets/:id" element={<MarketDetailPage />} />
          <Route path="/markets/:id/resolve" element={<ResolveMarketPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
      </ToastProvider>
    </ErrorBoundary>
  )
}
