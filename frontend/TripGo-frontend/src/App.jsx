import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import OperatorRegister from './pages/OperatorRegister';
import AdminOperatorAction from './pages/AdminOperatorAction';
import ResetPassword from './pages/ResetPassword';
import SearchResults from './pages/SearchResults';
import Dashboard from './pages/Dashboard';
import OperatorDashboard from './pages/OperatorDashboard';
import AddBus from './pages/AddBus';
import BusSeatLayout from './pages/BusSeatLayout';
import BusReview from './pages/BusReview';
import MyBuses from './pages/MyBuses';
import CreateRoute from './pages/CreateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
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
          <Route path="/search-results" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;