import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, CircularProgress, Alert, Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { supabase } from '../../supabaseClient';

const ManageKYC = () => {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_documents')
        .select(`
          *,
          user_profiles (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching KYC docs:', err.message);
      setError('Failed to load KYC documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAction = useCallback((doc) => {
    setSelectedDoc(doc);
    setDialogOpen(true);
  }, []);

  const handleUpdateStatus = useCallback(async (status) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('kyc_documents')
        .update({ 
          verification_status: status,
          admin_remarks: remarks,
          verified_at: new Date()
        })
        .eq('id', selectedDoc.id);

      if (error) throw new Error(error.message);

      // Trigger Notification
      await supabase.rpc('create_notification', {
        p_user_id: selectedDoc.user_id,
        p_title: `KYC Document ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        p_message: `Your ${selectedDoc.document_type} has been ${status}. ${remarks ? 'Remarks: ' + remarks : ''}`,
        p_type: status === 'approved' ? 'success' : 'error',
        p_link: '/kyc'
      });

      setDialogOpen(false);
      setRemarks('');
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDoc, remarks, fetchDocuments]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">Manage KYC Verifications</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell>Worker</TableCell>
                <TableCell>Document Type</TableCell>
                <TableCell>Submitted Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {doc.user_profiles?.full_name || 'Anonymous'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{doc.user_id}</Typography>
                  </TableCell>
                  <TableCell>{doc.document_type}</TableCell>
                  <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip 
                      label={doc.verification_status.toUpperCase()} 
                      color={
                        doc.verification_status === 'approved' ? 'success' : 
                        doc.verification_status === 'rejected' ? 'error' : 'warning'
                      } 
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button variant="outlined" size="small" onClick={() => handleAction(doc)}>View & Process</Button>
                  </TableCell>
                </TableRow>
              ))}
              {documents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No KYC documents found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Process KYC Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Verify KYC Document</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              <strong>Worker:</strong> {selectedDoc?.user_profiles?.full_name}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Document Type:</strong> {selectedDoc?.document_type}
            </Typography>
            
            <Box sx={{ mt: 3, mb: 3, textAlign: 'center' }}>
              <Typography variant="subtitle2" gutterBottom align="left">Document Preview:</Typography>
              {selectedDoc?.document_url && (
                <Paper variant="outlined" sx={{ p: 1, display: 'inline-block' }}>
                  <img 
                    src={selectedDoc.document_url} 
                    alt="KYC Document" 
                    style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} 
                  />
                  <Box sx={{ mt: 1 }}>
                    <Button 
                      size="small" 
                      variant="text" 
                      href={selectedDoc.document_url} 
                      target="_blank"
                    >
                      Open Original File
                    </Button>
                  </Box>
                </Paper>
              )}
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Verification Remarks"
              variant="outlined"
              sx={{ mt: 2 }}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Reason for approval or rejection..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            color="error" 
            variant="outlined"
            onClick={() => handleUpdateStatus('rejected')}
            disabled={loading}
          >
            Reject
          </Button>
          <Button 
            color="success" 
            variant="contained" 
            onClick={() => handleUpdateStatus('approved')}
            disabled={loading}
          >
            Approve Verification
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ManageKYC;
