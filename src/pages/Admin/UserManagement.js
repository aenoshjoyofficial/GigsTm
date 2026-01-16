import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, Chip, CircularProgress, Alert, Avatar } from '@mui/material';
import { supabase } from '../../supabaseClient';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err.message);
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = useCallback(async (userId, newRole) => {
    try {
      setUpdatingId(userId);
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (updateError) throw new Error(updateError.message);

      setUsers(prevUsers => prevUsers.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error updating role:', err.message);
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const toggleUserStatus = useCallback(async (user) => {
    try {
      setLoading(true);
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus })
        .eq('user_id', user.user_id);

      if (error) throw new Error(error.message);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  const getRoleColor = useCallback((role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'client': return 'info';
      default: return 'success';
    }
  }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>User & Role Management</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        View all registered users and manage their access levels.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email / Contact</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={user.avatar_url}>{user.full_name?.charAt(0)}</Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">{user.full_name || 'Anonymous'}</Typography>
                      <Typography variant="caption" color="text.secondary">{user.user_id}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{user.contact_number || 'N/A'}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.country || 'Unknown'}</Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.role.toUpperCase()} 
                    size="small" 
                    color={getRoleColor(user.role)}
                    sx={{ fontWeight: 'bold' }}
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                    <Chip 
                      label={user.status === 'active' ? 'Active' : 'Suspended'}
                      size="small"
                      color={user.status === 'active' ? 'success' : 'error'}
                      onClick={() => toggleUserStatus(user)}
                      sx={{ cursor: 'pointer' }}
                    />
                    <Select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                      size="small"
                      disabled={updatingId === user.user_id}
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="worker">Worker</MenuItem>
                      <MenuItem value="client">Client</MenuItem>
                      <MenuItem value="manager">Manager</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default UserManagement;
