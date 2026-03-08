
/**
 * Contact Management System - Frontend JavaScript
 * Handles all client-side functionality including CRUD operations,
 * favorites, photo upload, categories, dark mode, sorting, search, pagination, and CSV export.
 * 
 * @author Navioteck
 * @version 3.0
 */

// ======================== CONFIGURATION ========================
const API_URL = '/contacts';

// State management
const state = {
    currentPage: 1,
    currentLimit: 5,
    currentSearch: '',
    sortBy: 'name',
    sortOrder: 'asc',
    isEditing: false,
    deleteModal: null,
    deleteContactId: null,
    showFavorites: false,
    currentCategory: '',
    currentPhoto: null
};

// ======================== INITIALIZATION ========================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modal
    state.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    
    // Initialize dark mode from localStorage or system preference
    initDarkMode();
    
    // Load user info and contacts
    loadUserInfo();
    loadContacts();
    
    // Setup all event listeners
    setupEventListeners();
});

// ======================== USER INFO FUNCTIONS ========================

/**
 * Load authenticated user info from /auth/me
 */
function loadUserInfo() {
    fetch('/auth/me', { credentials: 'include' })
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login';
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (data && data.username) {
                const welcomeElement = document.getElementById('welcomeUser');
                welcomeElement.textContent = `Welcome, ${data.username} 👋`;
                
                const navUserName = document.getElementById('navUserName');
                navUserName.textContent = `Welcome, ${data.username} 👋`;
            }
        })
        .catch(error => {
            console.error('Error loading user info:', error);
        });
}

// ======================== DARK MODE FUNCTIONS ========================

/**
 * Initialize dark mode based on stored preference or system setting
 */
function initDarkMode() {
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (storedTheme) {
        document.documentElement.setAttribute('data-theme', storedTheme);
    } else if (systemPrefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

/**
 * Toggle between light and dark themes
 */
function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// ======================== EVENT LISTENERS ========================

/**
 * Setup all event listeners for the application
 */
function setupEventListeners() {
    // Search with debounce (300ms delay)
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.currentSearch = e.target.value.trim();
            state.currentPage = 1;
            loadContacts();
        }, 300);
    });

    // Category filter change
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        state.currentCategory = e.target.value;
        state.currentPage = 1;
        loadContacts();
    });

    // Favorites filter toggle
    document.getElementById('favoritesFilterBtn').addEventListener('click', () => {
        state.showFavorites = !state.showFavorites;
        const btn = document.getElementById('favoritesFilterBtn');
        
        if (state.showFavorites) {
            btn.classList.remove('btn-outline-warning');
            btn.classList.add('btn-warning');
            btn.innerHTML = '<i class="bi bi-star-fill"></i> Favorites';
        } else {
            btn.classList.remove('btn-warning');
            btn.classList.add('btn-outline-warning');
            btn.innerHTML = '<i class="bi bi-star"></i> Favorites';
        }
        
        state.currentPage = 1;
        loadContacts();
    });

    // Page size limit change
    document.getElementById('limitSelect').addEventListener('change', (e) => {
        state.currentLimit = parseInt(e.target.value);
        state.currentPage = 1;
        loadContacts();
    });

    // Form submission (Add/Edit contact)
    document.getElementById('contactForm').addEventListener('submit', handleFormSubmit);

    // Cancel button (when editing)
    document.getElementById('cancelBtn').addEventListener('click', resetForm);

    // Delete confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Logout button handler
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Remove photo button
    document.getElementById('removePhotoBtn').addEventListener('click', () => {
        state.currentPhoto = null;
        document.getElementById('currentPhotoContainer').style.display = 'none';
    });

    // Close delete modal on backdrop click
    document.getElementById('deleteModal').addEventListener('hidden.bs.modal', () => {
        state.deleteContactId = null;
    });
}

// ======================== API FUNCTIONS ========================

/**
 * Load contacts from the server with pagination, search, sorting, and filters
 */
