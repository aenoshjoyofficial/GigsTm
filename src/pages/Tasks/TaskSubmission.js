import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, Box, Button, TextField, CircularProgress, Alert, Divider, Chip, Snackbar } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { supabase } from '../../supabaseClient';

const TaskSubmission = () => {
  const { workOrderId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [workOrder, setWorkOrder] = useState(null);
  const [steps, setSteps] = useState([]);
  const [claims, setClaims] = useState({}); // { step_id: { text: '', media: null } }
  const [submittedSteps, setSubmittedSteps] = useState([]);

  const fetchWorkOrderData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Fetch work order and related gig info
      const { data: woData, error: woError } = await supabase
        .from('work_orders')
        .select(`
          *,
          applications (
            gig_id,
            gigs (title, description)
          )
        `)
        .eq('id', workOrderId)
        .single();

      if (woError) throw new Error(woError.message);
      
      if (woData.status === 'completed' || woData.status === 'cancelled') {
        setError(`This work order is already ${woData.status}. No further submissions allowed.`);
      }
      
      setWorkOrder(woData);

      // 2. Fetch gig steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('gig_steps')
        .select('*')
        .eq('gig_id', woData.applications.gig_id)
        .order('step_order', { ascending: true });

      if (stepsError) throw new Error(stepsError.message);
      setSteps(stepsData || []);

      // 3. Fetch existing claims for this work order
      const { data: claimsData, error: claimsError } = await supabase
        .from('claims')
        .select('gig_step_id, status')
        .eq('work_order_id', workOrderId);

      if (claimsError) throw new Error(claimsError.message);
      setSubmittedSteps(claimsData.map(c => c.gig_step_id));

    } catch (err) {
      console.error('Error fetching work order:', err.message);
      setError('Failed to load task details.');
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchWorkOrderData();
  }, [fetchWorkOrderData]);

  const handleTextChange = useCallback((stepId, text) => {
    setClaims((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], text }
    }));
  }, []);

  const handleFileUpload = useCallback(async (stepId, file) => {
    setClaims((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], media: file }
    }));
  }, []);

  const handleSubmitStep = useCallback(async (stepId) => {
    try {
      setSubmitting(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const claimData = claims[stepId];
      
      // 1. Create Claim
      const { data: claim, error: claimError } = await supabase
        .from('claims')
        .insert({
          work_order_id: workOrderId,
          user_id: session.user.id,
          gig_step_id: stepId,
          submission_text: claimData?.text || '',
          status: 'pending'
        })
        .select()
        .single();

      if (claimError) throw new Error(claimError.message);

      // 2. Handle Media (Real upload)
      if (claimData?.media) {
        const file = claimData.media;
        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}/${claim.id}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('claim-media')
          .upload(filePath, file);

        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from('claim-media')
          .getPublicUrl(filePath);
        
        await supabase.from('claim_media').insert({
          claim_id: claim.id,
          media_url: publicUrl,
          media_type: file.type.startsWith('image/') ? 'image' : 'file'
        });
      }

      setSubmittedSteps([...submittedSteps, stepId]);
      setSuccess('Step submitted successfully!');

      // Check if all steps are now submitted
      if (submittedSteps.length + 1 === steps.length) {
        // Trigger notification or update work order status if needed
        await supabase.rpc('create_notification', {
          p_user_id: session.user.id,
          p_title: 'Gig Completion Submitted',
          p_message: `You have submitted all steps for "${workOrder.applications.gigs.title}". They are now pending review.`,
          p_type: 'info',
          p_link: '/applications'
        });
      }

    } catch (err) {
      console.error('Error submitting claim:', err.message);
      setError('Failed to submit proof: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }, [claims, workOrderId, submittedSteps, steps, workOrder]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/applications')} 
        sx={{ mb: 2 }}
      >
        Back to Dashboard
      </Button>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Task Submission
            </Typography>
            <Typography variant="h6" color="primary">
              {workOrder?.applications?.gigs?.title}
            </Typography>
          </Box>
          <Chip 
            label={workOrder?.status?.toUpperCase()} 
            color={workOrder?.status === 'active' ? 'success' : 'default'} 
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          {workOrder?.applications?.gigs?.description}
        </Typography>

        <Divider sx={{ my: 3 }} />

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Steps to Complete 
          <Typography variant="body2" color="text.secondary">
            ({submittedSteps.length}/{steps.length} completed)
          </Typography>
        </Typography>
        
        {steps.map((step) => {
          const isSubmitted = submittedSteps.includes(step.id);
          return (
            <Box 
              key={step.id} 
              sx={{ 
                mb: 4, 
                p: 3, 
                border: '1px solid',
                borderColor: isSubmitted ? 'success.light' : '#e0e0e0',
                borderRadius: 2, 
                bgcolor: isSubmitted ? 'rgba(76, 175, 80, 0.04)' : 'white',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1, color: isSubmitted ? 'success.main' : 'text.primary' }}>
                  Step {step.step_order}: {step.title}
                </Typography>
                {isSubmitted && <Chip icon={<CheckCircleIcon />} label="Submitted" color="success" size="small" />}
              </Box>
              
              <Typography variant="body1" sx={{ mb: 2 }}>{step.description}</Typography>
              
              {!isSubmitted && workOrder?.status === 'active' && (
                <Box>
                  {(step.required_proof_type === 'text' || step.required_proof_type === 'image') && (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Your response / Proof details"
                      variant="outlined"
                      sx={{ mb: 2 }}
                      placeholder="Explain how you completed this step..."
                      value={claims[step.id]?.text || ''}
                      onChange={(e) => handleTextChange(step.id, e.target.value)}
                    />
                  )}

                  {(step.required_proof_type === 'image' || step.required_proof_type === 'file') && (
                    <Box sx={{ mb: 2 }}>
                      <input
                        accept={step.required_proof_type === 'image' ? "image/*" : "image/*,application/pdf"}
                        style={{ display: 'none' }}
                        id={`upload-${step.id}`}
                        type="file"
                        onChange={(e) => handleFileUpload(step.id, e.target.files[0])}
                      />
                      <label htmlFor={`upload-${step.id}`}>
                        <Button 
                          variant="outlined" 
                          component="span" 
                          startIcon={<CloudUploadIcon />}
                          color={claims[step.id]?.media ? 'success' : 'primary'}
                        >
                          {claims[step.id]?.media ? claims[step.id].media.name : `Upload ${step.required_proof_type}`}
                        </Button>
                      </label>
                    </Box>
                  )}

                  <Button 
                    variant="contained" 
                    onClick={() => handleSubmitStep(step.id)}
                    disabled={submitting || (step.required_proof_type !== 'none' && !claims[step.id]?.text && !claims[step.id]?.media)}
                  >
                    {submitting ? 'Submitting...' : 'Submit Step Proof'}
                  </Button>
                </Box>
              )}
            </Box>
          );
        })}

        {submittedSteps.length === steps.length && steps.length > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            All steps have been submitted! Your work is now under review by the manager.
          </Alert>
        )}
      </Paper>

      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(null)}
        message={success}
      />
    </Container>
  );
};

export default TaskSubmission;
