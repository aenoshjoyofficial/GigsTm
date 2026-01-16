import { useState } from 'react';
import { Container, TextField, Button, Typography, Link, Box } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const SignIn = () => {
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
        // 2. Verify if the user is strictly a worker and signed up via worker panel
        let { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, full_name, signup_source')
          .eq('user_id', data.user.id)
          .single();

        // Handle case where profile might be missing for an existing auth user
        if (profileError && profileError.code === 'PGRST116') {
          // Auto-create a worker profile if it doesn't exist
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .upsert([
              {
                user_id: data.user.id,
                full_name: data.user.user_metadata?.full_name || email.split('@')[0],
                role: 'worker',
                signup_source: 'worker' // Assume worker if logging in here and missing profile
              }
            ], { onConflict: 'user_id' })
            .select()
            .single();
          
          if (createError) {
            console.error('Error auto-creating worker profile:', createError);
            await supabase.auth.signOut();
            throw new Error(`Access denied: Profile could not be established. (${createError.message})`);
          }
          
          // Also ensure wallet exists for the user
          await supabase
            .from('wallets')
            .upsert([{ user_id: data.user.id, balance: 0 }], { onConflict: 'user_id' });

          profile = newProfile;
          profileError = null;
        }

        if (profileError || profile?.role !== 'worker' || profile?.signup_source !== 'worker') {
          // If a non-worker or someone who didn't sign up as worker tries to log in here, sign them out
          await supabase.auth.signOut();
          let errorMessage = 'Access denied: You do not have permission to sign in here.';
          
          if (profile?.role === 'admin') {
            errorMessage = 'Access denied: Administrators must use the Admin Portal.';
          } else if (profile?.signup_source === 'admin') {
            errorMessage = 'Access denied: This account was registered as an Admin.';
          }
          
          throw new Error(errorMessage);
        }

        navigate('/');
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
        <Typography component="h1" variant="h5">
          Sign In to GigsTM
        </Typography>
        <Box component="form" onSubmit={handleSignIn} sx={{ mt: 3 }}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
          {error && <Typography color="error.main" textAlign="center">{error}</Typography>}
          <Box sx={{ mt: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Link href="/forgot-password" variant="body2">
              Forgot Password?
            </Link>
            <Link href="/signup" variant="body2">
              Don't have an account? Sign Up
            </Link>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default SignIn;