function loadContacts() {
    showLoading(true);
    
    // Build query parameters
    const params = new URLSearchParams({
        page: state.currentPage,
        limit: state.currentLimit,
        search: state.currentSearch,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        favorites: state.showFavorites ? 'true' : '',
        category: state.currentCategory
    });

    fetch(`${API_URL}?${params}`)
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            
            if (data.error) {
                showToast(data.error, 'error');
                return;
            }
            
            // Render contacts and pagination
            renderContacts(data.contacts);
            renderPagination(data.pagination);
            updateTotalContacts(data.pagination.totalContacts);
            updateSortIndicators();
        })
        .catch(error => {
            showLoading(false);
            console.error('Error loading contacts:', error);
            showToast('Failed to load contacts. Please try again.', 'error');
        });
}

/**
 * Handle form submission for adding or editing contacts
 * @param {Event} e - Form submission event
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const id = document.getElementById('contactId').value;
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const category = document.getElementById('category').value;

    // Clear previous validation errors
    clearValidationErrors();
    
    // Client-side validation
    const validationErrors = validateInput(name, email, phone);
    if (validationErrors.length > 0) {
        displayValidationErrors(validationErrors);
        return;
    }

    // Determine HTTP method and URL
    const method = state.isEditing ? 'PUT' : 'POST';
    const url = state.isEditing ? `${API_URL}/${id}` : API_URL;

    // Prepare contact data
    const contactData = { name, email, phone };
    if (category) {
        contactData.category = category;
    }

    // Send request to server
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            if (data.field) {
                showFieldError(data.field, data.message || data.error);
            } else if (data.validationErrors) {
                displayValidationErrors(data.validationErrors);
            } else {
                showToast(data.error, 'error');
            }
            return;
        }
        
        // If editing and there's a photo to upload
        if (state.isEditing && id) {
            const photoInput = document.getElementById('photo');
            if (photoInput && photoInput.files.length > 0) {
                uploadPhoto(id, photoInput.files[0])
                    .then(() => {
                        showToast('Contact updated with photo successfully!', 'success');
                        resetForm();
                        loadContacts();
                    })
                    .catch(err => {
                        showToast('Contact updated but photo upload failed', 'error');
                        resetForm();
                        loadContacts();
                    });
                return;
            }
            
            // If removing photo
            if (state.currentPhoto === null && data.contact && data.contact.photo) {
                // Photo was removed
            }
        }
        
        // Show success message and reload contacts
        showToast(
            state.isEditing ? 'Contact updated successfully!' : 'Contact added successfully!',
            'success'
        );
        resetForm();
        loadContacts();
    })
    .catch(error => {
        console.error('Error saving contact:', error);
        showToast('Failed to save contact. Please try again.', 'error');
    });
}

/**
 * Upload photo for a contact
 * @param {number} contactId - Contact ID
 * @param {File} file - Photo file
 */
function uploadPhoto(contactId, file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('photo', file);

        fetch(`${API_URL}/${contactId}/photo`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                reject(data.error);
            } else {
                resolve(data);
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}

/**
 * Toggle favorite status for a contact
 * @param {number} id - Contact ID
 */
function toggleFavorite(id) {
    fetch(`${API_URL}/${id}/favorite`, {
        method: 'PUT',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 'error');
            return;
        }
        
        showToast(data.message, 'success');
        loadContacts();
    })
    .catch(error => {
        console.error('Error toggling favorite:', error);
        showToast('Failed to update favorite status', 'error');
    });
}

/**
 * Delete a contact after confirmation
 */
