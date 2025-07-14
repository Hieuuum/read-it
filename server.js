require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { checkApiAuth, checkPageAuth } = require('./middleware/auth');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Public routes (no auth required)
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Protected page routes
app.get('/dashboard.html', checkPageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

app.get('/library.html', checkPageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'library.html'));
});

// Protected API routes
app.use('/api/library', checkApiAuth, require('./routes/library'));
app.use('/api/movies', checkApiAuth, require('./routes/movies'));

// Search proxy route
app.get('/api/search', checkApiAuth, async (req, res) => {
    try {
        const query = req.query.query;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const tmdbApiKey = process.env.TMDB_API_KEY;
        if (!tmdbApiKey) {
            throw new Error('TMDB API key not configured');
        }

        // Search both movies and TV shows
        const [movieResponse, tvResponse] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}`),
            fetch(`https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}`)
        ]);

        if (!movieResponse.ok || !tvResponse.ok) {
            throw new Error('Failed to fetch from TMDB API');
        }

        const [movies, tvShows] = await Promise.all([
            movieResponse.json(),
            tvResponse.json()
        ]);

        // Combine and format results
        const combinedResults = [
            ...movies.results.map(movie => ({
                id: movie.id.toString(),
                media_type: 'movie',
                title: movie.title,
                poster_path: movie.poster_path
            })),
            ...tvShows.results.map(show => ({
                id: show.id.toString(),
                media_type: 'tv',
                title: show.name,
                poster_path: show.poster_path
            }))
        ];

        // Sort by popularity (assuming both movies and shows have similar popularity scales)
        combinedResults.sort((a, b) => b.popularity - a.popularity);

        // Limit to first 20 results
        res.json(combinedResults.slice(0, 20));

    } catch (error) {
        console.error('Search proxy error:', error);
        res.status(500).json({ error: 'Failed to search media' });
    }
});

// Default route handler
app.get('/', (req, res) => {
    // Check if user is authenticated
    const { data: { session } } = supabase.auth.getSession();
    if (session) {
        res.redirect('/dashboard.html');
    } else {
        res.redirect('/index.html');
    }
});

// Catch-all route for client-side routing
app.get('*', (req, res) => {
    // Don't handle API routes
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
    }
    // Redirect to login for all other routes
    res.redirect('/index.html');
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 