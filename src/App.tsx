import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { GlobalStyles } from '@/theme/GlobalStyles';
import { queryClient } from '@/lib/queryClient';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useMyTeam } from '@/hooks/useMyTeam';
import { ToastHost } from '@/components/ui/ToastHost';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const TeamboardPage = lazy(() => import('@/pages/TeamboardPage'));
const MyboardPage = lazy(() => import('@/pages/MyboardPage'));
const MoodboardPage = lazy(() => import('@/pages/MoodboardPage'));
const UploadPage = lazy(() => import('@/pages/UploadPage'));

function AppInner() {
  useAuthSession();
  useMyTeam();
  return (
    <>
      <GlobalStyles />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/welcome" element={<OnboardingPage />} />
          {/* Public guest browsing — no team / login required.
              Same AppShell + HomePage but RLS only returns public moodboards. */}
          <Route path="/browse" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="moodboards/:id" element={<MoodboardPage />} />
          </Route>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="teamboard" element={<TeamboardPage />} />
            <Route path="myboard" element={<MyboardPage />} />
            <Route path="moodboards/:id" element={<MoodboardPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="upload/:moodboardId" element={<UploadPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ToastHost />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
