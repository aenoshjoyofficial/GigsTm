import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Card, CardContent, Box, CircularProgress, Alert, Chip, Divider } from '@mui/material';
import { Campaign as AnnouncementIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = useCallback((dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userRole = session?.user?.user_metadata?.role || 'all';

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .or(`target_role.eq.all,target_role.eq.${userRole}`)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, justifyContent: 'center' }}>
        <AnnouncementIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
        <Typography variant="h4" fontWeight="bold">
          System Announcements
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {announcements.length > 0 ? (
        announcements.map((announcement) => (
          <Card key={announcement.id} sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {announcement.title}
                </Typography>
                <Chip 
                  label={announcement.target_role.toUpperCase()} 
                  size="small" 
                  color={announcement.target_role === 'all' ? 'default' : 'secondary'} 
                  variant="outlined"
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.secondary' }}>
                <TimeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption">
                  {formatDate(announcement.created_at)}
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {announcement.content}
              </Typography>
            </CardContent>
          </Card>
        ))
      ) : (
        <Typography textAlign="center" color="text.secondary" sx={{ mt: 4 }}>
          No announcements at this time.
        </Typography>
      )}
    </Container>
  );
};

export default Announcements;
