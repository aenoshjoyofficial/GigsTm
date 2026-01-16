import { useState, useEffect } from 'react';
import { Badge, IconButton, Menu, Typography, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications' 
      }, async (payload) => {
        // Check if the notification is for the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user && payload.new.user_id === user.id) {
          setNotifications(prev => [payload.new, ...prev.slice(0, 4)]);
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error for notifications');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw new Error(error.message);
      setNotifications(data || []);

      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
      
      if (countError) throw new Error(countError.message);
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
    }
  };

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err.message);
    }
  };

  const handleViewAll = () => {
    handleClose();
    navigate('/notifications');
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Typography variant="caption" color="primary" sx={{ cursor: 'pointer' }}>
              Mark all as read
            </Typography>
          )}
        </Box>
        <Divider />
        <List sx={{ p: 0 }}>
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <ListItem 
                key={n.id} 
                sx={{ 
                  bgcolor: n.is_read ? 'transparent' : 'action.hover',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
                onClick={() => handleMarkAsRead(n.id)}
              >
                <ListItemText 
                  primary={n.title}
                  secondary={
                    <>
                      <Typography variant="body2" color="text.primary">{n.message}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(n.created_at).toLocaleTimeString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="No new notifications" />
            </ListItem>
          )}
        </List>
        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button fullWidth onClick={handleViewAll}>View All</Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBell;
