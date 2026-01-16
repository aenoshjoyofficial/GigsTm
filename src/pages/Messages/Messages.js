import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { Container, Grid, List, ListItem, ListItemText, ListItemAvatar, Avatar, Typography, Divider, Box, TextField, IconButton, CircularProgress } from '@mui/material';
import { Send as SendIcon, ChatBubble as ChatIcon } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchConversations = useCallback(async (userId) => {
    try {
      // This is a complex query to get unique conversations. 
      // In a real app, you might have a 'conversations' table.
      // Here we derive it from the 'messages' table.
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, created_at')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      const userMap = new Map();
      for (const msg of data) {
        const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!userMap.has(otherId)) {
          userMap.set(otherId, msg);
        }
      }

      const otherUserIds = Array.from(userMap.keys());
      if (otherUserIds.length === 0) return;

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', otherUserIds);

      if (profileError) throw new Error(profileError.message);

      const convos = profiles.map(profile => ({
        ...profile,
        lastMessage: userMap.get(profile.user_id).content,
        lastDate: userMap.get(profile.user_id).created_at
      })).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

      setConversations(convos);
      return convos;
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return [];
    }
  }, []);

  const handleRealtimeMessage = useCallback(async (newMsg) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // If it's for the current chat
    if (selectedUser && (
      (newMsg.sender_id === user.id && newMsg.receiver_id === selectedUser.user_id) ||
      (newMsg.sender_id === selectedUser.user_id && newMsg.receiver_id === user.id)
    )) {
      setMessages(prev => [...prev, newMsg]);
    }

    // Refresh conversation list to update last message and unread status
    fetchConversations(user.id);
  }, [selectedUser, fetchConversations]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }
      setCurrentUser(session.user);
      const currentConvos = await fetchConversations(session.user.id);
      
      // Handle new conversation from query param
      const params = new URLSearchParams(location.search);
      const targetUserId = params.get('userId');
      if (targetUserId) {
        // Check if we already have a conversation with this user
        const existingConvo = currentConvos.find(c => c.user_id === targetUserId);
        if (existingConvo) {
          setSelectedUser(existingConvo);
        } else {
          // Fetch profile for the new user
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, avatar_url')
            .eq('user_id', targetUserId)
            .single();
          
          if (!error && profile) {
            setSelectedUser({
              ...profile,
              lastMessage: '',
              lastDate: new Date().toISOString()
            });
          }
        }
      }
      setLoading(false);
    };
    init();

    // Subscribe to new messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        handleRealtimeMessage(payload.new);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error for messages');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, fetchConversations, handleRealtimeMessage, location.search]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const fetchMessages = useCallback(async (otherId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', otherId)
        .eq('receiver_id', user.id);

    } catch (err) {
      console.error('Error fetching messages:', err.message);
    }
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.user_id);
    }
  }, [selectedUser, fetchMessages]);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedUser.user_id,
          content: newMessage.trim()
        });

      if (error) throw new Error(error.message);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, [newMessage, selectedUser]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, height: 'calc(100vh - 160px)' }}>
      <Grid container spacing={0} sx={{ height: '100%', border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
        {/* Conversations List */}
        <Grid item xs={12} md={4} sx={{ borderRight: '1px solid #ddd', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6">Conversations</Typography>
          </Box>
          <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
            {conversations.length > 0 ? (
              conversations.map((convo) => (
                <Fragment key={convo.user_id}>
                  <ListItem 
                    button 
                    selected={selectedUser?.user_id === convo.user_id}
                    onClick={() => setSelectedUser(convo)}
                  >
                    <ListItemAvatar>
                      <Avatar src={convo.avatar_url}>{convo.full_name?.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={convo.full_name} 
                      secondary={convo.lastMessage} 
                      primaryTypographyProps={{ fontWeight: selectedUser?.user_id === convo.user_id ? 'bold' : 'normal' }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItem>
                  <Divider />
                </Fragment>
              ))
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <ChatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">No conversations yet.</Typography>
              </Box>
            )}
          </List>
        </Grid>

        {/* Chat Window */}
        <Grid item xs={12} md={8} sx={{ bgcolor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center' }}>
                <Avatar src={selectedUser.avatar_url} sx={{ mr: 2 }}>{selectedUser.full_name?.charAt(0)}</Avatar>
                <Typography variant="subtitle1" fontWeight="bold">{selectedUser.full_name}</Typography>
              </Box>

              {/* Messages Area */}
              <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {messages.map((msg) => (
                  <Box 
                    key={msg.id} 
                    sx={{ 
                      alignSelf: msg.sender_id === currentUser.id ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                      bgcolor: msg.sender_id === currentUser.id ? 'primary.main' : 'white',
                      color: msg.sender_id === currentUser.id ? 'white' : 'text.primary',
                      p: 1.5,
                      borderRadius: 2,
                      boxShadow: 1
                    }}
                  >
                    <Typography variant="body1">{msg.content}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, opacity: 0.8 }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Box>

              {/* Message Input */}
              <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #ddd' }}>
                <Grid container spacing={1}>
                  <Grid item xs>
                    <TextField 
                      fullWidth 
                      placeholder="Type a message..." 
                      size="small"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                  </Grid>
                  <Grid item>
                    <IconButton color="primary" type="submit" disabled={!newMessage.trim()}>
                      <SendIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            </>
          ) : (
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'text.secondary' }}>
              <ChatIcon sx={{ fontSize: 64, mb: 2, opacity: 0.2 }} />
              <Typography>Select a conversation to start chatting</Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Messages;
