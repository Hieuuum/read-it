import { checkSession, showError } from './main.js';

// TMDB API configuration
const TMDB_API_KEY = window._env_?.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

if (!TMDB_API_KEY) {
    console.error('Missing TMDB API key');
    throw new Error('Missing TMDB API key');
}

// Get DOM elements
const searchForm = document.getElementById('searchForm');
const searchQuery = document.getElementById('searchQuery');
const movieGrid = document.getElementById('movie-grid');
const loadingState = document.getElementById('loadingState');

// Show loading state
function showLoading(show = true) {
    if (loadingState) {
        loadingState.classList.toggle('hidden', !show);
    }
}

// Create a movie card element
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-transform duration-200 hover:scale-105';
    
    const posterUrl = movie.poster_path 
        ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
        : '/images/no-poster.jpg';
    
    card.innerHTML = `
        <img src="${posterUrl}" alt="${movie.title}" class="w-full h-96 object-cover">
        <div class="p-4">
            <h3 class="text-lg font-semibold mb-2">${movie.title}</h3>
            <div class="flex justify-between items-center">
                <button class="watchlist-btn px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md">
                    <i class="far fa-bookmark"></i> Watchlist
                </button>
                <button class="like-btn px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md">
                    <i class="far fa-heart"></i> Like
                </button>
            </div>
        </div>
    `;

    // Add event listeners for watchlist and like buttons
    const watchlistBtn = card.querySelector('.watchlist-btn');
    const likeBtn = card.querySelector('.like-btn');

    watchlistBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/movies/${movie.id}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await checkSession()).access_token}`
                },
                body: JSON.stringify({
                    type: 'watchlist',
                    value: true
                })
            });

            if (!response.ok) throw new Error('Failed to update watchlist');
            
            watchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i> Added';
            watchlistBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        } catch (error) {
            console.error('Watchlist error:', error);
            showError('Failed to update watchlist');
        }
    });

    likeBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/movies/${movie.id}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await checkSession()).access_token}`
                },
                body: JSON.stringify({
                    type: 'liked',
                    value: true
                })
            });

            if (!response.ok) throw new Error('Failed to update like status');
            
            likeBtn.innerHTML = '<i class="fas fa-heart"></i> Liked';
            likeBtn.classList.add('bg-pink-600', 'hover:bg-pink-700');
        } catch (error) {
            console.error('Like error:', error);
            showError('Failed to update like status');
        }
    });

    return card;
}

// Fetch popular movies from TMDB
async function fetchPopularMovies() {
    try {
        showLoading(true);
        movieGrid.innerHTML = '';

        const response = await fetch(
            `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );

        if (!response.ok) throw new Error('Failed to fetch popular movies');

        const data = await response.json();
        return data.results.slice(0, 20); // Get first 20 results
    } catch (error) {
        console.error('Popular movies error:', error);
        showError('Failed to load popular movies');
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

// Display movies in the grid
function displayMovies(movies) {
    movieGrid.innerHTML = '';
    movies.forEach(movie => {
        movieGrid.appendChild(createMovieCard(movie));
    });
}

// Initialize dashboard
async function initDashboard() {
    try {
        // Check authentication
        const session = await checkSession();
        if (!session) return;

        // Load popular movies
        const popularMovies = await fetchPopularMovies();
        displayMovies(popularMovies);
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('Failed to initialize dashboard');
    }
}

// Handle search form submission
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchQuery.value.trim();
    if (!query) return;

    const movies = await searchMovies(query);
    displayMovies(movies);
});

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard); 