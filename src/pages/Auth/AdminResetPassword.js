import { useState, useEffect } from 'react';
import { Container, TextField, Button, Typography, Box, Paper, Alert } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const AdminResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSessionAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Invalid or expired reset link. Please request a new one.');
        return;
      }

      // Verify the user is an admin and signed up via admin panel
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, signup_source')
        .eq('user_id', session.user.id)
        .single();

      if (profileError || profile?.role !== 'admin' || profile?.signup_source !== 'admin') {
        await supabase.auth.signOut();
        setError('Access denied: This reset link is only for administrator accounts.');
        return;
      }

      setIsAuthorized(true);
    };
    checkSessionAndRole();
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw new Error(updateError.message);

      setMessage('Admin password updated successfully! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/admin/signin');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography component="h1" variant="h4" fontWeight="bold" color="secondary">
              New Admin Password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Set a secure password for your admin account
            </Typography>
          </Box>

          {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handlePasswordUpdate} sx={{ width: '100%' }}>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label="New Admin Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              color="secondary"
              disabled={!isAuthorized}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              color="secondary"
              disabled={!isAuthorized}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="secondary"
              sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 'bold' }}
              disabled={loading || !isAuthorized}
            >
              {loading ? 'Updating...' : 'Update Admin Password'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminResetPassword;
