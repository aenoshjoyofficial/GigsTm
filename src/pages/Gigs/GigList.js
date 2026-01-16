import { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Grid, Card, CardContent, CardActions, Button, TextField, Box, CircularProgress, Chip, MenuItem, Select, FormControl, InputLabel, IconButton } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, FilterList as FilterIcon, Bookmark as BookmarkIcon, BookmarkBorder as BookmarkBorderIcon } from '@mui/icons-material';

const GigList = () => {
  const [gigs, setGigs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const [gigsRes, categoriesRes, bookmarksRes] = await Promise.all([
        supabase
          .from('gigs')
          .select(`
            *,
            gig_categories (name)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('gig_categories')
          .select('*')
          .order('name'),
        session ? supabase
          .from('gig_bookmarks')
          .select('gig_id')
          .eq('user_id', session.user.id) : Promise.resolve({ data: [] })
      ]);

      if (gigsRes.error) throw new Error(gigsRes.error.message);
      if (categoriesRes.error) throw new Error(categoriesRes.error.message);

      setGigs(gigsRes.data || []);
      setCategories(categoriesRes.data || []);
      setBookmarks(new Set(bookmarksRes.data?.map(b => b.gig_id) || []));
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleBookmark = useCallback(async (gigId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (bookmarks.has(gigId)) {
        const { error } = await supabase
          .from('gig_bookmarks')
          .delete()
          .eq('user_id', session.user.id)
          .eq('gig_id', gigId);
        if (error) throw new Error(error.message);
        
        const newBookmarks = new Set(bookmarks);
        newBookmarks.delete(gigId);
        setBookmarks(newBookmarks);
      } else {
        const { error } = await supabase
          .from('gig_bookmarks')
          .insert({ user_id: session.user.id, gig_id: gigId });
        if (error) throw new Error(error.message);

        const newBookmarks = new Set(bookmarks);
        newBookmarks.add(gigId);
        setBookmarks(newBookmarks);
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err.message);
    }
  }, [bookmarks]);

  const filteredGigs = gigs.filter(gig => {
    const matchesSearch = gig.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gig.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || gig.category_id === selectedCategory;
    const matchesBookmarks = !showBookmarksOnly || bookmarks.has(gig.id);
    return matchesSearch && matchesCategory && matchesBookmarks;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Available Gigs
        </Typography>
        <Button variant="contained" color="primary" component={Link} to="/create-gig">
          Create Gig
        </Button>
      </Box>

      <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <Grid item xs={12} md={5}>
          <TextField
            fullWidth
            label="Search Gigs"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="category-filter-label">Filter by Category</InputLabel>
            <Select
              labelId="category-filter-label"
              id="category-filter"
              value={selectedCategory}
              label="Filter by Category"
              onChange={(e) => setSelectedCategory(e.target.value)}
              startAdornment={<FilterIcon color="action" sx={{ mr: 1 }} />}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button 
            fullWidth 
            variant={showBookmarksOnly ? "contained" : "outlined"} 
            color="secondary"
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
            startIcon={showBookmarksOnly ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          >
            {showBookmarksOnly ? "Showing Bookmarks" : "Show Bookmarks"}
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {filteredGigs.length > 0 ? (
          filteredGigs.map((gig) => (
            <Grid item key={gig.id} xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography gutterBottom variant="h5" component="h2">
                      {gig.title}
                    </Typography>
                    <IconButton 
                      onClick={() => toggleBookmark(gig.id)}
                      color="secondary"
                      size="small"
                    >
                      {bookmarks.has(gig.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                    </IconButton>
                  </Box>
                  {gig.gig_categories && (
                    <Chip label={gig.gig_categories.name} size="small" sx={{ mb: 1 }} color="primary" variant="outlined" />
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {gig.description}
                  </Typography>
                  <Typography variant="h6" color="secondary" sx={{ mt: 2 }}>
                    ${gig.pay_amount}
                  </Typography>
                  {gig.location && (
                    <Typography variant="caption" color="text.secondary">
                      📍 {gig.location}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" component={Link} to={`/gigs/${gig.id}`}>
                    View Details
                  </Button>
                  <Button size="small" variant="contained">
                    Apply Now
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography variant="body1" textAlign="center" color="text.secondary">
              No gigs found matching your search.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default GigList;
