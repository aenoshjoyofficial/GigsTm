import { useState } from 'react';
import { Container, TextField, Button, Typography, Link, Box, Paper, Alert } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const AdminSignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Sign in with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw new Error(signInError.message);

      if (data.user) {
        // 2. Verify if the user is an admin and signed up via admin panel
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, signup_source')
          .eq('user_id', data.user.id)
          .single();

        if (profileError || profile?.role !== 'admin' || profile?.signup_source !== 'admin') {
          // If not an admin or didn't sign up as admin, sign them out immediately
          await supabase.auth.signOut();
          let errorMessage = 'Access denied: This login is only for administrators.';
          
          if (profile?.role === 'worker') {
            errorMessage = 'Access denied: Workers must use the Worker Portal.';
          } else if (profile?.signup_source === 'worker') {
            errorMessage = 'Access denied: This account was registered as a Worker.';
          }
          
          throw new Error(errorMessage);
        }

        // 3. Navigate to admin dashboard
        navigate('/admin/dashboard');
      }
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
              Admin Portal
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Secure login for GigsTM Administrators
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSignIn}>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="email"
              label="Admin Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              color="secondary"
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              color="secondary"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="secondary"
              sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 'bold' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In to Admin Panel'}
            </Button>
            <Box sx={{ mt: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/admin/forgot-password" variant="body2" color="secondary">
                Forgot admin password?
              </Link>
              <Link href="/admin/signup" variant="body2" color="secondary">
                Register new admin account
              </Link>
              <Link href="/signin" variant="body2" color="text.secondary">
                Looking for worker login?
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminSignIn;
