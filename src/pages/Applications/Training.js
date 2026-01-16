import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, Box, Button, CircularProgress, Alert, Stepper, Step, StepLabel, Divider, Card, CardContent } from '@mui/material';
import { supabase } from '../../supabaseClient';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const Training = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(null);
  const [modules, setModules] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [application, setApplication] = useState(null);
  const [completed, setCompleted] = useState(false);

  const fetchTrainingData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Fetch application to get gig_id
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*, gigs(title, id)')
        .eq('id', applicationId)
        .single();

      if (appError) throw new Error(appError.message);
      setApplication(appData);

      // 2. Fetch training for this gig
      const { data: trainingData, error: tError } = await supabase
        .from('trainings')
        .select('*')
        .eq('gig_id', appData.gig_id)
        .single();

      if (tError) {
        if (tError.code === 'PGRST116') {
          setError('No training found for this gig.');
          setLoading(false);
          return;
        }
        throw new Error(tError.message);
      }
      setTraining(trainingData);

      // 3. Fetch modules for this training
      const { data: modulesData, error: mError } = await supabase
        .from('training_modules')
        .select('*')
        .eq('training_id', trainingData.id)
        .order('module_order', { ascending: true });

      if (mError) throw new Error(mError.message);
      setModules(modulesData || []);

    } catch (err) {
      console.error('Error fetching training data:', err.message);
      setError('Failed to load training materials: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchTrainingData();
  }, [fetchTrainingData]);

  const handleComplete = useCallback(async () => {
    try {
      setSubmitting(true);
      
      // 1. Update Application Status to accepted (training finished)
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId);

      if (updateError) throw new Error(updateError.message);

      // 2. Create Work Order
      const { error: woError } = await supabase
        .from('work_orders')
        .insert({
          application_id: applicationId,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        });
      
      if (woError) throw new Error(woError.message);

      // 3. Trigger Notification
      await supabase.rpc('create_notification', {
        p_user_id: application.user_id,
        p_title: 'Training Completed!',
        p_message: `You have successfully completed the training for "${application.gigs?.title}". You can now start submitting tasks.`,
        p_type: 'success',
        p_link: '/applications'
      });

      setCompleted(true);
    } catch (err) {
      console.error('Error completing training:', err.message);
      setError('Failed to save training progress.');
    } finally {
      setSubmitting(false);
    }
  }, [applicationId, application]);

  const handleNext = useCallback(() => {
    if (currentStep === modules.length - 1) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, modules.length, handleComplete]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => prev - 1);
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;

  if (completed) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Training Completed!
          </Typography>
          <Typography variant="body1" paragraph>
            Great job! You have finished all the training modules for <strong>{application?.gigs?.title}</strong>.
          </Typography>
          <Alert severity="success" sx={{ mt: 2, mb: 4 }}>
            Your application has been accepted, and a work order has been assigned to you.
          </Alert>
          <Button variant="contained" onClick={() => navigate('/applications')}>
            Go to My Applications
          </Button>
        </Paper>
      </Container>
    );
  }

  if (modules.length === 0) return <Container sx={{ mt: 4 }}><Alert severity="info">No training modules found for this training.</Alert></Container>;

  const currentModule = modules[currentStep];

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom color="primary" fontWeight="bold">
          {training?.title}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Gig: {application?.gigs?.title}
        </Typography>
        
        <Stepper activeStep={currentStep} sx={{ my: 4 }}>
          {modules.map((m) => (
            <Step key={m.id}>
              <StepLabel>{m.title}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Module {currentStep + 1}: {currentModule.title}
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            {currentModule.content_type === 'text' && (
              <Box sx={{ p: 2 }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {currentModule.content_url} {/* For simplicity, text content is stored in content_url or we could have a content field */}
                </Typography>
              </Box>
            )}

            {currentModule.content_type === 'video' && (
              <Box sx={{ position: 'relative', pt: '56.25%', mb: 2 }}>
                <iframe
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                  src={currentModule.content_url.replace('watch?v=', 'embed/')}
                  title={currentModule.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </Box>
            )}

            {currentModule.content_type === 'pdf' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" gutterBottom>
                  Please review the document to proceed.
                </Typography>
                <Button variant="outlined" href={currentModule.content_url} target="_blank">
                  View PDF Document
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button disabled={currentStep === 0} onClick={handleBack}>
            Back
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleNext} 
            disabled={submitting}
          >
            {submitting ? 'Processing...' : currentStep === modules.length - 1 ? 'Finish Training' : 'Next Module'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Training;
