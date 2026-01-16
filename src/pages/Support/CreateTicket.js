import { useState, useCallback } from 'react';
import { Container, Typography, Box, TextField, Button, Paper, MenuItem, Grid, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const CreateTicket = () => {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: ticketError } = await supabase
        .from('help_center_tickets')
        .insert([
          {
            user_id: user.id,
            subject: formData.subject,
            description: formData.description,
            priority: formData.priority,
            status: 'open'
          }
        ])
        .select()
        .single();

      if (ticketError) throw new Error(ticketError.message);

      // Add initial message
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert([
          {
            ticket_id: data.id,
            sender_id: user.id,
            message: formData.description
          }
        ]);

      if (messageError) throw new Error(messageError.message);

      navigate(`/support/tickets/${data.id}`);
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [formData, navigate]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Create Support Ticket</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Describe the issue you're facing and our support team will get back to you.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                variant="outlined"
                placeholder="Briefly describe the issue"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Priority"
                name="priority"
                select
                value={formData.priority}
                onChange={handleChange}
                required
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                multiline
                rows={6}
                variant="outlined"
                placeholder="Provide as much detail as possible..."
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/support')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={loading}
                  startIcon={loading && <CircularProgress size={20} />}
                >
                  Submit Ticket
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateTicket;
