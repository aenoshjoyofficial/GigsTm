import { useState, useEffect, useCallback } from 'react';
import { Container, Grid, Paper, Typography, Box, CircularProgress, Card, CardContent, Divider } from '@mui/material';
import { People, Work, AccountBalanceWallet, TrendingUp, CheckCircle, Assignment } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGigs: 0,
    activeGigs: 0,
    totalPayouts: 0,
    pendingWithdrawals: 0,
    totalClaims: 0,
    approvedClaims: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      const [
        usersCount,
        gigsCount,
        activeGigsCount,
        payoutsSum,
        pendingWithdrawalsCount,
        claimsCount,
        approvedClaimsCount
      ] = await Promise.all([
        supabase.from('user_profiles').select('user_id', { count: 'exact', head: true }),
        supabase.from('gigs').select('id', { count: 'exact', head: true }),
        supabase.from('gigs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('transactions').select('amount').eq('transaction_type', 'debit'),
        supabase.from('withdraw_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('claims').select('id', { count: 'exact', head: true }),
        supabase.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      ]);

      const totalPayouts = payoutsSum.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

      setStats({
        totalUsers: usersCount.count || 0,
        totalGigs: gigsCount.count || 0,
        activeGigs: activeGigsCount.count || 0,
        totalPayouts: totalPayouts.toFixed(2),
        pendingWithdrawals: pendingWithdrawalsCount.count || 0,
        totalClaims: claimsCount.count || 0,
        approvedClaims: approvedClaimsCount.count || 0,
      });

    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
          <Typography variant="h6" color="text.secondary">{title}</Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">{value}</Typography>
      </CardContent>
    </Card>
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">Admin Overview</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Platform performance and key metrics.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Total Users" 
            value={stats.totalUsers} 
            icon={<People />} 
            color="primary" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Active Gigs" 
            value={`${stats.activeGigs} / ${stats.totalGigs}`} 
            icon={<Work />} 
            color="success" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Total Payouts" 
            value={`$${stats.totalPayouts}`} 
            icon={<AccountBalanceWallet />} 
            color="warning" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Pending Withdrawals" 
            value={stats.pendingWithdrawals} 
            icon={<TrendingUp />} 
            color="info" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Approved Claims" 
            value={`${stats.approvedClaims} / ${stats.totalClaims}`} 
            icon={<CheckCircle />} 
            color="secondary" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Success Rate" 
            value={stats.totalClaims > 0 ? `${((stats.approvedClaims / stats.totalClaims) * 100).toFixed(1)}%` : '0%'} 
            icon={<Assignment />} 
            color="error" 
          />
        </Grid>
      </Grid>

      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h6" gutterBottom>System Announcements</Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography color="text.secondary">
          No active system-wide announcements.
        </Typography>
      </Paper>
    </Container>
  );
};

export default AdminDashboard;
