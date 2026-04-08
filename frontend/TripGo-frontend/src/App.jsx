import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './shared/contexts/AuthContext';
import { ThemeProvider } from './shared/contexts/ThemeContext';
import ProtectedRoute from './shared/components/ProtectedRoute';
import { BusWizardProvider } from './features/operator/context/BusWizardContext';
import { ROUTES } from './shared/constants/routes';
import ErrorBoundary from './shared/components/ErrorBoundary';

const Home = lazy(() => import('./features/home/pages/Home'));
const Dashboard = lazy(() => import('./features/home/pages/Dashboard'));
const UserBookings = lazy(() => import('./features/home/pages/UserBookings'));
const UserProfile = lazy(() => import('./features/home/pages/UserProfile'));
const UserSettings = lazy(() => import('./features/home/pages/UserSettings'));
const UserSupport = lazy(() => import('./features/home/pages/UserSupport'));

const Login = lazy(() => import('./features/auth/pages/Login'));
const Register = lazy(() => import('./features/auth/pages/Register'));
const ForgotPassword = lazy(() => import('./features/auth/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./features/auth/pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./features/auth/pages/VerifyEmail'));
const OperatorRegister = lazy(() => import('./features/auth/pages/OperatorRegister'));
const OAuth2Callback = lazy(() => import('./features/auth/pages/OAuth2Callback'));

const OperatorDashboard = lazy(() => import('./features/operator/pages/OperatorDashboard'));
const AddBus = lazy(() => import('./features/operator/pages/AddBus'));
const BusSeatLayout = lazy(() => import('./features/operator/pages/BusSeatLayout'));
const BusReview = lazy(() => import('./features/operator/pages/BusReview'));
const MyBuses = lazy(() => import('./features/operator/pages/MyBuses'));
const CreateRoute = lazy(() => import('./features/operator/pages/CreateRoute'));
const Schedules = lazy(() => import('./features/operator/pages/Schedules'));
const OperatorPolicies = lazy(() => import('./features/operator/pages/OperatorPolicies'));
const Bookings = lazy(() => import('./features/operator/pages/Bookings'));
const OperatorReviews = lazy(() => import('./features/operator/pages/OperatorReviews'));
const Drivers = lazy(() => import('./features/operator/pages/Drivers'));
const Earnings = lazy(() => import('./features/operator/pages/Earnings'));
const OperatorSettings = lazy(() => import('./features/operator/pages/OperatorSettings'));
const OperatorSupport = lazy(() => import('./features/operator/pages/OperatorSupport'));

const SearchResults = lazy(() => import('./features/search/pages/SearchResults'));
const Booking = lazy(() => import('./features/search/pages/Booking'));
const DummyPayment = lazy(() => import('./features/search/pages/DummyPayment'));
const PaymentSuccess = lazy(() => import('./features/search/pages/PaymentSuccess'));

const CompleteProfile = lazy(() => import('./features/auth/pages/CompleteProfile'));
const AdminOperatorAction = lazy(() => import('./pages/AdminOperatorAction'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminReviews = lazy(() => import('./pages/AdminReviews'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
    <AuthProvider>
      <Toaster position="top-right" richColors theme="dark" closeButton />
      <Router>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>}>
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
          <Route path={ROUTES.ADMIN_DASHBOARD} element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path={ROUTES.ADMIN_REVIEWS} element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminReviews /></ProtectedRoute>
          } />
          <Route path={ROUTES.ADMIN_OPERATORS} element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Navigate to={`${ROUTES.ADMIN_DASHBOARD}?tab=operators`} replace />
            </ProtectedRoute>
          } />

          {/* User routes */}
          <Route path={ROUTES.DASHBOARD} element={
            <ProtectedRoute allowedRoles={['USER']}><Dashboard /></ProtectedRoute>
          } />
          <Route path={ROUTES.USER_BOOKINGS} element={
            <ProtectedRoute allowedRoles={['USER']}><UserBookings /></ProtectedRoute>
          } />
          <Route path={ROUTES.SEARCH_RESULTS} element={
            <ProtectedRoute allowedRoles={['USER']}><SearchResults /></ProtectedRoute>
          } />
          <Route path={ROUTES.BOOKING} element={
            <ProtectedRoute allowedRoles={['USER']}><Booking /></ProtectedRoute>
          } />
          <Route path={ROUTES.PAYMENT} element={
            <ProtectedRoute allowedRoles={['USER']}><DummyPayment /></ProtectedRoute>
          } />
          <Route path={ROUTES.PAYMENT_SUCCESS} element={
            <ProtectedRoute allowedRoles={['USER']}><PaymentSuccess /></ProtectedRoute>
          } />
          <Route path={ROUTES.USER_PROFILE} element={
            <ProtectedRoute allowedRoles={['USER']}><UserProfile /></ProtectedRoute>
          } />
          <Route path={ROUTES.USER_SETTINGS} element={
            <ProtectedRoute allowedRoles={['USER']}><UserSettings /></ProtectedRoute>
          } />
          <Route path={ROUTES.USER_SUPPORT} element={
            <ProtectedRoute allowedRoles={['USER']}><UserSupport /></ProtectedRoute>
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
          <Route path={ROUTES.OPERATOR_BOOKINGS} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><Bookings /></ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_REVIEWS} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><OperatorReviews /></ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_POLICIES} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><OperatorPolicies /></ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_DRIVERS} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><Drivers /></ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_EARNINGS} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><Earnings /></ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_SETTINGS} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><OperatorSettings /></ProtectedRoute>
          } />
          <Route path={ROUTES.OPERATOR_SUPPORT} element={
            <ProtectedRoute allowedRoles={['OPERATOR']}><OperatorSupport /></ProtectedRoute>
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
        </Suspense>
      </Router>
    </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
