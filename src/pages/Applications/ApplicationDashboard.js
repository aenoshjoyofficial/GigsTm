import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Box, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails, LinearProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const ClaimStatusList = ({ workOrderId, totalSteps }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('claims')
      .select(`
        *,
        gig_steps (title)
      `)
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });
    
    if (!error) setClaims(data || []);
    setLoading(false);
  }, [workOrderId]);

  useEffect(() => {
    if (workOrderId) fetchClaims();
  }, [workOrderId, fetchClaims]);

  const approvedCount = claims.filter(c => c.status === 'approved').length;
  const progress = totalSteps > 0 ? (approvedCount / totalSteps) * 100 : 0;

  if (loading) return <CircularProgress size={20} />;
  
  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
        <Typography variant="subtitle2">Progress: {approvedCount}/{totalSteps} steps approved</Typography>
        <Box sx={{ flexGrow: 1 }}>
          <LinearProgress variant="determinate" value={progress} color="success" sx={{ height: 8, borderRadius: 5 }} />
        </Box>
      </Box>
      
      {claims.length > 0 && (
        <Table size="small">
          <TableBody>
            {claims.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell sx={{ pl: 0 }}>{claim.gig_steps?.title}</TableCell>
                <TableCell>
                  <Chip 
                    label={claim.status.toUpperCase()} 
                    size="small" 
                    color={claim.status === 'approved' ? 'success' : claim.status === 'rejected' ? 'error' : 'warning'} 
                  />
                </TableCell>
                <TableCell sx={{ pr: 0 }} align="right">
                  {claim.status === 'rejected' && (
                    <Button size="small" variant="outlined" color="error" onClick={() => navigate(`/disputes/${claim.id}`)}>
                      Dispute
                    </Button>
                  )}
                  {claim.status === 'disputed' && (
                    <Button size="small" variant="outlined" onClick={() => navigate(`/disputes/${claim.id}`)}>
                      View Dispute
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

const ApplicationDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          gigs (
            title, 
            pay_amount,
            gig_steps (id)
          ),
          work_orders (id, status),
          mcq_results (score, passed)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      setApplications(data || []);
    } catch (err) {
      console.error('Error fetching applications:', err.message);
      setError('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      case 'testing': return 'info';
      case 'training': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Applications
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Gig Title</TableCell>
              <TableCell>Applied Date</TableCell>
              <TableCell>Pay Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {applications.length > 0 ? (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>{app.gigs?.title}</TableCell>
                  <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>${app.gigs?.pay_amount}</TableCell>
                  <TableCell>
                    <Chip 
                      label={app.status.toUpperCase()} 
                      color={getStatusColor(app.status)} 
                      size="small" 
                    />
                    {app.mcq_results?.length > 0 && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        Score: {app.mcq_results[0].score} ({app.mcq_results[0].passed ? 'Passed' : 'Failed'})
                      </Typography>
                    )}
                    {/* Show Claim Status List if active */}
                    {app.status === 'accepted' && app.work_orders?.length > 0 && (
                      <Accordion elevation={0} sx={{ mt: 1, '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 0, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <InfoIcon sx={{ fontSize: 14, mr: 0.5 }} />
                            View Submission Status
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 0, pt: 0 }}>
                          <ClaimStatusList 
                            workOrderId={app.work_orders[0].id} 
                            totalSteps={app.gigs?.gig_steps?.length || 0}
                          />
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </TableCell>
                  <TableCell>
                    {app.status === 'testing' && (
                      <Button size="small" variant="contained" onClick={() => navigate(`/applications/${app.id}/test`)}>
                        Take Test
                      </Button>
                    )}
                    {app.status === 'training' && (
                      <Button size="small" variant="contained" color="secondary" onClick={() => navigate(`/applications/${app.id}/training`)}>
                        Start Training
                      </Button>
                    )}
                    {app.status === 'accepted' && app.work_orders?.length > 0 && (
                      <Button size="small" variant="contained" color="success" onClick={() => navigate(`/tasks/${app.work_orders[0].id}/submit`)}>
                        Submit Tasks
                      </Button>
                    )}
                    <Button size="small" onClick={() => navigate(`/gigs/${app.gig_id}`)}>
                      View Gig
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    You haven't applied for any gigs yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default ApplicationDashboard;
