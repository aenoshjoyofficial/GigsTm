import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, MenuItem, Grid, IconButton, Divider, Alert, Snackbar } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const CreateGig = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [gigData, setGigData] = useState({
    title: '',
    description: '',
    category_id: '',
    pay_amount: '',
    location: '',
  });

  const [steps, setSteps] = useState([
    { title: '', description: '', step_order: 1, required_proof_type: 'image' }
  ]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('gig_categories').select('*');
      if (error) console.error('Error fetching categories:', error);
      else setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const handleGigChange = useCallback((e) => {
    setGigData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleStepChange = useCallback((index, e) => {
    setSteps((prev) => {
      const newSteps = [...prev];
      newSteps[index][e.target.name] = e.target.value;
      return newSteps;
    });
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, { title: '', description: '', step_order: prev.length + 1, required_proof_type: 'image' }]);
  }, []);

  const removeStep = useCallback((index) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((step, i) => ({ ...step, step_order: i + 1 })));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to create a gig.');

      // 1. Create the Gig
      const { data: gig, error: gigError } = await supabase
        .from('gigs')
        .insert({
          ...gigData,
          client_id: session.user.id,
          status: 'active'
        })
        .select()
        .single();

      if (gigError) throw new Error(gigError.message);

      // 2. Create the Steps
      const stepsToInsert = steps.map(step => ({
        ...step,
        gig_id: gig.id
      }));

      const { error: stepsError } = await supabase
        .from('gig_steps')
        .insert(stepsToInsert);

      if (stepsError) throw new Error(stepsError.message);

      setSuccess(true);
      setTimeout(() => navigate('/gigs'), 2000);

    } catch (err) {
      console.error('Error creating gig:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gigData, steps, navigate]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create New Gig
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Fill in the details below to post a new task on the marketplace.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Gig Title"
                name="title"
                value={gigData.title}
                onChange={handleGigChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                select
                label="Category"
                name="category_id"
                value={gigData.category_id}
                onChange={handleGigChange}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="number"
                label="Pay Amount ($)"
                name="pay_amount"
                value={gigData.pay_amount}
                onChange={handleGigChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location (optional)"
                name="location"
                placeholder="e.g. Remote, New York, etc."
                value={gigData.location}
                onChange={handleGigChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                label="Description"
                name="description"
                value={gigData.description}
                onChange={handleGigChange}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" gutterBottom>
            Gig Steps
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Break down the task into clear, verifiable steps for the worker.
          </Typography>

          {steps.map((step, index) => (
            <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Step {step.step_order}</Typography>
                {steps.length > 1 && (
                  <IconButton onClick={() => removeStep(index)} color="error">
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Step Title"
                    name="title"
                    value={step.title}
                    onChange={(e) => handleStepChange(index, e)}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Instructions"
                    name="description"
                    value={step.description}
                    onChange={(e) => handleStepChange(index, e)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    required
                    fullWidth
                    select
                    label="Proof Required"
                    name="required_proof_type"
                    value={step.required_proof_type}
                    onChange={(e) => handleStepChange(index, e)}
                  >
                    <MenuItem value="image">Image/Photo</MenuItem>
                    <MenuItem value="text">Text Response</MenuItem>
                    <MenuItem value="file">File Upload</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          ))}

          <Button startIcon={<AddIcon />} onClick={addStep} sx={{ mb: 4 }}>
            Add Another Step
          </Button>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button onClick={() => navigate('/gigs')}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Creating...' : 'Create Gig'}
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar open={success} autoHideDuration={2000}>
        <Alert severity="success">Gig created successfully! Redirecting...</Alert>
      </Snackbar>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateGig;
