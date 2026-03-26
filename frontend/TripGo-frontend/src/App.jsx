import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './shared/contexts/AuthContext';
import ProtectedRoute from './shared/components/ProtectedRoute';

import Home from './features/home/pages/Home';
import Dashboard from './features/home/pages/Dashboard';

import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import ResetPassword from './features/auth/pages/ResetPassword';
import VerifyEmail from './features/auth/pages/VerifyEmail';
import OperatorRegister from './features/auth/pages/OperatorRegister';
import OAuth2Callback from './features/auth/pages/OAuth2Callback';

import OperatorDashboard from './features/operator/pages/OperatorDashboard';
import AddBus from './features/operator/pages/AddBus';
import BusSeatLayout from './features/operator/pages/BusSeatLayout';
import BusReview from './features/operator/pages/BusReview';
import MyBuses from './features/operator/pages/MyBuses';
import CreateRoute from './features/operator/pages/CreateRoute';
import Schedules from './features/operator/pages/Schedules';

import SearchResults from './features/search/pages/SearchResults';

import AdminOperatorAction from './pages/AdminOperatorAction';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/oauth2/callback" element={<OAuth2Callback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/operator-register" element={<OperatorRegister />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/operator-action" element={<AdminOperatorAction />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/operator/dashboard" element={<ProtectedRoute><OperatorDashboard /></ProtectedRoute>} />
          <Route path="/operator/my-buses" element={<ProtectedRoute><MyBuses /></ProtectedRoute>} />
          <Route path="/operator/add-bus" element={<ProtectedRoute><AddBus /></ProtectedRoute>} />
          <Route path="/operator/bus-layout" element={<ProtectedRoute><BusSeatLayout /></ProtectedRoute>} />
          <Route path="/operator/bus-review" element={<ProtectedRoute><BusReview /></ProtectedRoute>} />
          <Route path="/operator/create-route" element={<ProtectedRoute><CreateRoute /></ProtectedRoute>} />
          <Route path="/operator/schedules" element={<ProtectedRoute><Schedules /></ProtectedRoute>} />
          <Route path="/search-results" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
