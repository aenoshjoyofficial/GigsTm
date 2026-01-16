import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Box, Button, TextField, CircularProgress, Alert, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';

const DisputeResolution = () => {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [claim, setClaim] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [reason, setReason] = useState('');

  const fetchDisputeData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch claim info
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .select(`
          *,
          gig_steps (title),
          work_orders (applications (gigs (title)))
        `)
        .eq('id', claimId)
        .single();

      if (claimError) throw new Error(claimError.message);
      setClaim(claimData);

      // Fetch existing disputes for this claim
      const { data: disputeData, error: disputeError } = await supabase
        .from('disputes')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false });

      if (disputeError) throw new Error(disputeError.message);
      setDisputes(disputeData || []);
    } catch (err) {
      console.error('Error fetching dispute data:', err.message);
      setError('Failed to load dispute details: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    if (claimId) {
      fetchDisputeData();
    }
  }, [claimId, fetchDisputeData]);

  const handleSubmitDispute = useCallback(async () => {
    if (!reason.trim()) return;
    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.from('disputes').insert({
        claim_id: claimId,
        user_id: session.user.id,
        reason: reason,
        status: 'open'
      });

      if (error) throw new Error(error.message);

      // Also update claim status to 'disputed'
      await supabase.from('claims').update({ status: 'disputed' }).eq('id', claimId);

      setReason('');
      fetchDisputeData();
      alert('Dispute submitted successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [claimId, reason, fetchDisputeData]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Dispute Resolution</Typography>
        
        {claim && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" color="primary">
              Gig: {claim.work_orders?.applications?.gigs?.title}
            </Typography>
            <Typography variant="subtitle1">
              Step: {claim.gig_steps?.title}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip 
                label={`Claim Status: ${claim.status.toUpperCase()}`} 
                color={claim.status === 'rejected' ? 'error' : 'warning'} 
                variant="outlined" 
              />
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>Raise a Dispute</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          If you believe your claim was wrongly rejected, please provide a reason for the dispute.
        </Typography>
        
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          placeholder="Explain why you are disputing the rejection..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmitDispute}
          disabled={submitting || !reason.trim()}
        >
          {submitting ? 'Submitting...' : 'Submit Dispute'}
        </Button>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" gutterBottom>Dispute History</Typography>
        {disputes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No disputes raised yet.</Typography>
        ) : (
          <List>
            {disputes.map((dispute) => (
              <ListItem key={dispute.id} alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2">
                        {new Date(dispute.created_at).toLocaleString()}
                      </Typography>
                      <Chip size="small" label={dispute.status} color={dispute.status === 'open' ? 'warning' : 'success'} />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.primary">
                        <strong>Reason:</strong> {dispute.reason}
                      </Typography>
                      {dispute.resolution && (
                        <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                          <strong>Resolution:</strong> {dispute.resolution}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        <Box sx={{ mt: 4 }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default DisputeResolution;
