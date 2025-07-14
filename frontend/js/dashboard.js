import { checkSession, showError } from './main.js';

// TMDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Get DOM elements
const searchForm = document.getElementById('searchForm');
const searchQuery = document.getElementById('searchQuery');
const movieGrid = document.getElementById('movie-grid');
const loadingState = document.getElementById('loadingState');
const movieModal = document.getElementById('movieModal');
const modalPoster = document.getElementById('modalPoster');
const modalTitle = document.getElementById('modalTitle');
const modalReleaseDate = document.getElementById('modalReleaseDate');
const modalOverview = document.getElementById('modalOverview');
const closeModal = document.getElementById('closeModal');
const watchedBtn = document.getElementById('watchedBtn');
const watchlistBtn = document.getElementById('watchlistBtn');
const likeBtn = document.getElementById('likeBtn');
const starRating = document.getElementById('starRating');

// Show loading state
function showLoading(show = true) {
    loadingState.classList.toggle('hidden', !show);
}

// Format date to be more readable
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Create movie card element
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer transform transition-transform hover:scale-105';
    card.dataset.movieId = movie.id;
    
    const posterUrl = movie.poster_path
        ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
        : '/images/no-poster.png';
    
    card.innerHTML = `
        <img src="${posterUrl}" alt="${movie.title}" 
             class="w-full h-[300px] object-cover">
        <div class="p-4">
            <h3 class="text-lg font-semibold truncate">${movie.title}</h3>
            <p class="text-gray-400 text-sm">${formatDate(movie.release_date)}</p>
        </div>
    `;
    
    return card;
}

// Fetch trending movies from TMDB
async function fetchTrendingMovies() {
    try {
        showLoading(true);
        movieGrid.innerHTML = '';

        const response = await fetch(
            `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`
        );

        if (!response.ok) throw new Error('Failed to fetch trending movies');

        const data = await response.json();
        return data.results.slice(0, 20); // Get first 20 movies
    } catch (error) {
        console.error('Fetch trending movies error:', error);
        showError('Failed to load trending movies');
        return [];
    } finally {
        showLoading(false);
    }
}

// Search movies from TMDB
async function searchMovies(query) {
    try {
        showLoading(true);
        movieGrid.innerHTML = '';

        const response = await fetch(
            `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
        );

        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        return data.results.slice(0, 20); // Get first 20 results
    } catch (error) {
        console.error('Search error:', error);
        showError('Search failed');
        return [];
    } finally {
        showLoading(false);
    }
}

// Get movie details from TMDB
async function getMovieDetails(movieId) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`
        );

        if (!response.ok) throw new Error('Failed to fetch movie details');

        return await response.json();
    } catch (error) {
        console.error('Get movie details error:', error);
        showError('Failed to load movie details');
        return null;
    }
}

