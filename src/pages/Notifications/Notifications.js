import { useState, useEffect, useCallback, Fragment } from 'react';
import { Container, Typography, Paper, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Divider, Box, CircularProgress, Alert, Button, Chip } from '@mui/material';
import { Delete, DoneAll, Info, CheckCircle, Warning, Error } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw new Error(error.message);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err.message);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      if (error) throw new Error(error.message);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  }, []);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      default: return <Info color="info" />;
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
  );

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Notifications</Typography>
        <Button 
          variant="outlined" 
          startIcon={<DoneAll />} 
          onClick={handleMarkAllRead}
          disabled={!notifications.some(n => !n.is_read)}
        >
          Mark all as read
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={3}>
        <List sx={{ p: 0 }}>
          {notifications.length > 0 ? (
            notifications.map((n, index) => (
              <Fragment key={n.id}>
                <ListItem 
                  sx={{ 
                    py: 2, 
                    bgcolor: n.is_read ? 'transparent' : 'action.hover',
                    transition: 'background-color 0.3s'
                  }}
                  onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                >
                  <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                    {getTypeIcon(n.type)}
                  </Box>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={n.is_read ? 'normal' : 'bold'}>
                          {n.title}
                        </Typography>
                        {!n.is_read && <Chip label="New" color="primary" size="small" />}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.primary" sx={{ my: 0.5 }}>
                          {n.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(n.created_at).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleDelete(n.id)}>
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </Fragment>
            ))
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                You have no notifications yet.
              </Typography>
            </Box>
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default Notifications;
