import { useState, useEffect, useCallback } from 'react';
import { 
  Container, Typography, Box, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, IconButton, Button, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Alert, Snackbar
} from '@mui/material';
import { Visibility, Gavel, Refresh } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const ManageDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [resolution, setResolution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: disputeError } = await supabase
        .from('disputes')
        .select(`
          *,
          user_profiles (full_name, email),
          claims (
            id,
            status,
            work_orders (
              applications (
                gigs (title)
              )
            ),
            gig_steps (title)
          )
        `)
        .order('created_at', { ascending: false });

      if (disputeError) throw new Error(disputeError.message);
      setDisputes(data || []);
    } catch (err) {
      console.error('Error fetching disputes:', err.message);
      setError('Failed to load disputes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleOpenResolve = useCallback((dispute) => {
    setSelectedDispute(dispute);
    setResolution(dispute.resolution || '');
    setOpenDialog(true);
  }, []);

  const handleResolve = useCallback(async (newStatus) => {
    if (!resolution.trim()) {
      setError('Please provide a resolution explanation.');
      return;
    }

    try {
      setSubmitting(true);
      
      // 1. Update dispute status and resolution
      const { error: disputeError } = await supabase
        .from('disputes')
        .update({ 
          status: newStatus, 
          resolution: resolution 
        })
        .eq('id', selectedDispute.id);

      if (disputeError) throw new Error(disputeError.message);

      // 2. If resolved as 'resolved' (meaning worker won), update claim to approved
      // If 'closed' (meaning worker lost), keep claim as rejected/disputed or update to rejected
      if (newStatus === 'resolved') {
        const { error: claimError } = await supabase
          .from('claims')
          .update({ status: 'approved' })
          .eq('id', selectedDispute.claim_id);
        
        if (claimError) throw new Error(claimError.message);

        // Also create a notification for the worker
        await supabase.rpc('create_notification', {
          p_user_id: selectedDispute.user_id,
          p_title: 'Dispute Resolved',
          p_message: `Your dispute for "${selectedDispute.claims?.work_orders?.applications?.gigs?.title}" has been resolved in your favor.`,
          p_type: 'success',
          p_link: `/disputes/${selectedDispute.claim_id}`
        });
      } else {
        // Just notify about the closure
        await supabase.rpc('create_notification', {
          p_user_id: selectedDispute.user_id,
          p_title: 'Dispute Closed',
          p_message: `The dispute for "${selectedDispute.claims?.work_orders?.applications?.gigs?.title}" has been closed.`,
          p_type: 'info',
          p_link: `/disputes/${selectedDispute.claim_id}`
        });
      }

      setSuccessMsg(`Dispute ${newStatus} successfully.`);
      setOpenDialog(false);
      fetchDisputes();
    } catch (err) {
      console.error('Error resolving dispute:', err.message);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [resolution, selectedDispute, fetchDisputes]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'open': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'error';
      default: return 'default';
    }
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Manage Disputes</Typography>
        <IconButton onClick={fetchDisputes} disabled={loading}>
          <Refresh />
        </IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell>Worker</TableCell>
                <TableCell>Gig / Step</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {disputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">No disputes found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                disputes.map((dispute) => (
                  <TableRow key={dispute.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{dispute.user_profiles?.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{dispute.user_profiles?.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{dispute.claims?.work_orders?.applications?.gigs?.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{dispute.claims?.gig_steps?.title}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ 
                        maxWidth: 250, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {dispute.reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={dispute.status.toUpperCase()} 
                        size="small" 
                        color={getStatusColor(dispute.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(dispute.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenResolve(dispute)}
                        title="View & Resolve"
                      >
                        {dispute.status === 'open' ? <Gavel /> : <Visibility />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Resolve Dispute Dialog */}
      <Dialog open={openDialog} onClose={() => !submitting && setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDispute?.status === 'open' ? 'Resolve Dispute' : 'Dispute Details'}
        </DialogTitle>
        <DialogContent dividers>
          {selectedDispute && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Worker: {selectedDispute.user_profiles?.full_name}</Typography>
              <Typography variant="subtitle2" gutterBottom>Gig: {selectedDispute.claims?.work_orders?.applications?.gigs?.title}</Typography>
              <Typography variant="subtitle2" gutterBottom>Step: {selectedDispute.claims?.gig_steps?.title}</Typography>
              
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold">Reason for Dispute:</Typography>
                <Typography variant="body2">{selectedDispute.reason}</Typography>
              </Box>

              {selectedDispute.status === 'open' ? (
                <TextField
                  fullWidth
                  label="Resolution Explanation"
                  multiline
                  rows={4}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  sx={{ mt: 3 }}
                  placeholder="Explain your decision to the worker..."
                />
              ) : (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold">Resolution ({selectedDispute.status}):</Typography>
                  <Typography variant="body2">{selectedDispute.resolution}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={submitting}>Cancel</Button>
          {selectedDispute?.status === 'open' && (
            <>
              <Button 
                onClick={() => handleResolve('closed')} 
                color="error" 
                disabled={submitting}
              >
                Reject Dispute
              </Button>
              <Button 
                onClick={() => handleResolve('resolved')} 
                variant="contained" 
                color="success" 
                disabled={submitting}
              >
                Approve Claim
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={!!successMsg} 
        autoHideDuration={6000} 
        onClose={() => setSuccessMsg('')}
      >
        <Alert severity="success" sx={{ width: '100%' }}>{successMsg}</Alert>
      </Snackbar>
    </Container>
  );
};

export default ManageDisputes;
