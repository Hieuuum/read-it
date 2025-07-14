require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const checkAuth = require('./middleware/auth');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Library routes
app.use('/api/library', require('./routes/library'));

// Movie routes
app.use('/api/movies', require('./routes/movies'));

// Search proxy route
app.get('/api/search', checkAuth, async (req, res) => {
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

// Default route serves the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// Catch-all route for client-side routing
app.get('*', (req, res) => {
    // Don't handle API routes
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
    }
    // Serve index.html for all other routes
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 