import { useState, useEffect, useCallback, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Paper, Button, CircularProgress, Divider, List, ListItem, ListItemText, ListItemIcon, Alert, Snackbar, Rating, TextField } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChatIcon from '@mui/icons-material/Chat';
import { supabase } from '../../supabaseClient';

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

const GigDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gig, setGig] = useState(null);
  const [steps, setSteps] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    review_text: ''
  });

  const fetchGigDetails = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch gig details
      const { data: gigData, error: gigError } = await supabase
        .from('gigs')
        .select(`
          *,
          gig_categories (name)
        `)
        .eq('id', id)
        .single();

      if (gigError) throw new Error(gigError.message);
      setGig(gigData);

      // Fetch gig steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('gig_steps')
        .select('*')
        .eq('gig_id', id)
        .order('step_order', { ascending: true });

      if (stepsError) throw new Error(stepsError.message);
      setSteps(stepsData || []);

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('gig_reviews')
        .select(`
          *,
          user_profiles (full_name, avatar_url)
        `)
        .eq('gig_id', id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw new Error(reviewsError.message);
      setReviews(reviewsData || []);

      // Check if user can review (completed application)
      if (session) {
        const { data: appData } = await supabase
          .from('applications')
          .select('id, status')
          .eq('gig_id', id)
          .eq('user_id', session.user.id)
          .single();
        
        const { data: existingReview } = await supabase
          .from('gig_reviews')
          .select('id')
          .eq('gig_id', id)
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (appData?.status === 'accepted' && !existingReview) {
          // Check if at least one claim is approved for this gig
          const { count } = await supabase
            .from('claims')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('status', 'approved');
          
          if (count > 0) setCanReview(true);
        }
      }

    } catch (err) {
      console.error('Error fetching gig details:', err.message);
      setError('Failed to load gig details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGigDetails();
  }, [id, fetchGigDetails]);

  const handleReviewSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      setSubmittingReview(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('gig_reviews')
        .insert({
          gig_id: id,
          user_id: session.user.id,
          ...reviewForm
        });

      if (error) throw new Error(error.message);
      
      setSuccessMsg('Review submitted successfully!');
      setCanReview(false);
      fetchGigDetails();
    } catch (err) {
      console.error('Error submitting review:', err.message);
      setError('Failed to submit review: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  }, [id, reviewForm, fetchGigDetails]);

  const handleApply = useCallback(async () => {
    try {
      setApplying(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }

      // 1. Create the application
      const { data: application, error: applyError } = await supabase
        .from('applications')
        .insert({
          user_id: session.user.id,
          gig_id: id,
          status: 'pending'
        })
        .select()
        .single();

      if (applyError) {
        if (applyError.code === '23505') { // Unique constraint violation
          setError('You have already applied for this gig.');
          setApplying(false);
          return;
        } else {
          throw new Error(applyError.message);
        }
      }

      // 2. Check if gig has MCQ questions
      const { data: questions, error: qError } = await supabase
        .from('mcq_questions')
        .select('id')
        .eq('gig_id', id);

      if (qError) throw new Error(qError.message);

      // 3. Check if gig has Training
      const { data: training, error: tError } = await supabase
        .from('trainings')
        .select('id')
        .eq('gig_id', id)
        .maybeSingle();

      if (tError) throw new Error(tError.message);

      if (questions && questions.length > 0) {
        // Update status to testing
        await supabase
          .from('applications')
          .update({ status: 'testing' })
          .eq('id', application.id);

        setSuccessMsg('Application started! Redirecting to qualification test...');
        setTimeout(() => {
          navigate(`/applications/${application.id}/test`);
        }, 1500);
      } else if (training) {
        // Update status to training
        await supabase
          .from('applications')
          .update({ status: 'training' })
          .eq('id', application.id);

        setSuccessMsg('Application started! Redirecting to training modules...');
        setTimeout(() => {
          navigate(`/applications/${application.id}/training`);
        }, 1500);
      } else {
        setSuccessMsg('Application submitted successfully!');
      }
    } catch (err) {
      console.error('Error applying for gig:', err.message);
      setError('Failed to submit application.');
    } finally {
      setApplying(false);
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!gig) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Gig not found.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {gig.title}
        </Typography>
        
        {gig.gig_categories && (
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Category: {gig.gig_categories.name}
          </Typography>
        )}

        <Box sx={{ my: 3 }}>
          <Typography variant="h6" color="secondary">
            Reward: ${gig.pay_amount}
          </Typography>
          {gig.location && (
            <Typography variant="body2" color="text.secondary">
              Location: {gig.location}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Description
        </Typography>
        <Typography variant="body1" paragraph>
          {gig.description}
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          What you need to do:
        </Typography>
        <List>
          {steps.map((step) => (
            <ListItem key={step.id}>
              <ListItemIcon>
                <CheckCircleOutlineIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary={`${step.step_order}. ${step.title}`} 
                secondary={step.description} 
              />
            </ListItem>
          ))}
          {steps.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No specific steps listed for this gig.
            </Typography>
          )}
        </List>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            size="large" 
            onClick={handleApply} 
            disabled={applying}
          >
            {applying ? 'Applying...' : 'Apply for this Gig'}
          </Button>
          <Button 
            variant="outlined" 
            size="large" 
            startIcon={<ChatIcon />}
            onClick={() => navigate(`/messages?userId=${gig.client_id}`)}
          >
            Message Manager
          </Button>
          <Button variant="outlined" size="large" onClick={() => navigate('/gigs')}>
            Back to Gigs
          </Button>
        </Box>
      </Paper>

      {/* Reviews Section */}
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Reviews
        </Typography>
        
        {canReview && (
          <Box component="form" onSubmit={handleReviewSubmit} sx={{ mb: 4, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Leave a Review</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography component="legend">Rating</Typography>
              <Rating
                name="gig-rating"
                value={reviewForm.rating}
                onChange={(_, newValue) => {
                  setReviewForm({ ...reviewForm, rating: newValue });
                }}
              />
            </Box>
            <TextField
              fullWidth
              label="Your Review"
              multiline
              rows={3}
              value={reviewForm.review_text}
              onChange={(e) => setReviewForm({ ...reviewForm, review_text: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <Button 
              type="submit" 
              variant="contained" 
              disabled={submittingReview}
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </Button>
          </Box>
        )}

        <List>
          {reviews.length > 0 ? (
            reviews.map((review, index) => (
              <Fragment key={review.id}>
                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography fontWeight="bold">
                          {review.user_profiles?.full_name || 'Anonymous User'}
                        </Typography>
                        <Rating value={review.rating} readOnly size="small" />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                          {review.review_text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(review.created_at)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < reviews.length - 1 && <Divider component="li" />}
              </Fragment>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
              No reviews yet for this gig.
            </Typography>
          )}
        </List>
      </Paper>

      <Snackbar 
        open={!!successMsg} 
        autoHideDuration={6000} 
        onClose={() => setSuccessMsg('')}
      >
        <Alert onClose={() => setSuccessMsg('')} severity="success" sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default GigDetails;
