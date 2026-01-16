import { useState, useEffect, useCallback } from 'react';
import { Container, Grid, Paper, Typography, Box, CircularProgress, Alert, Card, CardContent, Divider } from '@mui/material';
import { People, Work, Payment, AssignmentTurnedIn, TrendingUp } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGigs: 0,
    totalPayouts: 0,
    totalApplications: 0,
    acceptedApplications: 0,
    pendingClaims: 0,
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch stats in parallel
      const [
        { count: userCount, error: userError },
        { count: gigCount, error: gigError },
        { data: payoutData, error: payoutError },
        { count: appCount, error: appError },
        { count: acceptedAppCount, error: acceptedAppError },
        { count: pendingClaimCount, error: claimError }
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('gigs').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount').eq('transaction_type', 'credit').eq('status', 'completed'),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
        supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      if (userError || gigError || payoutError || appError || acceptedAppError || claimError) {
        throw new Error('Failed to fetch some analytics data');
      }

      const totalPayoutAmount = payoutData.reduce((sum, tx) => sum + Number(tx.amount), 0);

      setStats({
        totalUsers: userCount || 0,
        totalGigs: gigCount || 0,
        totalPayouts: totalPayoutAmount,
        totalApplications: appCount || 0,
        acceptedApplications: acceptedAppCount || 0,
        pendingClaims: pendingClaimCount || 0,
      });

    } catch (err) {
      console.error('Analytics Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const StatCard = ({ title, value, icon, color }) => (
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            bgcolor: `${color}.light`, 
            color: `${color}.main`,
            display: 'flex',
            mr: 2
          }}>
            {icon}
          </Box>
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">
          {typeof value === 'number' && title.includes('Payout') ? `$${value.toFixed(2)}` : value}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">System Analytics</Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Overview of platform performance
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Main Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Workers" 
            value={stats.totalUsers} 
            icon={<People />} 
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Gigs" 
            value={stats.totalGigs} 
            icon={<Work />} 
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Payouts" 
            value={stats.totalPayouts} 
            icon={<Payment />} 
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Active Work Orders" 
            value={stats.acceptedApplications} 
            icon={<AssignmentTurnedIn />} 
            color="warning"
          />
        </Grid>

        {/* Detailed Breakdown */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Platform Engagement</Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <Box>
                <Typography variant="h4" color="primary.main">{stats.totalApplications}</Typography>
                <Typography variant="body2" color="text.secondary">Total Applications</Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="warning.main">{stats.pendingClaims}</Typography>
                <Typography variant="body2" color="text.secondary">Pending Task Verifications</Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="success.main">
                  {stats.totalApplications > 0 ? Math.round((stats.acceptedApplications / stats.totalApplications) * 100) : 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">Acceptance Rate</Typography>
              </Box>
            </Box>
            
            <Box sx={{ mt: 5, p: 4, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">Growth Insights</Typography>
              <Typography variant="body2" color="text.secondary">
                The platform has seen a steady increase in worker applications and gig completions this month.
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <Typography variant="h6" gutterBottom>Admin Quick Actions</Typography>
            <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2">
                • Review {stats.pendingClaims} pending task claims
              </Typography>
              <Typography variant="body2">
                • {stats.totalApplications - stats.acceptedApplications} pending applications need review
              </Typography>
              <Typography variant="body2">
                • Check system health and logs
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminAnalytics;