function confirmDelete() {
    const id = state.deleteContactId;
    if (!id) return;
    
    fetch(`${API_URL}/${id}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            state.deleteModal.hide();
            
            if (data.error) {
                showToast(data.error, 'error');
                return;
            }
            
            showToast('Contact deleted successfully!', 'success');
            
            // Reload contacts - handle case when current page becomes empty
            const currentPageEl = document.getElementById('paginationControls');
            const totalPages = currentPageEl?.children?.length || 1;
            
            if (totalPages === 0 || state.currentPage > totalPages) {
                state.currentPage = Math.max(1, state.currentPage - 1);
            }
            
            loadContacts();
        })
        .catch(error => {
            state.deleteModal.hide();
            console.error('Error deleting contact:', error);
            showToast('Failed to delete contact. Please try again.', 'error');
        });
}

/**
 * Handle user logout
 */
function handleLogout() {
    fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/login';
        } else {
            showToast(data.message || 'Logout failed', 'error');
        }
    })
    .catch(error => {
        console.error('Error logging out:', error);
        showToast('Failed to logout. Please try again.', 'error');
    });
}

/**
 * Export contacts to CSV file
 */
function exportToCSV() {
    showLoading(true);
    
    // Fetch all contacts (without pagination limits)
    const params = new URLSearchParams({
        export: 'csv',
        search: state.currentSearch
    });

    fetch(`${API_URL}?${params}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Export failed');
            }
            return response.text();
        })
        .then(csvData => {
            showLoading(false);
            
            // Create and trigger download
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            
            link.href = URL.createObjectURL(blob);
            link.download = `contacts_export_${timestamp}.csv`;
            link.click();
            
            URL.revokeObjectURL(link.href);
            showToast('Contacts exported to CSV successfully!', 'success');
        })
        .catch(error => {
            showLoading(false);
            console.error('Error exporting contacts:', error);
            showToast('Failed to export contacts. Please try again.', 'error');
        });
}

// ======================== SORTING FUNCTIONS ========================

/**
 * Handle column header click for sorting
 * @param {string} column - Column name to sort by
 */
function handleSort(column) {
    if (state.sortBy === column) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortBy = column;
        state.sortOrder = 'asc';
    }
    
    loadContacts();
}

/**
 * Update visual sort indicators in table headers
 */
