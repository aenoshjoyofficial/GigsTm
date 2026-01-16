import { useState } from 'react';
import { Container, TextField, Button, Typography, Link, Box } from '@mui/material';
import { supabase } from '../../supabaseClient';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const trimmedEmail = email.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedFullName || !trimmedEmail || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address format.');
      setLoading(false);
      return;
    }

    try {
      // 1. Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedFullName,
            role: 'worker',
            signup_source: 'worker'
          }
        }
      });

      if (signUpError) throw new Error(signUpError.message);

      if (data.user) {
        // Profile and Wallet are now handled by a database trigger for better security and RLS compliance
        setMessage('Check your email for the verification link!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    setResending(true);
    setMessage('');
    setError('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (resendError) throw new Error(resendError.message);
      setMessage('Verification email resent! Please check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Sign Up for GigsTM
        </Typography>
        <Box component="form" onSubmit={handleSignUp} sx={{ mt: 3 }}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="fullName"
            label="Full Name"
            name="fullName"
            autoComplete="name"
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 1 }}
            disabled={loading || resending}
          >
            {loading ? 'Signing Up...' : 'Sign Up'}
          </Button>
          
          <Button
            fullWidth
            variant="text"
            onClick={handleResendVerification}
            disabled={loading || resending}
            sx={{ mb: 2 }}
          >
            {resending ? 'Resending...' : 'Resend Verification Email'}
          </Button>

          {message && <Typography color="success.main" textAlign="center">{message}</Typography>}
          {error && <Typography color="error.main" textAlign="center">{error}</Typography>}
          <Box sx={{ mt: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Link href="/signin" variant="body2">
              Already have an account? Sign In
            </Link>
            <Link href="/forgot-password" variant="body2">
              Forgot Password?
            </Link>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default SignUp;