// Get user's movie interactions from database
async function getUserMovieInteractions(movieId) {
    try {
        const session = await checkSession();
        if (!session) return null;

        const response = await fetch(`/api/movies/${movieId}/interactions`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch movie interactions');

        return await response.json();
    } catch (error) {
        console.error('Get interactions error:', error);
        return null;
    }
}

// Update movie interactions in database
async function updateMovieInteraction(movieId, interactionType, value) {
    try {
        const session = await checkSession();
        if (!session) return false;

        const response = await fetch(`/api/movies/${movieId}/interactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                type: interactionType,
                value: value
            })
        });

        if (!response.ok) throw new Error('Failed to update interaction');

        return true;
    } catch (error) {
        console.error('Update interaction error:', error);
        showError('Failed to update movie interaction');
        return false;
    }
}

// Update UI based on movie interactions
function updateInteractionUI(interactions) {
    // Update watched button
    watchedBtn.classList.toggle('bg-green-600', interactions.watched);
    watchedBtn.classList.toggle('bg-gray-700', !interactions.watched);
    watchedBtn.querySelector('i').classList.toggle('fas', interactions.watched);
    watchedBtn.querySelector('i').classList.toggle('far', !interactions.watched);
    watchedBtn.querySelector('span').textContent = interactions.watched ? 'Watched' : 'Mark as Watched';

    // Update watchlist button
    watchlistBtn.classList.toggle('bg-blue-600', interactions.in_watchlist);
    watchlistBtn.classList.toggle('bg-gray-700', !interactions.in_watchlist);
    watchlistBtn.querySelector('i').classList.toggle('fas', interactions.in_watchlist);
    watchlistBtn.querySelector('i').classList.toggle('far', !interactions.in_watchlist);
    watchlistBtn.querySelector('span').textContent = interactions.in_watchlist ? 'In Watchlist' : 'Add to Watchlist';

    // Update like button
    likeBtn.classList.toggle('bg-red-600', interactions.liked);
    likeBtn.classList.toggle('bg-gray-700', !interactions.liked);
    likeBtn.querySelector('i').classList.toggle('fas', interactions.liked);
    likeBtn.querySelector('i').classList.toggle('far', !interactions.liked);
    likeBtn.querySelector('span').textContent = interactions.liked ? 'Liked' : 'Like';

    // Update star rating
    const stars = starRating.querySelectorAll('i');
    stars.forEach((star, index) => {
        star.classList.toggle('fas', index < interactions.rating);
        star.classList.toggle('far', index >= interactions.rating);
    });
}

// Show movie modal
async function showMovieModal(movieId) {
    const movie = await getMovieDetails(movieId);
    if (!movie) return;

    modalPoster.src = movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : '/images/no-poster.png';
    modalPoster.alt = movie.title;
    modalTitle.textContent = movie.title;
    modalReleaseDate.textContent = formatDate(movie.release_date);
    modalOverview.textContent = movie.overview;
    modalTitle.dataset.movieId = movieId; // Store movieId in modalTitle for interaction updates

    // Get and update interaction states
    const interactions = await getUserMovieInteractions(movieId);
    if (interactions) {
        updateInteractionUI(interactions);
    }

    movieModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
}

// Event Listeners

// Load trending movies on page load
document.addEventListener('DOMContentLoaded', async () => {
    const movies = await fetchTrendingMovies();
    movies.forEach(movie => {
        movieGrid.appendChild(createMovieCard(movie));
    });
});

// Handle search form submission
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchQuery.value.trim();
    if (!query) return;

    const movies = await searchMovies(query);
    movieGrid.innerHTML = '';
    movies.forEach(movie => {
        movieGrid.appendChild(createMovieCard(movie));
    });
});

// Handle movie card clicks
movieGrid.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-movie-id]');
    if (!card) return;

    const movieId = card.dataset.movieId;
    await showMovieModal(movieId);
});

// Close modal
closeModal.addEventListener('click', () => {
    movieModal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scrolling
});

// Close modal when clicking outside
movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) {
        movieModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
});

// Handle watched button click
watchedBtn.addEventListener('click', async () => {
    const movieId = modalTitle.dataset.movieId;
    const currentState = watchedBtn.querySelector('i').classList.contains('fas');
    const success = await updateMovieInteraction(movieId, 'watched', !currentState);
    if (success) {
        const interactions = await getUserMovieInteractions(movieId);
        if (interactions) updateInteractionUI(interactions);
    }
});

// Handle watchlist button click
watchlistBtn.addEventListener('click', async () => {
    const movieId = modalTitle.dataset.movieId;
    const currentState = watchlistBtn.querySelector('i').classList.contains('fas');
    const success = await updateMovieInteraction(movieId, 'watchlist', !currentState);
    if (success) {
        const interactions = await getUserMovieInteractions(movieId);
        if (interactions) updateInteractionUI(interactions);
    }
});

// Handle like button click
likeBtn.addEventListener('click', async () => {
    const movieId = modalTitle.dataset.movieId;
    const currentState = likeBtn.querySelector('i').classList.contains('fas');
    const success = await updateMovieInteraction(movieId, 'liked', !currentState);
    if (success) {
        const interactions = await getUserMovieInteractions(movieId);
        if (interactions) updateInteractionUI(interactions);
    }
});

// Handle star rating clicks
starRating.addEventListener('click', async (e) => {
    const star = e.target.closest('i');
    if (!star) return;

    const stars = Array.from(starRating.querySelectorAll('i'));
    const rating = stars.indexOf(star) + 1;
    const movieId = modalTitle.dataset.movieId;
    
    const success = await updateMovieInteraction(movieId, 'rating', rating);
    if (success) {
        const interactions = await getUserMovieInteractions(movieId);
        if (interactions) updateInteractionUI(interactions);
    }
});

// Handle star rating hover effects
starRating.addEventListener('mouseover', (e) => {
    const star = e.target.closest('i');
    if (!star) return;

    const stars = Array.from(starRating.querySelectorAll('i'));
    const rating = stars.indexOf(star) + 1;
    
    stars.forEach((s, index) => {
        s.classList.toggle('fas', index < rating);
        s.classList.toggle('far', index >= rating);
    });
});

starRating.addEventListener('mouseout', async () => {
    const movieId = modalTitle.dataset.movieId;
    const interactions = await getUserMovieInteractions(movieId);
    if (interactions) updateInteractionUI(interactions);
}); 