function updateSortIndicators() {
    const headers = document.querySelectorAll('.table thead th[data-sort]');
    
    headers.forEach(header => {
        const column = header.getAttribute('data-sort');
        header.classList.remove('sort-asc', 'sort-desc');
        
        if (column === state.sortBy) {
            header.classList.add(state.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

// ======================== VALIDATION FUNCTIONS ========================

/**
 * Validate contact input on client side
 * @param {string} name - Contact name
 * @param {string} email - Contact email
 * @param {string} phone - Contact phone
 * @returns {Array} Array of validation error objects
 */
function validateInput(name, email, phone) {
    const errors = [];
    
    if (!name || name.length < 2) {
        errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
    }
    if (!email || !isValidEmail(email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }
    if (!phone || !isValidPhone(phone)) {
        errors.push({ field: 'phone', message: 'Please enter a valid phone number (7-20 characters)' });
    }
    
    return errors;
}

/**
 * Validate email format using regex
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format using regex
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-+()]{7,20}$/;
    return phoneRegex.test(phone);
}

/**
 * Display validation errors on form fields
 * @param {Array} errors - Array of error objects
 */
function displayValidationErrors(errors) {
    errors.forEach(error => {
        showFieldError(error.field, error.message);
    });
}

/**
 * Show error message for a specific form field
 * @param {string} field - Field name
 * @param {string} message - Error message
 */
function showFieldError(field, message) {
    const input = document.getElementById(field);
    const errorDiv = document.getElementById(`${field}Error`);
    
    if (input && errorDiv) {
        input.classList.add('is-invalid');
        errorDiv.textContent = message;
    }
}

/**
 * Clear all validation error messages
 */
function clearValidationErrors() {
    ['name', 'email', 'phone'].forEach(field => {
        const input = document.getElementById(field);
        const errorDiv = document.getElementById(`${field}Error`);
        
        if (input) input.classList.remove('is-invalid');
        if (errorDiv) errorDiv.textContent = '';
    });
}

// ======================== UI RENDERING FUNCTIONS ========================

/**
 * Get avatar HTML for contact
 * @param {Object} contact - Contact object
 * @returns {string} HTML for avatar
 */
function getContactAvatar(contact) {
    if (contact.photo) {
        return `<img src="${escapeHtml(contact.photo)}" alt="${escapeHtml(contact.name)}" class="contact-img-photo">`;
    }
    return `<div class="contact-img">${contact.name.charAt(0).toUpperCase()}</div>`;
}

/**
 * Get category badge HTML
 * @param {string} category - Category name
 * @returns {string} HTML for category badge
 */
function getCategoryBadge(category) {
    if (!category) return '<span class="badge bg-secondary">-</span>';
    
    const categoryClasses = {
        'Family': 'bg-primary',
        'Friends': 'bg-info',
        'Work': 'bg-warning text-dark',
        'Clients': 'bg-success'
    };
    
    const badgeClass = categoryClasses[category] || 'bg-secondary';
    return `<span class="badge ${badgeClass}">${escapeHtml(category)}</span>`;
}

/**
 * Get favorite star HTML
 * @param {boolean} isFavorite - Whether contact is favorite
 * @param {number} id - Contact ID
 * @returns {string} HTML for favorite star
 */
function getFavoriteStar(isFavorite, id) {
    if (isFavorite) {
        return `<i class="bi bi-star-fill text-warning favorite-star" onclick="toggleFavorite(${id})" title="Remove from favorites"></i>`;
    }
    return `<i class="bi bi-star text-muted favorite-star" onclick="toggleFavorite(${id})" title="Add to favorites"></i>`;
}

/**
 * Render contacts in the table
 * @param {Array} contacts - Array of contact objects
 */
function renderContacts(contacts) {
    const tbody = document.getElementById('contactTableBody');
    const tableContainer = document.getElementById('tableContainer');
    const noContacts = document.getElementById('noContacts');
    const paginationContainer = document.getElementById('paginationContainer');
    
    // Handle empty state
    if (!contacts || contacts.length === 0) {
        tableContainer.style.display = 'none';
        paginationContainer.style.display = 'none';
        noContacts.style.display = 'block';
        return;
    }
    
    // Show table and pagination
    tableContainer.style.display = 'block';
    paginationContainer.style.display = 'flex';
    noContacts.style.display = 'none';
    
    // Generate table rows
    tbody.innerHTML = contacts.map(contact => `
        <tr class="fade-in">
            <td>
                <div class="d-flex align-items-center">
                    ${getContactAvatar(contact)}
                    <div>
                        <strong>${escapeHtml(contact.name)}</strong>
                        <div>${getFavoriteStar(contact.is_favorite, contact.id)}</div>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(contact.email)}</td>
            <td>${escapeHtml(contact.phone)}</td>
            <td>${getCategoryBadge(contact.category)}</td>
            <td>
                <button class="btn btn-warning btn-icon me-1" 
                        onclick="editContact(${contact.id}, '${escapeHtml(contact.name)}', '${escapeHtml(contact.email)}', '${escapeHtml(contact.phone)}', '${escapeHtml(contact.category || '')}', '${escapeHtml(contact.photo || '')}')" 
                        title="Edit Contact">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-danger btn-icon" 
                        onclick="deleteContact(${contact.id})" 
                        title="Delete Contact">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Render pagination controls
 * @param {Object} pagination - Pagination data object
 */
function renderPagination(pagination) {
    const paginationControls = document.getElementById('paginationControls');
    const paginationInfo = document.getElementById('paginationInfo');
    
    // Handle single page or no data
    if (!pagination || pagination.totalPages <= 1) {
        paginationControls.innerHTML = '';
        if (pagination && pagination.totalContacts > 0) {
            paginationInfo.textContent = `Showing all ${pagination.totalContacts} contact${pagination.totalContacts !== 1 ? 's' : ''}`;
        } else {
            paginationInfo.textContent = 'No contacts';
        }
        return;
    }
    
    const { currentPage, totalPages, totalContacts, contactsPerPage } = pagination;
    const start = (currentPage - 1) * contactsPerPage + 1;
    const end = Math.min(currentPage * contactsPerPage, totalContacts);
    
    paginationInfo.textContent = `Showing ${start}-${end} of ${totalContacts} contacts`;
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;" aria-label="Previous">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers with smart truncation
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start if end is at limit
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(1); return false;">1</a>
            </li>
        `;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Visible page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${totalPages}); return false;">${totalPages}</a>
            </li>
        `;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;" aria-label="Next">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    paginationControls.innerHTML = paginationHTML;
}

/**
 * Change the current page and reload contacts
 * @param {number} page - Page number to navigate to
 */
function changePage(page) {
    state.currentPage = page;
    loadContacts();
    
    // Smooth scroll to table
    document.getElementById('tableContainer').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

/**
 * Update the total contacts counter
 * @param {number} total - Total number of contacts
 */
function updateTotalContacts(total) {
    document.getElementById('totalContacts').textContent = total;
}

/**
 * Show or hide the loading spinner
 * @param {boolean} show - Whether to show the spinner
 */
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const tableContainer = document.getElementById('tableContainer');
    const noContacts = document.getElementById('noContacts');
    
    if (show) {
        spinner.style.display = 'flex';
        tableContainer.style.display = 'none';
        noContacts.style.display = 'none';
    } else {
        spinner.style.display = 'none';
    }
}

// ======================== TOAST NOTIFICATIONS ========================

/**
 * Display a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('success' or 'error')
 */
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} show`;
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill'} me-2"></i>
            <span class="me-auto">${escapeHtml(message)}</span>
            <button type="button" class="btn-close btn-close-white ms-3" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 4 seconds with fade out
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ======================== FORM FUNCTIONS ========================

/**
 * Populate form for editing an existing contact
 * @param {number} id - Contact ID
 * @param {string} name - Contact name
 * @param {string} email - Contact email
 * @param {string} phone - Contact phone
 * @param {string} category - Contact category
 * @param {string} photo - Contact photo path
 */
function editContact(id, name, email, phone, category, photo) {
    state.isEditing = true;
    state.currentPhoto = photo || null;
    
    // Populate form fields
    document.getElementById('contactId').value = id;
    document.getElementById('name').value = name;
    document.getElementById('email').value = email;
    document.getElementById('phone').value = phone;
    document.getElementById('category').value = category || '';
    
    // Show current photo if exists
    const photoContainer = document.getElementById('currentPhotoContainer');
    const currentPhoto = document.getElementById('currentPhoto');
    
    if (photo) {
        currentPhoto.src = photo;
        photoContainer.style.display = 'block';
    } else {
        photoContainer.style.display = 'none';
    }
    
    // Update UI to show edit mode
    document.getElementById('formTitle').textContent = 'Edit Contact';
    document.getElementById('submitBtn').innerHTML = '<i class="bi bi-check-circle me-1"></i>Update Contact';
    document.getElementById('cancelBtn').style.display = 'block';
    
    // Clear validation errors
    clearValidationErrors();
    
    // Scroll to form with smooth animation
    document.getElementById('contactForm').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('name').focus();
    }, 500);
}

/**
 * Reset the form to add mode
 */
function resetForm() {
    state.isEditing = false;
    state.currentPhoto = null;
    
    // Clear form
    document.getElementById('contactForm').reset();
    document.getElementById('contactId').value = '';
    
    // Hide photo container
    document.getElementById('currentPhotoContainer').style.display = 'none';
    
    // Reset UI to add mode
    document.getElementById('formTitle').textContent = 'Add Contact';
    document.getElementById('submitBtn').innerHTML = '<i class="bi bi-check-circle me-1"></i>Save Contact';
    document.getElementById('cancelBtn').style.display = 'none';
    
    // Clear validation errors
    clearValidationErrors();
}

/**
 * Show delete confirmation modal
 * @param {number} id - Contact ID to delete
 */
function deleteContact(id) {
    state.deleteContactId = id;
    state.deleteModal.show();
}

// ======================== UTILITY FUNCTIONS ========================

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible for inline event handlers
window.editContact = editContact;
window.deleteContact = deleteContact;
window.changePage = changePage;
window.handleSort = handleSort;
window.exportToCSV = exportToCSV;
window.toggleDarkMode = toggleDarkMode;
window.toggleFavorite = toggleFavorite;

