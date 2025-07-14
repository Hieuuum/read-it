const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const checkAuth = require('../middleware/auth');

// Get user's interactions with a movie
router.get('/:movieId/interactions', checkAuth, async (req, res) => {
    try {
        const { movieId } = req.params;
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('movie_interactions')
            .select('*')
            .eq('user_id', userId)
            .eq('movie_id', movieId)
            .single();

        if (error) throw error;

        // If no interactions found, return default values
        if (!data) {
            return res.json({
                watched: false,
                in_watchlist: false,
                liked: false,
                rating: 0
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Get movie interactions error:', error);
        res.status(500).json({ error: 'Failed to get movie interactions' });
    }
});

// Update user's interaction with a movie
router.post('/:movieId/interactions', checkAuth, async (req, res) => {
    try {
        const { movieId } = req.params;
        const { type, value } = req.body;
        const userId = req.user.id;

        // Validate interaction type
        const validTypes = ['watched', 'watchlist', 'liked', 'rating'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid interaction type' });
        }

        // Validate rating value if applicable
        if (type === 'rating' && (value < 0 || value > 5)) {
            return res.status(400).json({ error: 'Rating must be between 0 and 5' });
        }

        // Check if interaction record exists
        const { data: existing } = await supabase
            .from('movie_interactions')
            .select('*')
            .eq('user_id', userId)
            .eq('movie_id', movieId)
            .single();

        let result;
        if (existing) {
            // Update existing record
            const updateData = {};
            switch (type) {
                case 'watched':
                    updateData.watched = value;
                    break;
                case 'watchlist':
                    updateData.in_watchlist = value;
                    break;
                case 'liked':
                    updateData.liked = value;
                    break;
                case 'rating':
                    updateData.rating = value;
                    break;
            }

            result = await supabase
                .from('movie_interactions')
                .update(updateData)
                .eq('user_id', userId)
                .eq('movie_id', movieId);
        } else {
            // Create new record
            const newData = {
                user_id: userId,
                movie_id: movieId,
                watched: type === 'watched' ? value : false,
                in_watchlist: type === 'watchlist' ? value : false,
                liked: type === 'liked' ? value : false,
                rating: type === 'rating' ? value : 0
            };

            result = await supabase
                .from('movie_interactions')
                .insert([newData]);
        }

        if (result.error) throw result.error;

        // Return updated interaction data
        const { data: updated, error } = await supabase
            .from('movie_interactions')
            .select('*')
            .eq('user_id', userId)
            .eq('movie_id', movieId)
            .single();

        if (error) throw error;
        res.json(updated);
    } catch (error) {
        console.error('Update movie interaction error:', error);
        res.status(500).json({ error: 'Failed to update movie interaction' });
    }
});

module.exports = router; 