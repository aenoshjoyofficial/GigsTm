import { useState, useEffect, useCallback } from 'react';
import { Container, TextField, Button, Typography, Box, MenuItem, CircularProgress, Paper, Grid } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { CloudUpload, CheckCircle, PendingActions } from '@mui/icons-material';

const KYCDocumentUpload = () => {
  const [documentType, setDocumentType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUserAndFetchDocs = async () => {
      setFetching(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }
      
      setUser(session.user);

      // Fetch existing documents
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching KYC docs:', error);
      } else {
        setExistingDocuments(data || []);
      }
      setFetching(false);
    };
    checkUserAndFetchDocs();
  }, [navigate]);

  const handleFileChange = useCallback((event) => {
    setSelectedFile(event.target.files[0]);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (!user) {
      setError('User not authenticated.');
      setLoading(false);
      return;
    }

    if (!documentType || !selectedFile) {
      setError('Please select a document type and upload a file.');
      setLoading(false);
      return;
    }

    try {
      // 1. Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`; 

      let { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // 2. Get public URL of the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      const publicURL = publicUrlData.publicUrl;

      // 3. Record document details in kyc_documents table
      const { data: newDoc, error: insertError } = await supabase.from('kyc_documents').insert([
        {
          user_id: user.id,
          document_type: documentType,
          document_url: publicURL,
          verification_status: 'pending',
        },
      ]).select().single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      setMessage('KYC Document uploaded successfully! It is now pending verification.');
      setExistingDocuments(prev => [newDoc, ...prev]);
      setDocumentType('');
      setSelectedFile(null);
      if (document.getElementById('file-upload')) {
        document.getElementById('file-upload').value = '';
      }

    } catch (error) {
      setError(error.message);
      console.error('Error uploading KYC document:', error.message);
    } finally {
      setLoading(false);
    }
  }, [user, documentType, selectedFile]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'approved': return 'success.main';
      case 'rejected': return 'error.main';
      default: return 'warning.main';
    }
  }, []);

  if (fetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const documentTypes = ['Passport', 'National ID', 'Driver License', 'Utility Bill', 'Other'];

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography component="h1" variant="h4" gutterBottom align="center" fontWeight="bold" color="primary">
        KYC Verification
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload New Document
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <TextField
                select
                label="Document Type"
                fullWidth
                margin="normal"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                required
              >
                {documentTypes.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUpload />}
                sx={{ mt: 2, mb: 2, py: 1.5 }}
              >
                {selectedFile ? 'Change File' : 'Select Document File'}
                <input
                  type="file"
                  hidden
                  id="file-upload"
                  onChange={handleFileChange}
                  required
                />
              </Button>
              
              {selectedFile && (
                <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>
                  Selected: {selectedFile.name}
                </Typography>
              )}
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Submit for Verification'}
              </Button>
              
              {message && <Typography color="success.main" sx={{ mt: 2, textAlign: 'center' }}>{message}</Typography>}
              {error && <Typography color="error.main" sx={{ mt: 2, textAlign: 'center' }}>{error}</Typography>}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Your Documents
            </Typography>
            {existingDocuments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No documents uploaded yet.</Typography>
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                {existingDocuments.map((doc) => (
                  <Paper key={doc.id} variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography fontWeight="bold">{doc.document_type}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {doc.verification_status === 'approved' ? <CheckCircle color="success" size="small" /> : <PendingActions color="warning" size="small" />}
                      <Typography variant="body2" fontWeight="bold" sx={{ color: getStatusColor(doc.verification_status), textTransform: 'capitalize' }}>
                        {doc.verification_status}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default KYCDocumentUpload;
