// My Memoir App - JavaScript

// Data Structure
let memoirData = {
    chapters: [],
    settings: {
        authorName: '',
        createdDate: new Date().toISOString()
    }
};

let currentChapterId = null;
let currentPhotos = [];

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updateStats();
    renderChapters();
    showView('dashboard');
    
    // Set default date to today
    document.getElementById('entryDate').valueAsDate = new Date();
});

// Data Management
function loadData() {
    const saved = localStorage.getItem('memoirData');
    if (saved) {
        memoirData = JSON.parse(saved);
    }
}

function saveData() {
    localStorage.setItem('memoirData', JSON.stringify(memoirData));
    updateStats();
}

function exportData() {
    const dataStr = JSON.stringify(memoirData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memoir-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Backup downloaded successfully!');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const imported = JSON.parse(event.target.result);
                if (confirm('This will replace your current data. Continue?')) {
                    memoirData = imported;
                    saveData();
                    renderChapters();
                    showSuccess('Data imported successfully!');
                    showView('dashboard');
                }
            } catch (error) {
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// View Management
function showView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const viewElement = document.getElementById(viewName + 'View');
    if (viewElement) {
        viewElement.classList.add('active');
    }
    
    if (viewName === 'dashboard') {
        updateStats();
    } else if (viewName === 'chapters') {
        renderChapters();
    }
}

// Statistics
function updateStats() {
    const totalChapters = memoirData.chapters.length;
    const totalEntries = memoirData.chapters.reduce((sum, ch) => sum + (ch.entries?.length || 0), 0);
    const totalPhotos = memoirData.chapters.reduce((sum, ch) => {
        return sum + (ch.entries?.reduce((s, e) => s + (e.photos?.length || 0), 0) || 0);
    }, 0);
    const totalWords = memoirData.chapters.reduce((sum, ch) => {
        return sum + (ch.entries?.reduce((s, e) => {
            return s + (e.content?.split(/\s+/).filter(w => w.length > 0).length || 0);
        }, 0) || 0);
    }, 0);
    
    document.getElementById('totalChapters').textContent = totalChapters;
    document.getElementById('totalEntries').textContent = totalEntries;
    document.getElementById('totalPhotos').textContent = totalPhotos;
    document.getElementById('totalWords').textContent = totalWords.toLocaleString();
}

// Chapter Management
function openNewChapterModal() {
    document.getElementById('chapterModalTitle').textContent = 'Create New Chapter';
    document.getElementById('chapterForm').reset();
    document.getElementById('chapterId').value = '';
    openModal('newChapterModal');
}

function editCurrentChapter() {
    const chapter = memoirData.chapters.find(ch => ch.id === currentChapterId);
    if (chapter) {
        document.getElementById('chapterModalTitle').textContent = 'Edit Chapter';
        document.getElementById('chapterId').value = chapter.id;
        document.getElementById('chapterName').value = chapter.name;
        document.getElementById('chapterDesc').value = chapter.description || '';
        openModal('newChapterModal');
    }
}

function saveChapter(event) {
    event.preventDefault();
    
    const id = document.getElementById('chapterId').value;
    const name = document.getElementById('chapterName').value;
    const description = document.getElementById('chapterDesc').value;
    
    if (id) {
        // Edit existing chapter
        const chapter = memoirData.chapters.find(ch => ch.id === id);
        if (chapter) {
            chapter.name = name;
            chapter.description = description;
            chapter.updatedDate = new Date().toISOString();
        }
    } else {
        // Create new chapter
        const newChapter = {
            id: generateId(),
            name: name,
            description: description,
            entries: [],
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString()
        };
        memoirData.chapters.push(newChapter);
    }
    
    saveData();
    closeModal('newChapterModal');
    renderChapters();
    showSuccess(id ? 'Chapter updated!' : 'Chapter created!');
    
    if (id === currentChapterId) {
        showChapterDetail(currentChapterId);
    }
}

function deleteCurrentChapter() {
    if (confirm('Are you sure you want to delete this chapter and all its entries? This cannot be undone.')) {
        memoirData.chapters = memoirData.chapters.filter(ch => ch.id !== currentChapterId);
        saveData();
        showView('chapters');
        showSuccess('Chapter deleted!');
    }
}

function renderChapters() {
    const container = document.getElementById('chaptersList');
    
    if (memoirData.chapters.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <h3>No Chapters Yet</h3>
                <p>Start your memoir by creating your first chapter!</p>
                <button class="btn-primary" onclick="openNewChapterModal()" style="margin-top: 20px;">
                    ➕ Create First Chapter
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = memoirData.chapters.map(chapter => {
        const entryCount = chapter.entries?.length || 0;
        const lastUpdated = new Date(chapter.updatedDate).toLocaleDateString();
        
        return `
            <div class="chapter-card" onclick="showChapterDetail('${chapter.id}')">
                <h3>${escapeHtml(chapter.name)}</h3>
                <p style="color: var(--text-secondary); margin-top: 10px;">
                    ${escapeHtml(chapter.description || 'No description')}
                </p>
                <div class="chapter-meta">
                    <span>📝 ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}</span>
                    <span>📅 ${lastUpdated}</span>
                </div>
            </div>
        `;
    }).join('');
}

function showChapterDetail(chapterId) {
    currentChapterId = chapterId;
    const chapter = memoirData.chapters.find(ch => ch.id === chapterId);
    
    if (!chapter) return;
    
    document.getElementById('chapterTitle').textContent = chapter.name;
    document.getElementById('chapterDescription').textContent = chapter.description || '';
    
    renderEntries(chapter);
    showView('chapterDetail');
}

// Entry Management
function openNewEntryModal() {
    document.getElementById('entryModalTitle').textContent = 'Create New Entry';
    document.getElementById('entryForm').reset();
    document.getElementById('entryId').value = '';
    document.getElementById('entryDate').valueAsDate = new Date();
    document.getElementById('photoPreview').innerHTML = '';
    currentPhotos = [];
    openModal('newEntryModal');
}

function editEntry(entryId) {
    const chapter = memoirData.chapters.find(ch => ch.id === currentChapterId);
    const entry = chapter.entries.find(e => e.id === entryId);
    
    if (entry) {
        document.getElementById('entryModalTitle').textContent = 'Edit Entry';
        document.getElementById('entryId').value = entry.id;
        document.getElementById('entryDate').value = entry.date;
        document.getElementById('entryTitle').value = entry.title || '';
        document.getElementById('entryContent').value = entry.content;
        
        // Show existing photos
        currentPhotos = entry.photos || [];
        displayPhotoPreview();
        
        openModal('newEntryModal');
    }
}

function saveEntry(event) {
    event.preventDefault();
    
    const chapter = memoirData.chapters.find(ch => ch.id === currentChapterId);
    if (!chapter) return;
    
    const id = document.getElementById('entryId').value;
    const date = document.getElementById('entryDate').value;
    const title = document.getElementById('entryTitle').value;
    const content = document.getElementById('entryContent').value;
    
    if (id) {
        // Edit existing entry
        const entry = chapter.entries.find(e => e.id === id);
        if (entry) {
            entry.date = date;
            entry.title = title;
            entry.content = content;
            entry.photos = currentPhotos;
            entry.updatedDate = new Date().toISOString();
        }
    } else {
        // Create new entry
        const newEntry = {
            id: generateId(),
            date: date,
            title: title,
            content: content,
            photos: currentPhotos,
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString()
        };
        chapter.entries.push(newEntry);
    }
    
    // Sort entries by date (newest first)
    chapter.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    chapter.updatedDate = new Date().toISOString();
    
    saveData();
    closeModal('newEntryModal');
    renderEntries(chapter);
    showSuccess(id ? 'Entry updated!' : 'Entry created!');
    currentPhotos = [];
}

function deleteEntry(entryId) {
    if (confirm('Are you sure you want to delete this entry?')) {
        const chapter = memoirData.chapters.find(ch => ch.id === currentChapterId);
        if (chapter) {
            chapter.entries = chapter.entries.filter(e => e.id !== entryId);
            chapter.updatedDate = new Date().toISOString();
            saveData();
            renderEntries(chapter);
            showSuccess('Entry deleted!');
        }
    }
}

function renderEntries(chapter) {
    const container = document.getElementById('entriesList');
    
    if (!chapter.entries || chapter.entries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>No Entries Yet</h3>
                <p>Start writing your memories for this chapter!</p>
                <button class="btn-primary" onclick="openNewEntryModal()" style="margin-top: 20px;">
                    ➕ Create First Entry
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = chapter.entries.map(entry => {
        const entryDate = new Date(entry.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const photosHtml = entry.photos && entry.photos.length > 0 ? `
            <div class="entry-photos">
                ${entry.photos.map(photo => `
                    <img src="${photo}" alt="Memory photo" class="entry-photo" onclick="showImagePreview('${photo}')">
                `).join('')}
            </div>
        ` : '';
        
        const titleHtml = entry.title ? `<h3 style="margin-bottom: 10px;">${escapeHtml(entry.title)}</h3>` : '';
        
        return `
            <div class="entry-card">
                <div class="entry-header">
                    <div>
                        ${titleHtml}
                        <div class="entry-date">📅 ${entryDate}</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-secondary btn-small" onclick="editEntry('${entry.id}')">✏️ Edit</button>
                        <button class="btn-danger btn-small" onclick="deleteEntry('${entry.id}')">🗑️ Delete</button>
                    </div>
                </div>
                <div class="entry-content">${escapeHtml(entry.content)}</div>
                ${photosHtml}
            </div>
        `;
    }).join('');
}

// Photo Management
function previewPhotos(event) {
    const files = event.target.files;
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentPhotos.push(e.target.result);
            displayPhotoPreview();
        };
        reader.readAsDataURL(file);
    });
}

function displayPhotoPreview() {
    const container = document.getElementById('photoPreview');
    container.innerHTML = currentPhotos.map((photo, index) => `
        <div class="photo-preview-item">
            <img src="${photo}" alt="Preview">
            <button type="button" class="remove-photo" onclick="removePhoto(${index})">×</button>
        </div>
    `).join('');
}

function removePhoto(index) {
    currentPhotos.splice(index, 1);
    displayPhotoPreview();
}

function showImagePreview(src) {
    document.getElementById('previewImage').src = src;
    openModal('imagePreviewModal');
}

// Modal Management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// PDF Export
async function exportToPDF() {
    if (memoirData.chapters.length === 0) {
        alert('You need to create some chapters and entries before exporting!');
        return;
    }
    
    showSuccess('Preparing your memoir for export...');
    
    // Create a printable HTML version
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>My Memoir</title>
            <style>
                body {
                    font-family: Georgia, serif;
                    line-height: 1.8;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px;
                    color: #333;
                }
                h1 {
                    text-align: center;
                    font-size: 2.5em;
                    margin-bottom: 10px;
                    color: #6366f1;
                }
                .subtitle {
                    text-align: center;
                    color: #666;
                    margin-bottom: 60px;
                }
                .chapter {
                    page-break-before: always;
                    margin-top: 60px;
                }
                .chapter:first-child {
                    page-break-before: auto;
                }
                .chapter-title {
                    font-size: 2em;
                    color: #6366f1;
                    border-bottom: 3px solid #6366f1;
                    padding-bottom: 10px;
                    margin-bottom: 30px;
                }
                .chapter-description {
                    font-style: italic;
                    color: #666;
                    margin-bottom: 40px;
                }
                .entry {
                    margin-bottom: 50px;
                    page-break-inside: avoid;
                }
                .entry-title {
                    font-size: 1.5em;
                    color: #333;
                    margin-bottom: 10px;
                }
                .entry-date {
                    color: #666;
                    font-size: 0.9em;
                    margin-bottom: 20px;
                }
                .entry-content {
                    text-align: justify;
                    white-space: pre-wrap;
                }
                .entry-photos {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-top: 20px;
                }
                .entry-photo {
                    width: 100%;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                @media print {
                    body { padding: 20px; }
                    .chapter { page-break-before: always; }
                }
            </style>
        </head>
        <body>
            <h1>My Memoir</h1>
            <div class="subtitle">A Personal Life Story</div>
    `;
    
    // Add all chapters and entries
    memoirData.chapters.forEach(chapter => {
        html += `
            <div class="chapter">
                <h2 class="chapter-title">${escapeHtml(chapter.name)}</h2>
                ${chapter.description ? `<p class="chapter-description">${escapeHtml(chapter.description)}</p>` : ''}
        `;
        
        if (chapter.entries && chapter.entries.length > 0) {
            chapter.entries.forEach(entry => {
                const entryDate = new Date(entry.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                html += `
                    <div class="entry">
                        ${entry.title ? `<h3 class="entry-title">${escapeHtml(entry.title)}</h3>` : ''}
                        <div class="entry-date">${entryDate}</div>
                        <div class="entry-content">${escapeHtml(entry.content)}</div>
                `;
                
                if (entry.photos && entry.photos.length > 0) {
                    html += '<div class="entry-photos">';
                    entry.photos.forEach(photo => {
                        html += `<img src="${photo}" alt="Memory photo" class="entry-photo">`;
                    });
                    html += '</div>';
                }
                
                html += '</div>';
            });
        }
        
        html += '</div>';
    });
    
    html += `
        </body>
        </html>
    `;
    
    // Create a blob and download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-memoir-${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
    
    showSuccess('Memoir exported! Open the HTML file in your browser and use Print to PDF to create a PDF version.');
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    const element = document.getElementById('successMessage');
    element.textContent = message;
    element.classList.add('active');
    setTimeout(() => {
        element.classList.remove('active');
    }, 3000);
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};