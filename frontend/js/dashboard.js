import { checkSession, showError } from './main.js';

// Get DOM elements
const searchForm = document.getElementById('searchForm');
const searchQuery = document.getElementById('searchQuery');
const resultsContainer = document.getElementById('search-results-container');
const loadingState = document.getElementById('loadingState');

// Show loading state
function showLoading(show = true) {
    loadingState.classList.toggle('hidden', !show);
}

// Create media card element
function createMediaCard(item) {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg overflow-hidden shadow-lg';
    
    const posterUrl = item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : '/images/no-poster.png';
    
    card.innerHTML = `
        <img src="${posterUrl}" alt="${item.title}" class="w-full h-64 object-cover">
        <div class="p-4">
            <h3 class="text-lg font-semibold mb-2">${item.title}</h3>
            <p class="text-gray-400 text-sm mb-4">${item.media_type.toUpperCase()}</p>
            <button class="add-to-library w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium"
                    data-id="${item.id}"
                    data-media-type="${item.media_type}"
                    data-title="${item.title}"
                    data-poster="${item.poster_path}">
                Add to Library
            </button>
        </div>
    `;
    
    return card;
}

// Handle search submission
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchQuery.value.trim();
    if (!query) return;

    try {
        showLoading(true);
        resultsContainer.innerHTML = '';

        const session = await checkSession();
        if (!session) return;

        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) throw new Error('Search failed');

        const results = await response.json();
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="col-span-full text-center text-gray-400 py-8">
                    No results found for "${query}"
                </div>
            `;
            return;
        }

        results.forEach(item => {
            resultsContainer.appendChild(createMediaCard(item));
        });

    } catch (error) {
        console.error('Search error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
});

// Handle adding items to library
resultsContainer.addEventListener('click', async (e) => {
    const addButton = e.target.closest('.add-to-library');
    if (!addButton) return;

    try {
        const session = await checkSession();
        if (!session) return;

        const { id, mediaType, title, poster } = addButton.dataset;
        
        addButton.disabled = true;
        addButton.textContent = 'Adding...';

        const response = await fetch('/api/library', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                api_id: id,
                media_type: mediaType,
                title: title,
                poster_path: poster
            })
        });

        if (!response.ok) throw new Error('Failed to add to library');

        addButton.textContent = 'Added!';
        addButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        addButton.classList.add('bg-green-600', 'cursor-not-allowed');

    } catch (error) {
        console.error('Add to library error:', error);
        showError(error.message);
        addButton.disabled = false;
        addButton.textContent = 'Add to Library';
    }
}); 