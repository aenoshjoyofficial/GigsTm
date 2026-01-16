
import { Routes, Route, Link } from 'react-router-dom';
import { Button, Typography, Box, Grid, Card, CardContent, CardActions } from '@mui/material';
import { Work, Dashboard, AccountBalanceWallet, Person } from '@mui/icons-material';
import SignIn from './pages/Auth/SignIn';
import AdminSignIn from './pages/Auth/AdminSignIn';
import SignUp from './pages/Auth/SignUp';
import AdminSignUp from './pages/Auth/AdminSignUp';
import AdminForgotPassword from './pages/Auth/AdminForgotPassword';
import AdminResetPassword from './pages/Auth/AdminResetPassword';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Profile from './pages/Profile/Profile';
import Referrals from './pages/Profile/Referrals';
import KYCDocumentUpload from './pages/KYC/KYCDocumentUpload';
import GigList from './pages/Gigs/GigList';
import GigDetails from './pages/Gigs/GigDetails';
import CreateGig from './pages/Gigs/CreateGig';
import ApplicationDashboard from './pages/Applications/ApplicationDashboard';
import MCQTest from './pages/Applications/MCQTest';
import Training from './pages/Applications/Training';
import TaskSubmission from './pages/Tasks/TaskSubmission';
import DisputeResolution from './pages/Disputes/DisputeResolution';
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import AdminPayoutDashboard from './pages/Admin/AdminPayoutDashboard';
import AdminAnalytics from './pages/Admin/AdminAnalytics';
import ActivityLogs from './pages/Admin/ActivityLogs';
import UserManagement from './pages/Admin/UserManagement';
import Notifications from './pages/Notifications/Notifications';
import Messages from './pages/Messages/Messages';
import Wallet from './pages/Wallet/Wallet';
import SupportTicketList from './pages/Support/SupportTicketList';
import CreateTicket from './pages/Support/CreateTicket';
import TicketDetails from './pages/Support/TicketDetails';
import FAQs from './pages/Support/FAQs';
import Announcements from './pages/Announcements/Announcements';
import ManageAnnouncements from './pages/Admin/ManageAnnouncements';
import ManageKYC from './pages/Admin/ManageKYC';
import ManageDisputes from './pages/Admin/ManageDisputes';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminProfile from './pages/Admin/AdminProfile';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import { Navigate } from 'react-router-dom';

// Professional Home Component
const Home = () => {
  const features = [
    { title: 'Find Gigs', icon: <Work fontSize="large" color="primary" />, description: 'Browse and apply for available tasks in your area.', link: '/gigs', buttonText: 'Browse Gigs' },
    { title: 'My Dashboard', icon: <Dashboard fontSize="large" color="secondary" />, description: 'Track your applications, active work, and submissions.', link: '/applications', buttonText: 'Go to Dashboard' },
    { title: 'Wallet & Payouts', icon: <AccountBalanceWallet fontSize="large" color="success" />, description: 'Manage your earnings and request withdrawals.', link: '/wallet', buttonText: 'View Wallet' },
    { title: 'My Profile', icon: <Person fontSize="large" color="info" />, description: 'Update your personal info and manage your experience.', link: '/profile', buttonText: 'View Profile' },
  ];

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" color="primary">
          Welcome to GigsTM
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Your one-stop destination for gig-based opportunities and task management.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 4 } }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                <Typography gutterBottom variant="h5" component="h2" fontWeight="bold">
                  {feature.title}
                </Typography>
                <Typography color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button size="small" variant="contained" component={Link} to={feature.link}>
                  {feature.buttonText}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 8, p: 4, backgroundColor: 'primary.light', borderRadius: 4, color: 'white', textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Need Help?
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Check our FAQs or contact support for any assistance with your gigs.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="contained" color="secondary" component={Link} to="/faq">Read FAQ</Button>
          <Button variant="outlined" sx={{ color: 'white', borderColor: 'white' }} component={Link} to="/support">Contact Support</Button>
        </Box>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/admin/signin" element={<AdminSignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/admin/signup" element={<AdminSignUp />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/referrals"
          element={
            <ProtectedRoute>
              <Referrals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kyc"
          element={
            <ProtectedRoute>
              <KYCDocumentUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gigs"
          element={
            <ProtectedRoute>
              <GigList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gigs/create"
          element={
            <ProtectedRoute>
              <CreateGig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gigs/:id"
          element={
            <ProtectedRoute>
              <GigDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute>
              <ApplicationDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications/:applicationId/test"
          element={
            <ProtectedRoute>
              <MCQTest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications/:applicationId/training"
          element={
            <ProtectedRoute>
              <Training />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks/:workOrderId/submit"
          element={
            <ProtectedRoute>
              <TaskSubmission />
            </ProtectedRoute>
          }
        />
        <Route
          path="/disputes/:claimId"
          element={
            <ProtectedRoute>
              <DisputeResolution />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payouts"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPayoutDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ManageAnnouncements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/kyc"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ManageKYC />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/disputes"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ManageDisputes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <ProtectedRoute>
              <Announcements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <SupportTicketList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support/create"
          element={
            <ProtectedRoute>
              <CreateTicket />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support/tickets/:id"
          element={
            <ProtectedRoute>
              <TicketDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faq"
          element={<FAQs />}
        />
      </Routes>
    </Layout>
  );
}

export default App;