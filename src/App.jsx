import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider } from "./context/ThemeContext";
import ThemeReveal from "./components/ui/ThemeReveal";
import ThemeToggle from "./components/ui/ThemeToggle";
import Login from "./components/auth/Login";
import Landing from "./components/landing/Landing";

// Patient Imports
import PatientLayout from "./components/patient/PatientLayout";
import PatientDashboard from "./pages/patient/PatientDashboard";
import Timeline from "./pages/patient/Timeline";
import Trends from "./pages/patient/Trends";
import Calendar from "./pages/patient/Calendar";
import Reports from "./pages/patient/Reports";
import ParameterDetail from "./pages/patient/ParameterDetail";
import PatientCases from "./pages/patient/PatientCases";
import PatientChats from "./pages/patient/PatientChats";
import Settings from "./pages/patient/Settings";
import RegisterPatient from "./pages/auth/RegisterPatient";

// Other Roles
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ParticleTransition from "./components/ui/ParticleTransition";
import { authService } from "./services/auth.service";

function ProtectedRoute({ children }) {
  if (!authService.hasToken()) {
    return <Navigate to="/login" replace />;
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
            <ProtectedRoute>
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
          <Route path="chats" element={<PatientChats />} />
          <Route path="chat" element={<PatientChats />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route 
          path="/doctor/dashboard" 
          element={
            <ProtectedRoute>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
              >
                <DoctorDashboard />
              </motion.div>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute>
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
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="bg-[var(--bg-primary)] min-h-screen text-[var(--text-primary)] font-sans antialiased overflow-x-hidden transition-colors duration-700">
          <ThemeReveal />
          <ThemeToggle />
          
          {/* CINEMATIC PARTICLE LAYER */}
          <ParticleTransition />
          
          <AnimatedRoutes />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
