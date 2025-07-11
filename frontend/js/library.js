import { checkSession, showError } from './main.js';

// Get DOM elements
const libraryContainer = document.getElementById('library-container');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');

// Show loading state
function showLoading(show = true) {
    loadingState.classList.toggle('hidden', !show);
}

// Create media card element
function createLibraryCard(item) {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg overflow-hidden shadow-lg';
    card.dataset.itemId = item.id;
    
    const posterUrl = item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : '/images/no-poster.png';
    
    card.innerHTML = `
        <img src="${posterUrl}" alt="${item.title}" class="w-full h-64 object-cover">
        <div class="p-4">
            <h3 class="text-lg font-semibold mb-2">${item.title}</h3>
            <p class="text-gray-400 text-sm mb-4">${item.media_type.toUpperCase()}</p>
            
            <div class="space-y-4">
                <!-- Status Dropdown -->
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select class="status-select w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                        ${['Plan to Watch', 'Watching', 'Completed', 'On Hold', 'Dropped']
                            .map(status => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${status}</option>`)
                            .join('')}
                    </select>
                </div>

                <!-- Rating -->
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Rating</label>
                    <select class="rating-select w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                        <option value="">Not Rated</option>
                        ${[1, 2, 3, 4, 5]
                            .map(rating => `<option value="${rating}" ${item.user_rating === rating ? 'selected' : ''}>
                                ${'★'.repeat(rating)}${'☆'.repeat(5-rating)}
                            </option>`)
                            .join('')}
                    </select>
                </div>

                <!-- Delete Button -->
                <button class="delete-button w-full py-2 bg-red-600 hover:bg-red-700 rounded-md font-medium">
                    Remove from Library
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Load library items
async function loadLibrary() {
    try {
        showLoading(true);
        libraryContainer.innerHTML = '';

        const session = await checkSession();
        if (!session) return;

        const response = await fetch('/api/library', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load library');

        const items = await response.json();
        
        if (items.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        items.forEach(item => {
            libraryContainer.appendChild(createLibraryCard(item));
        });

    } catch (error) {
        console.error('Load library error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Update item status or rating
async function updateItem(itemId, updates) {
    try {
        const session = await checkSession();
        if (!session) return;

        const response = await fetch(`/api/library/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error('Failed to update item');

    } catch (error) {
        console.error('Update error:', error);
        showError(error.message);
        throw error; // Re-throw to handle in the calling function
    }
}

// Delete item from library
async function deleteItem(itemId) {
    try {
        const session = await checkSession();
        if (!session) return;

        const response = await fetch(`/api/library/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete item');

    } catch (error) {
        console.error('Delete error:', error);
        showError(error.message);
        throw error;
    }
}

// Event delegation for library container
libraryContainer.addEventListener('change', async (e) => {
    const card = e.target.closest('[data-item-id]');
    if (!card) return;

    const itemId = card.dataset.itemId;
    const updates = {};

    try {
        if (e.target.classList.contains('status-select')) {
            updates.status = e.target.value;
        } else if (e.target.classList.contains('rating-select')) {
            updates.user_rating = e.target.value ? parseInt(e.target.value) : null;
        }

        await updateItem(itemId, updates);
    } catch (error) {
        // Reset the select to its previous value on error
        loadLibrary();
    }
});

libraryContainer.addEventListener('click', async (e) => {
    const deleteButton = e.target.closest('.delete-button');
    if (!deleteButton) return;

    const card = deleteButton.closest('[data-item-id]');
    const itemId = card.dataset.itemId;

    if (confirm('Are you sure you want to remove this item from your library?')) {
        try {
            deleteButton.disabled = true;
            deleteButton.textContent = 'Removing...';
            
            await deleteItem(itemId);
            card.remove();

            // Show empty state if no items left
            if (libraryContainer.children.length === 0) {
                emptyState.classList.remove('hidden');
            }
        } catch (error) {
            deleteButton.disabled = false;
            deleteButton.textContent = 'Remove from Library';
        }
    }
});

// Load library on page load
document.addEventListener('DOMContentLoaded', loadLibrary); 