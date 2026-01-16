import { useState, useEffect, useCallback } from 'react';
import { Container, TextField, Button, Typography, Box, Paper, CircularProgress, Grid, Alert } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { AdminPanelSettings, Phone, CalendarToday, Language, Public } from '@mui/icons-material';

const AdminProfile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const getProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
          navigate('/admin/signin');
          return;
        }

        let { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [navigate]);

  const updateProfile = useCallback(async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setError('User not authenticated.');
        return;
      }

      const updates = {
        user_id: user.id,
        full_name: profile?.full_name || '',
        avatar_url: profile?.avatar_url || '',
        contact_number: profile?.contact_number || '',
        address: profile?.address || '',
        date_of_birth: profile?.date_of_birth || null,
        country: profile?.country || '',
        timezone: profile?.timezone || '',
        updated_at: new Date(),
      };

      let { error } = await supabase.from('user_profiles').upsert(updates, {
        onConflict: 'user_id',
      });

      if (error) throw error;
      setMessage('Admin profile updated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  if (loading && !profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <AdminPanelSettings color="secondary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">Admin Profile</Typography>
          <Typography variant="body1" color="text.secondary">Manage your administrative account settings</Typography>
        </Box>
      </Box>

      {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper elevation={3} sx={{ p: 4 }}>
        <form onSubmit={updateProfile}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="secondary" fontWeight="bold">
                Personal Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Full Name"
                fullWidth
                value={profile?.full_name || ''}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                color="secondary"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Number"
                fullWidth
                value={profile?.contact_number || ''}
                onChange={(e) => setProfile({ ...profile, contact_number: e.target.value })}
                color="secondary"
                InputProps={{
                  startAdornment: <Phone sx={{ color: 'text.secondary', mr: 1 }} />
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Avatar URL"
                fullWidth
                value={profile?.avatar_url || ''}
                onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                color="secondary"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Address"
                fullWidth
                multiline
                rows={2}
                value={profile?.address || ''}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                color="secondary"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Date of Birth"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={profile?.date_of_birth || ''}
                onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                color="secondary"
                InputProps={{
                  startAdornment: <CalendarToday sx={{ color: 'text.secondary', mr: 1 }} />
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Country"
                fullWidth
                value={profile?.country || ''}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                color="secondary"
                InputProps={{
                  startAdornment: <Public sx={{ color: 'text.secondary', mr: 1 }} />
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Timezone"
                fullWidth
                value={profile?.timezone || ''}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                color="secondary"
                InputProps={{
                  startAdornment: <Language sx={{ color: 'text.secondary', mr: 1 }} />
                }}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button 
                type="submit" 
                variant="contained" 
                color="secondary" 
                size="large"
                disabled={loading}
                sx={{ px: 4, fontWeight: 'bold' }}
              >
                {loading ? 'Updating...' : 'Update Admin Profile'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">Account Status</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} />
          <Typography variant="body2">Administrator Access: <strong>Active</strong></Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Your account has full administrative privileges for the GigsTM platform.
        </Typography>
      </Paper>
    </Container>
  );
};

export default AdminProfile;
