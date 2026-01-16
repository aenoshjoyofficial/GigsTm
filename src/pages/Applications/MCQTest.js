import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, Box, Button, Radio, RadioGroup, FormControlLabel, FormControl, CircularProgress, Alert, Stepper, Step, StepLabel } from '@mui/material';
import { supabase } from '../../supabaseClient';

const MCQTest = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [application, setApplication] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const fetchTestData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Fetch application to get gig_id
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*, gigs(title)')
        .eq('id', applicationId)
        .single();

      if (appError) throw new Error(appError.message);
      setApplication(appData);

      // 2. Fetch MCQ questions for this gig
      const { data: questionsData, error: qError } = await supabase
        .from('mcq_questions')
        .select('*')
        .eq('gig_id', appData.gig_id);

      if (qError) throw new Error(qError.message);
      setQuestions(questionsData || []);

    } catch (err) {
      console.error('Error fetching test data:', err.message);
      setError('Failed to load test questions.');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchTestData();
  }, [fetchTestData]);

  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: parseInt(value) }));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => prev - 1);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Calculate score
      let score = 0;
      questions.forEach((q) => {
        if (answers[q.id] === q.correct_option_index) {
          score += 1;
        }
      });

      const passThreshold = Math.ceil(questions.length * 0.7); // 70% to pass
      const passed = score >= passThreshold;

      // 1. Insert MCQ Result
      const { error: resultError } = await supabase
        .from('mcq_results')
        .insert({
          application_id: applicationId,
          score: score,
          passed: passed,
          details: { answers, total_questions: questions.length }
        });

      if (resultError) throw new Error(resultError.message);

      // 2. Update Application Status
      // If passed, check if training is required
      let nextStatus = 'rejected';
      let hasTraining = false;

      if (passed) {
        const { data: training } = await supabase
          .from('trainings')
          .select('id')
          .eq('gig_id', application.gig_id)
          .maybeSingle();
        
        if (training) {
          nextStatus = 'training';
          hasTraining = true;
        } else {
          nextStatus = 'accepted';
        }
      }

      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: nextStatus })
        .eq('id', applicationId);

      if (updateError) throw new Error(updateError.message);

      if (passed && !hasTraining) {
        // If accepted directly (no training), create work order
        const { error: woError } = await supabase
          .from('work_orders')
          .insert({
            application_id: applicationId,
            user_id: application.user_id,
            gig_id: application.gig_id,
            status: 'assigned',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
          });
        if (woError) throw new Error(woError.message);

        // Trigger Notification
        await supabase.rpc('create_notification', {
          p_user_id: application.user_id,
          p_title: 'Test Passed!',
          p_message: `Congratulations! You passed the test for "${application.gigs?.title}". A work order has been created for you.`,
          p_type: 'success',
          p_link: '/applications'
        });
      } else if (passed && hasTraining) {
        // Trigger Notification for training
        await supabase.rpc('create_notification', {
          p_user_id: application.user_id,
          p_title: 'Test Passed!',
          p_message: `You passed the test for "${application.gigs?.title}". Please complete the required training to start.`,
          p_type: 'info',
          p_link: `/applications/${applicationId}/training`
        });
      } else {
        // Trigger Notification for failure
        await supabase.rpc('create_notification', {
          p_user_id: application.user_id,
          p_title: 'Test Failed',
          p_message: `You did not pass the test for "${application.gigs?.title}". Better luck next time.`,
          p_type: 'error',
          p_link: '/gigs'
        });
      }

      setTestResult({ score, passed, total: questions.length, hasTraining });
    } catch (err) {
      console.error('Error submitting test:', err.message);
      setError('Failed to submit test results.');
    } finally {
      setSubmitting(false);
    }
  }, [application, applicationId, questions, answers]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;

  if (testResult) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom color={testResult.passed ? 'success.main' : 'error.main'}>
            {testResult.passed ? 'Congratulations!' : 'Test Result'}
          </Typography>
          <Typography variant="h6" gutterBottom>
            You scored {testResult.score} out of {testResult.total}
          </Typography>
          <Alert severity={testResult.passed ? 'success' : 'error'} sx={{ mt: 2, mb: 4 }}>
            {testResult.passed 
              ? testResult.hasTraining 
                ? 'You have passed the qualification test. Please proceed to the training module.'
                : 'You have passed the qualification test. A work order has been assigned to you.' 
              : 'Unfortunately, you did not meet the passing threshold for this gig.'}
          </Alert>
          <Button variant="contained" onClick={() => navigate(testResult.passed && testResult.hasTraining ? `/applications/${applicationId}/training` : '/applications')}>
            {testResult.passed && testResult.hasTraining ? 'Proceed to Training' : 'Go to My Applications'}
          </Button>
        </Paper>
      </Container>
    );
  }

  if (questions.length === 0) return <Container sx={{ mt: 4 }}><Alert severity="info">No test questions found for this gig.</Alert></Container>;

  const currentQuestion = questions[currentStep];

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Qualification Test: {application?.gigs?.title}
        </Typography>
        
        <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
          {questions.map((_, index) => (
            <Step key={index}>
              <StepLabel></StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Question {currentStep + 1} of {questions.length}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {currentQuestion.question}
          </Typography>

          <FormControl component="fieldset">
            <RadioGroup
              value={answers[currentQuestion.id] ?? ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            >
              {currentQuestion.options.map((option, index) => (
                <FormControlLabel 
                  key={index} 
                  value={index} 
                  control={<Radio />} 
                  label={option} 
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button disabled={currentStep === 0} onClick={handleBack}>
            Back
          </Button>
          {currentStep === questions.length - 1 ? (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSubmit} 
              disabled={submitting || answers[currentQuestion.id] === undefined}
            >
              {submitting ? 'Submitting...' : 'Finish Test'}
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleNext} 
              disabled={answers[currentQuestion.id] === undefined}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default MCQTest;
