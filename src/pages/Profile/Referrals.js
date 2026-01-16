import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Box, Button, Grid, Card, CardContent, Divider, CircularProgress, Alert, List, ListItem, ListItemText, Chip } from '@mui/material';
import { ContentCopy as CopyIcon, People as PeopleIcon } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const Referrals = () => {
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchReferralData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Get or generate referral code
      const { data: refData, error: refError } = await supabase
        .from('referrals')
        .select('referral_code')
        .eq('referrer_id', session.user.id)
        .maybeSingle();

      if (refError) throw new Error(refError.message);

      if (refData) {
        setReferralCode(refData.referral_code);
      } else {
        // Generate new code if none exists
        const newCode = `GIGS-${session.user.id.substring(0, 8).toUpperCase()}`;
        // We just show it for now, in a real app you'd save it or have a dedicated table for codes
        setReferralCode(newCode);
      }

      // 2. Fetch people referred
      const { data: referredList, error: listError } = await supabase
        .from('referrals')
        .select(`
          *,
          referee:user_profiles!referrals_referee_id_fkey (full_name, created_at)
        `)
        .eq('referrer_id', session.user.id);

      if (listError) throw new Error(listError.message);
      setReferrals(referredList || []);

    } catch (err) {
      console.error('Error fetching referral data:', err.message);
      setError('Failed to load referral information: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referralCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [referralCode]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">Refer & Earn</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Invite your friends to GigsTM and earn rewards when they complete their first gig!
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Referral Code Card */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" gutterBottom>Your Referral Code</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
              <Typography variant="h3" fontWeight="bold" sx={{ letterSpacing: 2 }}>
                {referralCode}
              </Typography>
              <Button 
                variant="contained" 
                color="secondary" 
                startIcon={<CopyIcon />}
                onClick={handleCopy}
              >
                {copySuccess ? 'Copied!' : 'Copy'}
              </Button>
            </Box>
            <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
              Share this code with your friends during sign up.
            </Typography>
          </Paper>
        </Grid>

        {/* Stats Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{referrals.length}</Typography>
              <Typography color="text.secondary">Total Referrals</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {referrals.filter(r => r.status === 'completed').length}
              </Typography>
              <Typography color="text.secondary">Successful Referrals</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                ${(referrals.filter(r => r.status === 'completed').length * 10).toFixed(2)}
              </Typography>
              <Typography color="text.secondary">Total Earned</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Referral List */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Referral History</Typography>
            <Divider sx={{ mb: 2 }} />
            {referrals.length > 0 ? (
              <List>
                {referrals.map((ref) => (
                  <ListItem key={ref.id} divider>
                    <ListItemText 
                      primary={ref.referee?.full_name || 'New User'}
                      secondary={`Joined on ${new Date(ref.created_at).toLocaleDateString()}`}
                    />
                    <Chip 
                      label={ref.status.toUpperCase()} 
                      size="small"
                      color={ref.status === 'completed' ? 'success' : 'warning'}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                You haven't referred anyone yet. Start sharing your code!
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Referrals;
