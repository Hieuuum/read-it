const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// Get all media items for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching media items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new media item
router.post('/', async (req, res) => {
  try {
    const { api_id, media_type, title, poster_path } = req.body;
    
    const { data, error } = await supabase
      .from('media_items')
      .insert([{
        user_id: req.user.id,
        api_id,
        media_type,
        title,
        poster_path
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding media item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a media item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_rating, status } = req.body;
    
    const { data, error } = await supabase
      .from('media_items')
      .update({ user_rating, status })
      .match({ id, user_id: req.user.id })
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Media item not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error updating media item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a media item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('media_items')
      .delete()
      .match({ id, user_id: req.user.id });

    if (error) throw error;
    res.json({ message: 'Media item deleted successfully' });
  } catch (error) {
    console.error('Error deleting media item:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 