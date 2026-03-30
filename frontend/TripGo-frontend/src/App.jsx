import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './shared/contexts/AuthContext';
import ProtectedRoute from './shared/components/ProtectedRoute';
import { BusWizardProvider } from './features/operator/context/BusWizardContext';
import { ROUTES } from './shared/constants/routes';

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

import CompleteProfile from './features/auth/pages/CompleteProfile';
import AdminOperatorAction from './pages/AdminOperatorAction';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.OAUTH2_CALLBACK} element={<OAuth2Callback />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
          <Route path={ROUTES.OPERATOR_REGISTER} element={<OperatorRegister />} />
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />
          <Route path={ROUTES.COMPLETE_PROFILE} element={<CompleteProfile />} />

          {/* Admin route — protected, ADMIN role only */}
          <Route path={ROUTES.ADMIN_OPERATOR_ACTION} element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminOperatorAction /></ProtectedRoute>
          } />

          {/* User routes */}
          <Route path={ROUTES.DASHBOARD} element={
            <ProtectedRoute allowedRoles={['USER']}><Dashboard /></ProtectedRoute>
          } />
          <Route path={ROUTES.SEARCH_RESULTS} element={
            <ProtectedRoute allowedRoles={['USER']}><SearchResults /></ProtectedRoute>
          } />

          {/* Operator routes */}
          <Route path={ROUTES.OPERATOR_DASHBOARD} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><OperatorDashboard /></ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_MY_BUSES} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><MyBuses /></ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_SCHEDULES} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><Schedules /></ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_CREATE_ROUTE} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><CreateRoute /></ProtectedRoute>
          } />

          {/* Bus wizard — shared BusWizardProvider keeps state across steps */}
          <Route path={ROUTES.OPERATOR_ADD_BUS} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}>
              <BusWizardProvider><AddBus /></BusWizardProvider>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_BUS_LAYOUT} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}>
              <BusWizardProvider><BusSeatLayout /></BusWizardProvider>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_BUS_REVIEW} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}>
              <BusWizardProvider><BusReview /></BusWizardProvider>
            </ProtectedRoute>
          } />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
