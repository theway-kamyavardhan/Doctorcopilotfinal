import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SWRConfig } from "swr";
import { ThemeProvider } from "./context/ThemeContext";
import ThemeReveal from "./components/ui/ThemeReveal";
import ThemeToggle from "./components/ui/ThemeToggle";
import Login from "./components/auth/Login";
import Landing from "./components/landing/Landing";
import swrConfig from "./lib/swr";
import useViewport from "./hooks/useViewport";

// Patient Imports
import PatientLayout from "./components/patient/PatientLayout";
import DoctorLayout from "./components/doctor/DoctorLayout";
import ParticleTransition from "./components/ui/ParticleTransition";
import { authService } from "./services/auth.service";

const RegisterPatient = lazy(() => import("./pages/auth/RegisterPatient"));
const PatientDashboard = lazy(() => import("./pages/patient/PatientDashboard"));
const Timeline = lazy(() => import("./pages/patient/Timeline"));
const Trends = lazy(() => import("./pages/patient/Trends"));
const Calendar = lazy(() => import("./pages/patient/Calendar"));
const Reports = lazy(() => import("./pages/patient/Reports"));
const ParameterDetail = lazy(() => import("./pages/patient/ParameterDetail"));
const PatientCases = lazy(() => import("./pages/patient/PatientCases"));
const PatientCaseInsights = lazy(() => import("./pages/patient/PatientCaseInsights"));
const PatientChats = lazy(() => import("./pages/patient/PatientChats"));
const Settings = lazy(() => import("./pages/patient/Settings"));
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const DoctorCases = lazy(() => import("./pages/doctor/DoctorCases"));
const DoctorCaseView = lazy(() => import("./pages/doctor/DoctorCaseView"));
const DoctorCaseInsights = lazy(() => import("./pages/doctor/DoctorCaseInsights"));
const DoctorChats = lazy(() => import("./pages/doctor/DoctorChats"));
const DoctorCalendar = lazy(() => import("./pages/doctor/DoctorCalendar"));
const DoctorSettings = lazy(() => import("./pages/doctor/DoctorSettings"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300">
        Loading workspace...
      </div>
    </div>
  );
}

function ProtectedRoute({ children, roleRequired = null }) {
  if (!authService.hasToken()) {
    return <Navigate to="/login" replace />;
  }

  if (roleRequired) {
    const currentRole = authService.getStoredRole();
    if (!currentRole) {
      return <Navigate to="/login" replace />;
    }
    if (currentRole !== authService.normalizeRole(roleRequired)) {
      return <Navigate to={authService.getDashboardPathForRole(currentRole)} replace />;
    }
  }

  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  const appleEase = [0.22, 1, 0.36, 1];

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname.split('/')[1] || '/'}>
        {/* Landing Page as Entry Point */}
        <Route 
          path="/" 
          element={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ 
                opacity: 0, 
                scale: 1.1,
                filter: "blur(20px)",
                transition: { duration: 1.2, ease: appleEase } 
              }}
              transition={{ duration: 1, ease: appleEase }}
            >
              <Landing />
            </motion.div>
          } 
        />
        
        <Route 
          path="/login" 
          element={
            <motion.div
              initial={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ 
                opacity: 0, 
                filter: "blur(20px)",
                transition: { duration: 1, ease: appleEase } 
              }}
              transition={{ duration: 0.8, ease: appleEase }}
              className="bg-[#02040a]"
            >
              <Login />
            </motion.div>
          } 
        />

        <Route path="/register/patient" element={<RegisterPatient />} />

        {/* NESTED PATIENT ROUTES */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute roleRequired="patient">
              <PatientLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/patient/dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="trends" element={<Trends />} />
          <Route path="parameter/:name" element={<ParameterDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="cases" element={<PatientCases />} />
          <Route path="case" element={<PatientCases />} />
          <Route path="cases/insights" element={<PatientCaseInsights />} />
          <Route path="case/insights" element={<PatientCaseInsights />} />
          <Route path="chats" element={<PatientChats />} />
          <Route path="chat" element={<PatientChats />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* NESTED DOCTOR ROUTES */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute roleRequired="doctor">
              <DoctorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/doctor/dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="cases" element={<DoctorCases />} />
          <Route path="case/:id" element={<DoctorCaseView />} />
          <Route path="case/:id/insights" element={<DoctorCaseInsights />} />
          <Route path="archived" element={<Navigate to="/doctor/cases" replace />} />
          <Route path="chats" element={<DoctorChats />} />
          <Route path="calendar" element={<DoctorCalendar />} />
          <Route path="settings" element={<DoctorSettings />} />
        </Route>

        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute roleRequired="admin">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
              >
                <AdminDashboard />
              </motion.div>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const { isMobile } = useViewport();

  return (
    <ThemeProvider>
      <SWRConfig value={swrConfig}>
        <BrowserRouter>
          <div className="bg-[var(--bg-primary)] min-h-screen text-[var(--text-primary)] font-sans antialiased overflow-x-hidden transition-colors duration-700">
            <ThemeReveal />
            <ThemeToggle />

            {/* CINEMATIC PARTICLE LAYER */}
            {!isMobile ? <ParticleTransition /> : null}

            <Suspense fallback={<RouteLoader />}>
              <AnimatedRoutes />
            </Suspense>
          </div>
        </BrowserRouter>
      </SWRConfig>
    </ThemeProvider>
  );
}
