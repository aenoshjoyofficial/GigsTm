import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Tabs, Tab, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { supabase } from '../../supabaseClient';

const ClaimMediaView = ({ claimId }) => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('claim_media')
      .select('*')
      .eq('claim_id', claimId);
    if (!error) setMedia(data || []);
    setLoading(false);
  }, [claimId]);

  useEffect(() => {
    if (claimId) {
      fetchMedia();
    }
  }, [claimId, fetchMedia]);

  if (loading) return <CircularProgress size={20} />;
  if (media.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2">Submitted Media:</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
        {media.map((item) => (
          <Box key={item.id} sx={{ position: 'relative' }}>
            {item.media_type === 'image' ? (
              <img src={item.media_url} alt="Proof" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }} />
            ) : (
              <Button variant="outlined" size="small" href={item.media_url} target="_blank">View File</Button>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const ManagerDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [claims, setClaims] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [myGigs, setMyGigs] = useState([]);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [resolution, setResolution] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (activeTab === 0) {
        // Fetch Applications
        const { data, error } = await supabase
          .from('applications')
          .select(`
            *,
            gigs (title),
            user_profiles (full_name),
            mcq_results (score, passed)
          `)
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        setApplications(data || []);
      } else if (activeTab === 1) {
        // Fetch Pending Claims
        const { data, error } = await supabase
          .from('claims')
          .select(`
            *,
            user_profiles (full_name),
            gig_steps (title),
            work_orders (id)
          `)
          .eq('status', 'pending');
        if (error) throw new Error(error.message);
        setClaims(data || []);
      } else if (activeTab === 2) {
        // Fetch Disputes
        const { data, error } = await supabase
          .from('disputes')
          .select(`
            *,
            user_profiles (full_name),
            claims (
              submission_text,
              gig_steps (title),
              work_orders (applications (gigs (title)))
            )
          `)
          .eq('status', 'open');
        if (error) throw new Error(error.message);
        setDisputes(data || []);
      } else {
        // Fetch My Gigs
        const { data, error } = await supabase
          .from('gigs')
          .select(`
            *,
            gig_categories (name)
          `)
          .eq('client_id', session.user.id)
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        setMyGigs(data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err.message);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = useCallback((item) => {
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const processApplication = useCallback(async (status) => {
    try {
      setLoading(true);
      
      // If status is 'accepted', check if training is required
      let finalStatus = status;

      if (status === 'accepted') {
        const { data: training } = await supabase
          .from('trainings')
          .select('id')
          .eq('gig_id', selectedItem.gig_id)
          .maybeSingle();
        
        if (training) {
          finalStatus = 'training';
        }
      }

      const { error } = await supabase
        .from('applications')
        .update({ status: finalStatus })
        .eq('id', selectedItem.id);

      if (error) throw new Error(error.message);

      // If accepted (and no training needed), create a work order
      if (finalStatus === 'accepted') {
        await supabase.from('work_orders').insert({
          application_id: selectedItem.id,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // 3. Trigger Notification
      await supabase.rpc('create_notification', {
        p_user_id: selectedItem.user_id,
        p_title: `Application ${finalStatus === 'accepted' ? 'Accepted' : finalStatus === 'training' ? 'Needs Training' : 'Rejected'}`,
        p_message: finalStatus === 'training' 
          ? `Your application for "${selectedItem.gigs?.title}" was reviewed. Please complete the required training to start.`
          : `Your application for "${selectedItem.gigs?.title}" has been ${finalStatus}.`,
        p_type: finalStatus === 'accepted' || finalStatus === 'training' ? 'success' : 'error',
        p_link: finalStatus === 'training' ? `/applications/${selectedItem.id}/training` : '/applications'
      });

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedItem, fetchData]);

  const processClaim = useCallback(async (status) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Update Claim Status
      const { error: claimError } = await supabase
        .from('claims')
        .update({ 
          status: status,
          updated_at: new Date()
        })
        .eq('id', selectedItem.id);

      if (claimError) throw new Error(claimError.message);

      // 2. Create Verification Record
      await supabase.from('claim_verifications').insert({
        claim_id: selectedItem.id,
        verified_by: session.user.id,
        status: status,
        remarks: remarks
      });

      // 3. If approved, trigger payment (Module 5)
      if (status === 'approved') {
        // Fetch gig pay amount and current wallet balance
        const { data: claimData, error: fetchError } = await supabase
          .from('claims')
          .select(`
            *,
            work_orders (
              applications (
                gigs (pay_amount)
              )
            )
          `)
          .eq('id', selectedItem.id)
          .single();
        
        if (fetchError) throw new Error(fetchError.message);
        
        const amount = claimData.work_orders?.applications?.gigs?.pay_amount || 0;

        if (amount > 0) {
          // Get current wallet balance
          const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', selectedItem.user_id)
            .maybeSingle();

          if (walletError) throw new Error(walletError.message);

          const newBalance = (wallet?.balance || 0) + parseFloat(amount);

          // Update Wallet
          const { error: updateWalletError } = await supabase
            .from('wallets')
            .upsert({ 
              user_id: selectedItem.user_id, 
              balance: newBalance,
              updated_at: new Date()
            });

          if (updateWalletError) throw new Error(updateWalletError.message);

          // Insert Transaction
          await supabase.from('transactions').insert({
            wallet_id: selectedItem.user_id,
            amount: amount,
            transaction_type: 'credit',
            status: 'completed',
            reference_id: selectedItem.id,
            description: `Payout for step "${selectedItem.gig_steps?.title}"`
          });
        }
      }

      // 4. Trigger Notification
      await supabase.rpc('create_notification', {
        p_user_id: selectedItem.user_id,
        p_title: `Claim ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        p_message: `Your proof for "${selectedItem.gig_steps?.title}" has been ${status}. ${status === 'approved' ? 'Funds added to your wallet.' : ''}`,
        p_type: status === 'approved' ? 'success' : 'error',
        p_link: '/wallet'
      });

      setDialogOpen(false);
      setRemarks('');
      fetchData();
    } catch (err) {
      console.error('Error processing claim:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedItem, remarks, fetchData]);

  const resolveDispute = useCallback(async (status) => {
    try {
      setLoading(true);
      await supabase.auth.getSession();

      // 1. Update Dispute Status
      const { error: disputeError } = await supabase
        .from('disputes')
        .update({ 
          status: status,
          resolution: resolution,
          resolved_at: new Date()
        })
        .eq('id', selectedItem.id);

      if (disputeError) throw new Error(disputeError.message);

      // 2. If 'approved', we need to re-approve the claim and trigger payment
      if (status === 'resolved_approved') {
        // Re-approve the claim
        await supabase.from('claims').update({ status: 'approved' }).eq('id', selectedItem.claim_id);
        
        // Fetch claim data for payment
        const { data: claimData } = await supabase
          .from('claims')
          .select(`
            *,
            work_orders (
              applications (
                gigs (pay_amount)
              )
            )
          `)
          .eq('id', selectedItem.claim_id)
          .single();
        
        const amount = claimData.work_orders?.applications?.gigs?.pay_amount || 0;

        if (amount > 0) {
          // Wallet update logic (similar to processClaim)
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', selectedItem.user_id)
            .maybeSingle();

          const newBalance = (wallet?.balance || 0) + parseFloat(amount);
          await supabase.from('wallets').upsert({ user_id: selectedItem.user_id, balance: newBalance });

          await supabase.from('transactions').insert({
            wallet_id: selectedItem.user_id,
            amount: amount,
            transaction_type: 'credit',
            status: 'completed',
            reference_id: selectedItem.claim_id,
            description: `Payout for step "${claimData.gig_steps?.title}" (via Dispute Resolution)`
          });
        }
      } else {
        // If rejected, keep claim as rejected
        await supabase.from('claims').update({ status: 'rejected' }).eq('id', selectedItem.claim_id);
      }

      // 3. Trigger Notification
      await supabase.rpc('create_notification', {
        p_user_id: selectedItem.user_id,
        p_title: `Dispute Resolved: ${status === 'resolved_approved' ? 'Approved' : 'Rejected'}`,
        p_message: `Your dispute for "${selectedItem.claims?.gig_steps?.title}" has been resolved. ${status === 'resolved_approved' ? 'Funds added to your wallet.' : 'The original decision stands.'}`,
        p_type: status === 'resolved_approved' ? 'success' : 'error',
        p_link: '/wallet'
      });

      setDisputeDialogOpen(false);
      setResolution('');
      fetchData();
    } catch (err) {
      console.error('Error resolving dispute:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedItem, resolution, fetchData]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Manager Dashboard</Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} centered>
          <Tab label="Applications" />
          <Tab label="Task Claims" />
          <Tab label="Disputes" />
          <Tab label="My Gigs" />
        </Tabs>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {activeTab === 0 ? (
                  <>
                    <TableCell>Worker</TableCell>
                    <TableCell>Gig</TableCell>
                    <TableCell>Applied Date</TableCell>
                    <TableCell>Test Score</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </>
                ) : activeTab === 1 ? (
                  <>
                    <TableCell>Worker</TableCell>
                    <TableCell>Task Step</TableCell>
                    <TableCell>Submitted Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </>
                ) : activeTab === 2 ? (
                  <>
                    <TableCell>Worker</TableCell>
                    <TableCell>Gig / Step</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>Gig Title</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Pay</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created Date</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {activeTab === 0 ? (
                applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>{app.user_profiles?.full_name || 'Anonymous'}</TableCell>
                    <TableCell>{app.gigs?.title}</TableCell>
                    <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {app.mcq_results?.length > 0 ? (
                        <Typography variant="body2">
                          {app.mcq_results[0].score} ({app.mcq_results[0].passed ? 'Passed' : 'Failed'})
                        </Typography>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={app.status.toUpperCase()} 
                        size="small" 
                        color={
                          app.status === 'accepted' ? 'success' : 
                          app.status === 'rejected' ? 'error' : 
                          app.status === 'pending' ? 'warning' : 'info'
                        } 
                      />
                    </TableCell>
                    <TableCell>
                      {app.status === 'pending' && (
                        <Button variant="outlined" size="small" onClick={() => handleAction(app)}>Review</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : activeTab === 1 ? (
                claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell>{claim.user_profiles?.full_name || 'Anonymous'}</TableCell>
                    <TableCell>{claim.gig_steps?.title}</TableCell>
                    <TableCell>{new Date(claim.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="outlined" size="small" onClick={() => handleAction(claim)}>Verify</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : activeTab === 2 ? (
                disputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell>{dispute.user_profiles?.full_name || 'Anonymous'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {dispute.claims?.work_orders?.applications?.gigs?.title}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {dispute.claims?.gig_steps?.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{dispute.reason}</TableCell>
                    <TableCell>
                      <Chip label={dispute.status.toUpperCase()} size="small" color="warning" />
                    </TableCell>
                    <TableCell>
                      <Button variant="outlined" size="small" onClick={() => { setSelectedItem(dispute); setDisputeDialogOpen(true); }}>Resolve</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                myGigs.map((gig) => (
                  <TableRow key={gig.id}>
                    <TableCell>{gig.title}</TableCell>
                    <TableCell>{gig.gig_categories?.name}</TableCell>
                    <TableCell>${gig.pay_amount}</TableCell>
                    <TableCell>
                      <Chip label={gig.status.toUpperCase()} size="small" color={gig.status === 'active' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>{new Date(gig.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
              {((activeTab === 0 && applications.length === 0) || 
                (activeTab === 1 && claims.length === 0) || 
                (activeTab === 2 && disputes.length === 0) ||
                (activeTab === 3 && myGigs.length === 0)) && (
                <TableRow>
                  <TableCell colSpan={activeTab === 3 ? 5 : 6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No items found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {activeTab === 0 ? 'Review Application' : 'Verify Task Claim'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">
              <strong>Worker:</strong> {selectedItem?.user_profiles?.full_name}
            </Typography>
            {activeTab === 1 && (
              <>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>Submission Text:</strong> {selectedItem?.submission_text}
                </Typography>
                {/* Display claim media if any */}
                <ClaimMediaView claimId={selectedItem?.id} />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Verification Remarks"
                  variant="outlined"
                  sx={{ mt: 3 }}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            color="error" 
            onClick={() => activeTab === 0 ? processApplication('rejected') : processClaim('rejected')}
          >
            Reject
          </Button>
          <Button 
            color="success" 
            variant="contained" 
            onClick={() => activeTab === 0 ? processApplication('accepted') : processClaim('approved')}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispute Resolution Dialog */}
      <Dialog open={disputeDialogOpen} onClose={() => setDisputeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Dispute</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">
              <strong>Worker:</strong> {selectedItem?.user_profiles?.full_name}
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              <strong>Reason for Dispute:</strong> {selectedItem?.reason}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Original Submission:</strong> {selectedItem?.claims?.submission_text}
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Resolution Remarks"
              variant="outlined"
              sx={{ mt: 3 }}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Explain the final decision..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisputeDialogOpen(false)}>Cancel</Button>
          <Button 
            color="error" 
            onClick={() => resolveDispute('resolved_rejected')}
          >
            Maintain Rejection
          </Button>
          <Button 
            color="success" 
            variant="contained" 
            onClick={() => resolveDispute('resolved_approved')}
          >
            Approve & Pay
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ManagerDashboard;
