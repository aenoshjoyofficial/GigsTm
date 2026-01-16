import { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Badge } from '@mui/material';
import { Menu as MenuIcon, Dashboard, Work, AccountBalanceWallet, Person, AdminPanelSettings, Logout, History, Help, Chat, People, Campaign, Gavel } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import NotificationBell from './NotificationBell';

const Layout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const isAuthPage = ['/signin', '/signup', '/admin/signin', '/admin/signup', '/forgot-password', '/reset-password', '/admin/forgot-password', '/admin/reset-password'].includes(location.pathname);

  useEffect(() => {
    let channel;

    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      channel = supabase
        .channel('messages_count')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${session.user.id}`
        }, () => {
          fetchUnreadMessages();
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('Real-time subscription error for unread messages. Check if Realtime is enabled for "messages" table.');
          }
        });
    };

    fetchUnreadMessages();
    fetchUserRole();
    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchUnreadMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', session.user.id)
        .eq('is_read', false);

      if (error) throw new Error(error.message);
      setUnreadMessages(count || 0);
    } catch (err) {
      console.error('Error fetching unread messages:', err.message);
    }
  };

  const fetchUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      setUserRole(profile?.role || 'worker');
    } catch (err) {
      console.error('Error fetching user role:', err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(isAdminPath ? '/admin/signin' : '/signin');
  };

  const menuItems = [
    { text: 'Gigs', icon: <Work />, path: '/gigs' },
    { text: 'My Applications', icon: <Dashboard />, path: '/applications' },
    { text: 'Messages', icon: <Chat />, path: '/messages', badge: unreadMessages },
    { text: 'Wallet', icon: <AccountBalanceWallet />, path: '/wallet' },
    { text: 'Announcements', icon: <Campaign />, path: '/announcements' },
    { text: 'Profile', icon: <Person />, path: '/profile' },
    { text: 'Referrals', icon: <People />, path: '/referrals' },
    { text: 'Support', icon: <Help />, path: '/support' },
    { text: 'FAQ', icon: <Help />, path: '/faq' },
  ];

  const adminItems = [
    { text: 'Admin Dashboard', icon: <AdminPanelSettings />, path: '/admin/dashboard' },
    { text: 'Admin Profile', icon: <Person />, path: '/admin/profile' },
    { text: 'Admin Analytics', icon: <AdminPanelSettings />, path: '/admin/analytics' },
    { text: 'User Management', icon: <Person />, path: '/admin/users' },
    { text: 'Announcements', icon: <Campaign />, path: '/admin/announcements' },
    { text: 'KYC Management', icon: <AdminPanelSettings />, path: '/admin/kyc' },
    { text: 'Manage Disputes', icon: <Gavel />, path: '/admin/disputes' },
    { text: 'Payouts', icon: <History />, path: '/admin/payouts' },
    { text: 'System Logs', icon: <History />, path: '/admin/logs' },
    { text: 'Manager Dashboard', icon: <AdminPanelSettings />, path: '/manager/dashboard' },
  ];

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={1} sx={{ bgcolor: isAdminPath ? 'secondary.main' : 'primary.main' }}>
        <Toolbar>
          {!isAuthPage && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              cursor: isAuthPage ? 'default' : 'pointer', 
              fontWeight: 'bold',
              textAlign: isAuthPage ? 'center' : 'left'
            }}
            onClick={() => !isAuthPage && navigate(isAdminPath ? '/admin/dashboard' : '/')}
          >
            GigsTM {!isAuthPage && isAdminPath && '- Admin Panel'}
          </Typography>
          
          {!isAuthPage && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!isAdminPath && <NotificationBell />}
              <Button color="inherit" onClick={() => navigate(isAdminPath ? '/admin/profile' : '/profile')}>Profile</Button>
              <Button color="inherit" onClick={handleLogout}>Logout</Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <Box 
            sx={{ 
              p: 2, 
              textAlign: 'center', 
              bgcolor: isAdminPath ? 'secondary.main' : 'primary.main', 
              color: 'white',
              cursor: 'pointer'
            }}
            onClick={() => {
              navigate(isAdminPath ? '/admin/dashboard' : '/');
              setDrawerOpen(false);
            }}
          >
            <Typography variant="h6" fontWeight="bold">GigsTM {isAdminPath ? 'Admin' : 'Menu'}</Typography>
          </Box>
          <Divider />
          <List>
            {(isAdminPath ? adminItems : menuItems).map((item) => (
              <ListItem 
                button 
                key={item.text} 
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? (isAdminPath ? 'secondary.main' : 'primary.main') : 'inherit' }}>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
          <Divider />
          
          {userRole === 'admin' && (
            <List>
              <ListItem 
                button 
                onClick={() => navigate(isAdminPath ? '/' : '/admin/dashboard')}
                sx={{ 
                  bgcolor: isAdminPath ? 'primary.light' : 'secondary.light',
                  color: 'white',
                  '&:hover': {
                    bgcolor: isAdminPath ? 'primary.main' : 'secondary.main',
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'white' }}>
                  <AdminPanelSettings />
                </ListItemIcon>
                <ListItemText primary={isAdminPath ? 'Switch to Worker Panel' : 'Switch to Admin Panel'} />
              </ListItem>
            </List>
          )}
          
          <Divider />
          <List>
            <ListItem button onClick={handleLogout}>
              <ListItemIcon><Logout /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Container>

      <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: 'grey.100', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} GigsTM Marketplace. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout;
