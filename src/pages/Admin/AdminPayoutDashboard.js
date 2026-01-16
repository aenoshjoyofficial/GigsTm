import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, CircularProgress, Alert, Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { supabase } from '../../supabaseClient';

const AdminPayoutDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  const fetchWithdrawRequests = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('withdraw_requests')
        .select(`
          *,
          user_profiles (full_name),
          wallets (balance)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      setWithdrawRequests(data || []);
    } catch (err) {
      console.error('Error fetching withdrawal requests:', err.message);
      setError('Failed to load withdrawal requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawRequests();
  }, [fetchWithdrawRequests]);

  const handleAction = useCallback((request) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  }, []);

  const processWithdrawal = useCallback(async (status) => {
    try {
      setLoading(true);
      
      // 1. Update Withdrawal Request
      const { error: updateError } = await supabase
        .from('withdraw_requests')
        .update({ 
          status: status,
          updated_at: new Date()
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw new Error(updateError.message);

      // 2. If approved, deduct from wallet and create transaction
      if (status === 'approved') {
        const { error: walletError } = await supabase
          .from('wallets')
          .update({ balance: selectedRequest.wallets.balance - selectedRequest.amount })
          .eq('user_id', selectedRequest.user_id);

        if (walletError) throw new Error(walletError.message);

        await supabase.from('transactions').insert({
          wallet_id: selectedRequest.user_id,
          amount: selectedRequest.amount,
          transaction_type: 'debit',
          status: 'completed',
          description: `Withdrawal request #${selectedRequest.id} approved`
        });
      }

      // 3. Trigger Notification
      await supabase.rpc('create_notification', {
        p_user_id: selectedRequest.user_id,
        p_title: `Withdrawal Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        p_message: `Your withdrawal request for $${selectedRequest.amount.toFixed(2)} has been ${status}. ${remarks ? 'Remarks: ' + remarks : ''}`,
        p_type: status === 'approved' ? 'success' : 'error',
        p_link: '/wallet'
      });

      setDialogOpen(false);
      setRemarks('');
      fetchWithdrawRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedRequest, remarks, fetchWithdrawRequests]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Admin Payout Dashboard</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Worker</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Wallet Balance</TableCell>
                <TableCell>Requested Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {withdrawRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <Typography variant="body2"><strong>{req.user_profiles?.full_name || 'Unknown Worker'}</strong></Typography>
                  </TableCell>
                  <TableCell>${req.amount.toFixed(2)}</TableCell>
                  <TableCell>${req.wallets?.balance.toFixed(2)}</TableCell>
                  <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip 
                      label={req.status.toUpperCase()} 
                      color={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'error'} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {req.status === 'pending' && (
                      <Button variant="outlined" size="small" onClick={() => handleAction(req)}>Process</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {withdrawRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">No withdrawal requests found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Process Withdrawal Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Withdrawal Request</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">
              <strong>Worker:</strong> {selectedRequest?.user_profiles?.full_name || 'Unknown Worker'}
            </Typography>
            <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
              Amount: ${selectedRequest?.amount.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Available Wallet Balance: ${selectedRequest?.wallets?.balance.toFixed(2)}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Admin Remarks"
              variant="outlined"
              sx={{ mt: 3 }}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={() => processWithdrawal('rejected')}>Reject</Button>
          <Button color="success" variant="contained" onClick={() => processWithdrawal('approved')}>Approve & Payout</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPayoutDashboard;
