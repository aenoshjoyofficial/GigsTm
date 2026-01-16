import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Accordion, AccordionSummary, AccordionDetails, Box, CircularProgress, Alert, TextField, InputAdornment } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Search as SearchIcon } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const FAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchFAQs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faq_articles')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw new Error(error.message);
      setFaqs(data || []);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setError('Failed to load FAQs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" textAlign="center">
        Frequently Asked Questions
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
        Find answers to common questions about GigsTM.
      </Typography>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search FAQs..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 4 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {filteredFaqs.length > 0 ? (
        filteredFaqs.map((faq) => (
          <Accordion key={faq.id} sx={{ mb: 1, borderRadius: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">{faq.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary">
                {faq.answer}
              </Typography>
              {faq.category && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                  Category: {faq.category}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography textAlign="center" color="text.secondary" sx={{ mt: 4 }}>
          No FAQs found matching your search.
        </Typography>
      )}
    </Container>
  );
};

export default FAQs;
