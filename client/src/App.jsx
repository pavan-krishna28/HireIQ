import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import RecruiterLogin from './pages/auth/RecruiterLogin';
import RecruiterRegister from './pages/auth/RecruiterRegister';
import Dashboard from './pages/recruiter/Dashboard';
import CreateJob from './pages/recruiter/CreateJob';
import JobList from './pages/recruiter/JobList';
import JobDetail from './pages/recruiter/JobDetail';
import ReportView from './pages/recruiter/ReportView';
import CandidateDetail from './pages/recruiter/CandidateDetail';
import Apply from './pages/candidate/Apply';
import TestInstructions from './pages/candidate/TestInstructions';
import TestRoom from './pages/candidate/TestRoom';
import TestComplete from './pages/candidate/TestComplete';

const ProtectedRoute = ({ children }) => {
  const { recruiter } = useAuth();
  return recruiter ? children : <Navigate to="/recruiter/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '14px', borderRadius: '12px', border: '1px solid #e0e7ff' },
          success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } }
        }} />
        <Routes>
          {/* Auth */}
          <Route path="/recruiter/login" element={<RecruiterLogin />} />
          <Route path="/recruiter/register" element={<RecruiterRegister />} />

          {/* Recruiter Portal */}
          <Route path="/recruiter" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/recruiter/jobs" element={<ProtectedRoute><JobList /></ProtectedRoute>} />
          <Route path="/recruiter/jobs/new" element={<ProtectedRoute><CreateJob /></ProtectedRoute>} />
          <Route path="/recruiter/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
          <Route path="/recruiter/candidates/:id" element={<ProtectedRoute><CandidateDetail /></ProtectedRoute>} />
          <Route path="/recruiter/report/:sessionId" element={<ProtectedRoute><ReportView /></ProtectedRoute>} />

          {/* Candidate Portal */}
          <Route path="/apply/:companySlug/:jobId" element={<Apply />} />
          <Route path="/test/instructions" element={<TestInstructions />} />
          <Route path="/test/room" element={<TestRoom />} />
          <Route path="/test/complete" element={<TestComplete />} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/recruiter/login" replace />} />
          <Route path="*" element={<Navigate to="/recruiter/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
