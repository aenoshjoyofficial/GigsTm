import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, CircularProgress, Alert, MenuItem, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Campaign as AnnouncementIcon } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const ManageAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_role: 'all'
  });

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
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

  const handleOpen = useCallback((announcement = null) => {
    if (announcement) {
      setFormData({
        title: announcement.title,
        content: announcement.content,
        target_role: announcement.target_role
      });
      setEditingId(announcement.id);
    } else {
      setFormData({ title: '', content: '', target_role: 'all' });
      setEditingId(null);
    }
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();

      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update({ ...formData })
          .eq('id', editingId);
        if (error) throw new Error(error.message);
        setSuccess('Announcement updated successfully!');
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert({ ...formData, created_by: session.user.id });
        if (error) throw new Error(error.message);
        setSuccess('Announcement created successfully!');
      }

      handleClose();
      fetchAnnouncements();
    } catch (err) {
      console.error('Error saving announcement:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingId, handleClose, fetchAnnouncements]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Announcement deleted successfully!');
      fetchAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      setError(err.message);
    }
  }, [fetchAnnouncements]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          Manage Announcements
        </Typography>
        <Button variant="contained" startIcon={<AnnouncementIcon />} onClick={() => handleOpen()}>
          New Announcement
        </Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Target Role</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {announcements.map((ann) => (
              <TableRow key={ann.id}>
                <TableCell>{ann.title}</TableCell>
                <TableCell>{ann.target_role.toUpperCase()}</TableCell>
                <TableCell>{new Date(ann.created_at).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <IconButton color="primary" onClick={() => handleOpen(ann)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(ann.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {announcements.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">No announcements found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              label="Title"
              margin="normal"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Content"
              margin="normal"
              required
              multiline
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            />
            <TextField
              select
              fullWidth
              label="Target Role"
              margin="normal"
              value={formData.target_role}
              onChange={(e) => setFormData(prev => ({ ...prev, target_role: e.target.value }))}
            >
              <MenuItem value="all">All Users</MenuItem>
              <MenuItem value="worker">Workers Only</MenuItem>
              <MenuItem value="manager">Managers Only</MenuItem>
              <MenuItem value="admin">Admins Only</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default ManageAnnouncements;
