import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Typography, Box, Paper, Grid, Chip, Divider, TextField, Button, Avatar, CircularProgress, Alert, List, ListItem, MenuItem, Select, FormControl } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowBack, Person, SupportAgent } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setCurrentUserProfile(profile);
    }
  }, []);

  const fetchTicketAndMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: ticketData, error: ticketError } = await supabase
        .from('help_center_tickets')
        .select(`
          *,
          user_profiles:user_id (full_name, role)
        `)
        .eq('id', id)
        .single();

      if (ticketError) throw new Error(ticketError.message);
      setTicket(ticketData);

      const { data: messagesData, error: messagesError } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (messagesError) throw new Error(messagesError.message);
      setMessages(messagesData);
    } catch (err) {
      console.error('Error fetching ticket details:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicketAndMessages();
    getCurrentUser();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`ticket_messages:${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ticket_messages',
        filter: `ticket_id=eq.${id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error for ticket messages');
          setError('Real-time updates failed. Please refresh.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchTicketAndMessages, getCurrentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleStatusChange = useCallback(async (newStatus) => {
    try {
      const { error: updateError } = await supabase
        .from('help_center_tickets')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) throw new Error(updateError.message);
      setTicket(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  }, [id]);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: sendError } = await supabase
        .from('ticket_messages')
        .insert([
          {
            ticket_id: id,
            sender_id: user.id,
            message: newMessage.trim()
          }
        ]);

      if (sendError) throw new Error(sendError.message);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }, [id, newMessage]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'primary';
    }
  }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Container sx={{ mt: 4 }}>
      <Alert severity="error">{error}</Alert>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/support')} sx={{ mt: 2 }}>
        Back to Tickets
      </Button>
    </Container>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate('/support')} 
        sx={{ mb: 2 }}
      >
        Back to Tickets
      </Button>

      <Grid container spacing={3}>
        {/* Ticket Info */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>{ticket.subject}</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 1 }}>
                  {currentUserProfile?.role === 'admin' ? (
                    <FormControl fullWidth size="small">
                      <Select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                      >
                        <MenuItem value="open">Open</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="resolved">Resolved</MenuItem>
                        <MenuItem value="closed">Closed</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <Chip 
                      label={ticket.status.replace('_', ' ').toUpperCase()} 
                      size="small" 
                      color={getStatusColor(ticket.status)} 
                    />
                  )}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary">Priority</Typography>
                <Box>
                  <Chip 
                    label={ticket.priority.toUpperCase()} 
                    size="small" 
                    variant="outlined"
                    color={ticket.priority === 'high' ? 'error' : ticket.priority === 'medium' ? 'warning' : 'info'} 
                  />
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">Ticket ID</Typography>
                <Typography variant="body2">{ticket.id}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">Created</Typography>
                <Typography variant="body2">{new Date(ticket.created_at).toLocaleString()}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">Last Update</Typography>
                <Typography variant="body2">{new Date(ticket.updated_at).toLocaleString()}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Message Thread */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
              <Typography variant="h6">Conversation</Typography>
            </Box>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: 'grey.50' }}>
              <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {messages.map((msg, index) => {
                  const isCurrentUser = msg.sender_id === currentUser?.id;
                  return (
                    <ListItem 
                      key={index} 
                      sx={{ 
                        flexDirection: 'column', 
                        alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                        p: 0
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                        alignItems: 'flex-start',
                        maxWidth: '80%',
                        gap: 1
                      }}>
                        <Avatar sx={{ bgcolor: isCurrentUser ? 'primary.main' : 'secondary.main', width: 32, height: 32 }}>
                          {isCurrentUser ? <Person fontSize="small" /> : <SupportAgent fontSize="small" />}
                        </Avatar>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          bgcolor: isCurrentUser ? 'primary.main' : 'white',
                          color: isCurrentUser ? 'primary.contrastText' : 'text.primary',
                          boxShadow: 1
                        }}>
                          <Typography variant="body1">{msg.message}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  );
                })}
                <div ref={messagesEndRef} />
              </List>
            </Box>

            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              {ticket.status === 'closed' || ticket.status === 'resolved' ? (
                <Alert severity="info">This ticket is {ticket.status}. Re-open it by sending a message.</Alert>
              ) : null}
              
              <form onSubmit={handleSendMessage}>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Type your message here..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                    variant="outlined"
                    size="small"
                  />
                  <Button 
                    type="submit" 
                    variant="contained" 
                    disabled={sending || !newMessage.trim()}
                    endIcon={sending ? <CircularProgress size={20} /> : <Send />}
                  >
                    Send
                  </Button>
                </Box>
              </form>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TicketDetails;
