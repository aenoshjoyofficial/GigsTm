import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CircularProgress, Box, Typography, Button } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {


    const checkAuth = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        const session = data?.session;

        if (sessionError) {
          console.error('Error getting session:', sessionError.message);
          setIsAuthenticated(false);
          setLoading(false);
          navigate('/signin');
          return;
        }
        
        if (!session) {
          setIsAuthenticated(false);
          setLoading(false);
          // If accessing admin route, go to admin signin, otherwise worker signin
          if (window.location.pathname.startsWith('/admin')) {
            navigate('/admin/signin');
          } else {
            navigate('/signin');
          }
          return;
        }
        setIsAuthenticated(true);

        // Fetch user profile to get role
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (profile might not exist yet)
          console.error('Error fetching user role:', error.message);
          setUserRole('guest');
        } else if (profile) {
          setUserRole(profile.role);
        } else {
          setUserRole('guest'); // No profile found, default to guest
        }
      } catch (err) {
        console.error('Unexpected error during authentication check:', err.message);
        setIsAuthenticated(false);
        navigate('/signin');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkAuth(); // Re-check auth and role on sign-in
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        if (window.location.pathname.startsWith('/admin')) {
          navigate('/admin/signin');
        } else {
          navigate('/signin');
        }
      }
    });

    return () => {
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null; // The navigate('/signin') above should handle the redirection
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error">
          Access Denied: You do not have the required permissions.
        </Typography>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }} variant="contained">Go to Home</Button>
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;
