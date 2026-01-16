import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Grid, TextField, Button, Box, CircularProgress, Alert, Card, CardContent, Divider, Chip } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Wallet = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }

      // Fetch Wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (walletError) throw new Error(walletError.message);
      setWallet(walletData || { balance: 0.00 });

      // Fetch Transactions
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', session.user.id)
        .order('created_at', { ascending: false });

      if (transError) throw new Error(transError.message);
      setTransactions(transData || []);

      // Fetch Withdrawal Requests
      const { data: withdrawData, error: withdrawError } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (withdrawError) throw new Error(withdrawError.message);
      setWithdrawRequests(withdrawData || []);

    } catch (err) {
      console.error('Error fetching wallet:', err.message);
      setError('Failed to load wallet information.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleWithdraw = useCallback(async (e) => {
    e.preventDefault();
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (parseFloat(withdrawAmount) > wallet.balance) {
      setError('Insufficient balance.');
      return;
    }

    try {
      setWithdrawing(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();

      const { error: withdrawError } = await supabase
        .from('withdraw_requests')
        .insert({
          user_id: session.user.id,
          amount: parseFloat(withdrawAmount),
          status: 'pending'
        });

      if (withdrawError) throw new Error(withdrawError.message);

      setMessage('Withdrawal request submitted successfully!');
      setWithdrawAmount('');
      fetchWalletData();
    } catch (err) {
      console.error('Error requesting withdrawal:', err.message);
      setError('Failed to submit withdrawal request.');
    } finally {
      setWithdrawing(false);
    }
  }, [withdrawAmount, wallet, fetchWalletData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Wallet
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card elevation={3} sx={{ bgcolor: 'primary.main', color: 'white', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6">Total Balance</Typography>
                  <Typography variant="h3" sx={{ my: 2 }}>
                    ${wallet?.balance?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2">Available for withdrawal</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" gutterBottom>Wallet Status</Typography>
                <Typography variant="body1">
                  <strong>Currency:</strong> {wallet?.currency || 'USD'}
                </Typography>
                <Typography variant="body1">
                  <strong>Last Updated:</strong> {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleString() : 'N/A'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Request Withdrawal</Typography>
            <form onSubmit={handleWithdraw}>
              <TextField
                fullWidth
                label="Amount to Withdraw"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                sx={{ mb: 2 }}
                disabled={withdrawing}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />
              <Button 
                variant="contained" 
                color="secondary" 
                fullWidth 
                type="submit"
                disabled={withdrawing || (wallet?.balance || 0) <= 0}
              >
                {withdrawing ? <CircularProgress size={24} color="inherit" /> : 'Withdraw Funds'}
              </Button>
            </form>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Withdrawal Requests</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {withdrawRequests.length > 0 ? (
              <Box>
                {withdrawRequests.map((req) => (
                  <Box key={req.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 2, borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 0 } }}>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">Withdrawal Request</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(req.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body1" fontWeight="bold">
                        ${parseFloat(req.amount).toFixed(2)}
                      </Typography>
                      <Chip 
                        label={req.status.toUpperCase()} 
                        size="small" 
                        color={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'error' : 'warning'}
                        sx={{ mt: 0.5, fontSize: '0.65rem', height: 18 }} 
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                No withdrawal requests found.
              </Typography>
            )}
          </Paper>

          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Transaction History</Typography>
              <Button size="small" onClick={fetchWalletData}>Refresh</Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {transactions.length > 0 ? (
              <Box>
                {transactions.map((tx) => (
                  <Box key={tx.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 2, borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 0 } }}>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">{tx.description || tx.transaction_type.toUpperCase()}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(tx.created_at).toLocaleString()} • {tx.status.toUpperCase()}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography 
                        variant="body1" 
                        color={tx.transaction_type === 'credit' ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {tx.transaction_type === 'credit' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                      </Typography>
                      <Chip label={tx.transaction_type} size="small" variant="outlined" sx={{ mt: 0.5, fontSize: '0.65rem', height: 18 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No transactions found yet.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Wallet;
