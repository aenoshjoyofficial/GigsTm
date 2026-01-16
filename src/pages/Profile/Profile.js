import { useState, useEffect, useCallback } from 'react';
import { Container, TextField, Button, Typography, Box, Paper, CircularProgress, Grid } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AccountBalanceWallet, Star, TrendingUp } from '@mui/icons-material';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [stats, setStats] = useState({ completedGigs: 0, totalEarnings: 0 });
  const [newExperience, setNewExperience] = useState({ title: '', company: '', start_date: '', end_date: '', description: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const getProfileAndStats = async () => {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        navigate('/signin');
        return;
      }

      // 1. Fetch Profile and Experiences
      let { data: profileData, error: profileError, status } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_experiences (*)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError && status !== 406) {
        throw new Error(profileError.message);
      }

      if (profileData) {
        setProfile(profileData);
        setExperiences(profileData.user_experiences || []);
      }

      // 2. Fetch Stats
      const [claimsResult, walletResult, , totalClaimsResult] = await Promise.all([
        supabase
          .from('claims')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'approved'),
        supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('application_feedback')
          .select('rating')
          .eq('application_id', (
            supabase
              .from('applications')
              .select('id')
              .eq('user_id', user.id)
          )),
        supabase
          .from('claims')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
      ]);

      // Calculate average rating manually if nested select fails or is complex
      const { data: feedbackData } = await supabase
        .from('application_feedback')
        .select('rating, applications!inner(user_id)')
        .eq('applications.user_id', user.id);

      const avgRating = feedbackData?.length > 0 
        ? feedbackData.reduce((acc, curr) => acc + curr.rating, 0) / feedbackData.length 
        : 0;

      setStats({
        completedGigs: claimsResult.count || 0,
        totalEarnings: walletResult.data?.balance || 0,
        avgRating: avgRating.toFixed(1),
        successRate: totalClaimsResult.count > 0 
          ? ((claimsResult.count / totalClaimsResult.count) * 100).toFixed(0) 
          : 0
      });

      setLoading(false);
    };

    getProfileAndStats();
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
        setLoading(false);
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

      if (error) {
        throw new Error(error.message);
      }
      setMessage('Profile updated successfully!');
    } catch (error) {
      setError(error.message);
      console.error('Error updating profile:', error.message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const handleExperienceChange = useCallback((e, index, field) => {
    const updatedExperiences = [...experiences];
    updatedExperiences[index][field] = e.target.value;
    setExperiences(updatedExperiences);
  }, [experiences]);

  const addExperience = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setError('User not authenticated.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_experiences')
        .insert({ user_id: user.id, ...newExperience })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      setExperiences([...experiences, data]);
      setNewExperience({ title: '', company: '', start_date: '', end_date: '', description: '' });
      setMessage('Experience added successfully!');
    } catch (error) {
      setError(error.message);
      console.error('Error adding experience:', error.message);
    } finally {
      setLoading(false);
    }
  }, [experiences, newExperience]);

  if (loading) {
    return (
      <Container component="main" maxWidth="md" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Typography component="h1" variant="h4" gutterBottom>
        Your Profile
      </Typography>
      {message && <Typography color="success">{message}</Typography>}
      {error && <Typography color="error">{error}</Typography>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
            <CheckCircle sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">{stats.completedGigs}</Typography>
            <Typography variant="body2">Gigs Completed</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
            <AccountBalanceWallet sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">${stats.totalEarnings}</Typography>
            <Typography variant="body2">Wallet Balance</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
            <Star sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">{stats.avgRating}/5</Typography>
            <Typography variant="body2">Avg Rating</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
            <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4">{stats.successRate}%</Typography>
            <Typography variant="body2">Success Rate</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Profile Information
        </Typography>
        <form onSubmit={updateProfile}>
          <TextField
            label="Full Name"
            fullWidth
            margin="normal"
            value={profile?.full_name || ''}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
          />
          <TextField
            label="Avatar URL"
            fullWidth
            margin="normal"
            value={profile?.avatar_url || ''}
            onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
          />
          <TextField
            label="Contact Number"
            fullWidth
            margin="normal"
            value={profile?.contact_number || ''}
            onChange={(e) => setProfile({ ...profile, contact_number: e.target.value })}
          />
          <TextField
            label="Address"
            fullWidth
            margin="normal"
            value={profile?.address || ''}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />
          <TextField
            label="Date of Birth"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={profile?.date_of_birth || ''}
            onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
          />
          <TextField
            label="Country"
            fullWidth
            margin="normal"
            value={profile?.country || ''}
            onChange={(e) => setProfile({ ...profile, country: e.target.value })}
          />
          <TextField
            label="Timezone"
            fullWidth
            margin="normal"
            value={profile?.timezone || ''}
            onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
          />
          <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={loading}>
            Update Profile
          </Button>
        </form>
      </Paper>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Experiences
        </Typography>
        {experiences.map((exp, index) => (
          <Box key={exp.id} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: '4px' }}>
            <TextField
              label="Title"
              fullWidth
              margin="normal"
              value={exp.title || ''}
              onChange={(e) => handleExperienceChange(e, index, 'title')}
            />
            <TextField
              label="Company"
              fullWidth
              margin="normal"
              value={exp.company || ''}
              onChange={(e) => handleExperienceChange(e, index, 'company')}
            />
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={exp.start_date || ''}
              onChange={(e) => handleExperienceChange(e, index, 'start_date')}
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={exp.end_date || ''}
              onChange={(e) => handleExperienceChange(e, index, 'end_date')}
            />
            <TextField
              label="Description"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              value={exp.description || ''}
              onChange={(e) => handleExperienceChange(e, index, 'description')}
            />
            {/* Implement update/delete for existing experiences */}
          </Box>
        ))}

        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
          Add New Experience
        </Typography>
        <TextField
          label="Title"
          fullWidth
          margin="normal"
          value={newExperience.title}
          onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
        />
        <TextField
          label="Company"
          fullWidth
          margin="normal"
          value={newExperience.company}
          onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
        />
        <TextField
          label="Start Date"
          type="date"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          value={newExperience.start_date}
          onChange={(e) => setNewExperience({ ...newExperience, start_date: e.target.value })}
        />
        <TextField
          label="End Date"
          type="date"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          value={newExperience.end_date}
          onChange={(e) => setNewExperience({ ...newExperience, end_date: e.target.value })}
        />
        <TextField
          label="Description"
          fullWidth
          margin="normal"
          multiline
          rows={3}
          value={newExperience.description}
          onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
        />
        <Button variant="contained" sx={{ mt: 2 }} onClick={addExperience} disabled={loading}>
          Add Experience
        </Button>
      </Paper>
    </Container>
  );
};

export default Profile;
