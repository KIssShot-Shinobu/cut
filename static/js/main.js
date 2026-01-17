// Global variables
let selectedFile = null;
let outputDir = null;
let selectedDuration = 300; // Default 5 minutes in seconds

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileSelected = document.getElementById('fileSelected');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeBtn = document.getElementById('removeBtn');
const uploadSection = document.getElementById('uploadSection');
const processingSection = document.getElementById('processingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const newVideoBtn = document.getElementById('newVideoBtn');
const segmentsContainer = document.getElementById('segmentsContainer');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const durationConfig = document.getElementById('durationConfig');
const durationSelect = document.getElementById('durationSelect');
const customDurationInput = document.getElementById('customDurationInput');
const customDuration = document.getElementById('customDuration');
const processBtn = document.getElementById('processBtn');

// Hamburger menu and sidebar elements
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');
const themeOptions = document.querySelectorAll('.theme-option');

// Desktop theme toggle elements
const desktopThemeToggle = document.getElementById('desktopThemeToggle');
const desktopThemeButtons = desktopThemeToggle.querySelectorAll('.theme-toggle-btn');

// Hamburger menu toggle
function toggleSidebar() {
    hamburgerBtn.classList.toggle('active');
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
}

function closeSidebar() {
    hamburgerBtn.classList.remove('active');
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

hamburgerBtn.addEventListener('click', toggleSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Update sidebar theme options
    themeOptions.forEach(btn => {
        if (btn.dataset.theme === savedTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update desktop theme toggle buttons
    desktopThemeButtons.forEach(btn => {
        if (btn.dataset.theme === savedTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Theme change function
function changeTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update all theme buttons
    themeOptions.forEach(b => {
        if (b.dataset.theme === theme) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    desktopThemeButtons.forEach(b => {
        if (b.dataset.theme === theme) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
}

// Sidebar theme toggle handler
themeOptions.forEach(btn => {
    btn.addEventListener('click', () => {
        changeTheme(btn.dataset.theme);
        // Close sidebar after theme change
        setTimeout(closeSidebar, 300);
    });
});

// Desktop theme toggle handler
desktopThemeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        changeTheme(btn.dataset.theme);
    });
});

// Initialize theme on page load
initTheme();


// Drag and drop handlers
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// Duration selector change handler
durationSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        customDurationInput.style.display = 'flex';
        customDuration.focus();
    } else {
        customDurationInput.style.display = 'none';
        selectedDuration = parseInt(e.target.value);
    }
});

// Custom duration input handler
customDuration.addEventListener('input', (e) => {
    const minutes = parseInt(e.target.value) || 0;
    selectedDuration = minutes * 60; // Convert to seconds
});

// Process button handler
processBtn.addEventListener('click', () => {
    // Validate custom duration if selected
    if (durationSelect.value === 'custom') {
        const minutes = parseInt(customDuration.value);
        if (!minutes || minutes < 1 || minutes > 60) {
            alert('Please enter a duration between 1-60 minutes');
            return;
        }
        selectedDuration = minutes * 60;
    }
    uploadVideo();
});

// Handle file selection
function handleFileSelect(file) {
    // Validate file type
    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/x-matroska',
        'video/x-flv', 'video/x-ms-wmv', 'video/webm', 'video/mpeg'];

    if (!validTypes.some(type => file.type.startsWith('video/'))) {
        showError('Invalid file type. Please select a video file.');
        return;
    }

    // Validate file size (2GB max)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('File too large. Maximum size is 2GB.');
        return;
    }

    selectedFile = file;

    // Create video preview
    const videoURL = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoURL;
    video.preload = 'metadata';

    video.addEventListener('loadedmetadata', () => {
        const duration = video.duration;
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = Math.floor(duration % 60);

        const durationText = hours > 0
            ? `${hours}h ${minutes}m ${seconds}s`
            : `${minutes}m ${seconds}s`;

        // Update UI - show duration config with video info
        fileName.textContent = file.name;
        fileSize.textContent = `${formatFileSize(file.size)} • ${durationText} • ${video.videoWidth}x${video.videoHeight}`;

        // Show toast notification
        toast.success(`Video loaded: ${file.name}`);

        // Clean up
        URL.revokeObjectURL(videoURL);
    });

    video.addEventListener('error', () => {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        toast.warning('Could not load video metadata');
        URL.revokeObjectURL(videoURL);
    });

    uploadArea.style.display = 'none';
    durationConfig.style.display = 'block';
}



// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Upload video to server with retry logic
async function uploadVideo(retryCount = 0) {
    if (!selectedFile) return;

    // Show processing section
    uploadSection.style.display = 'none';
    processingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';

    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('duration', selectedDuration);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            // Check if it's a rate limit error
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 60;
                toast.error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
                throw new Error(data.error || 'Rate limit exceeded');
            }

            throw new Error(data.error || 'Upload failed');
        }

        // Show results
        showResults(data);
        toast.success('Video processed successfully!');

    } catch (error) {
        // Automatic retry with exponential backoff
        if (retryCount < MAX_RETRIES && error.message !== 'Rate limit exceeded') {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            const nextRetry = retryCount + 1;

            toast.warning(`Upload failed. Retrying in ${delay / 1000}s... (Attempt ${nextRetry}/${MAX_RETRIES})`);

            setTimeout(() => {
                uploadVideo(nextRetry);
            }, delay);
        } else {
            // Max retries reached or rate limited
            showError(error.message);
            toast.error(error.message);
        }
    }
}

// Show results
function showResults(data) {
    processingSection.style.display = 'none';
    resultsSection.style.display = 'block';

    // Update video info
    document.getElementById('originalDuration').textContent = formatDuration(data.data.original_duration);
    document.getElementById('numSegments').textContent = data.data.num_segments + ' Parts';

    // Store output directory
    outputDir = data.output_dir;

    // Clear previous segments
    segmentsContainer.innerHTML = '';

    // Add segment cards
    data.data.files.forEach((file, index) => {
        const segmentCard = createSegmentCard(file, index + 1);
        segmentsContainer.appendChild(segmentCard);
    });
}

// Create segment card
function createSegmentCard(file, segmentNumber) {
    const card = document.createElement('div');
    card.className = 'segment-card';
    card.style.animationDelay = `${segmentNumber * 0.05}s`;

    card.innerHTML = `
        <div class="segment-info">
            <h3>Part ${segmentNumber}</h3>
            <p>${file.filename} • ${file.size_mb} MB</p>
        </div>
        <button class="btn-download" data-filename="${file.filename}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download
        </button>
    `;

    // Add download event listener
    const downloadBtn = card.querySelector('.btn-download');
    downloadBtn.addEventListener('click', () => {
        downloadFile(file.filename);
    });

    return card;
}

// Download single file
function downloadFile(filename) {
    const downloadPath = `/download/${outputDir}/${filename}`;
    window.location.href = downloadPath;
}

// Download all files
downloadAllBtn.addEventListener('click', () => {
    const downloadButtons = document.querySelectorAll('.btn-download');
    downloadButtons.forEach((btn, index) => {
        setTimeout(() => {
            btn.click();
        }, index * 500); // Delay each download by 500ms
    });
});

// Show error
function showError(message) {
    uploadSection.style.display = 'none';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'block';

    errorMessage.textContent = message;
}

// Retry button
retryBtn.addEventListener('click', resetUpload);
newVideoBtn.addEventListener('click', resetUpload);

// Reset upload
function resetUpload() {
    selectedFile = null;
    outputDir = null;
    selectedDuration = 300; // Reset to default 5 minutes
    fileInput.value = '';
    durationSelect.value = '300';
    customDuration.value = '';
    customDurationInput.style.display = 'none';

    uploadArea.style.display = 'block';
    fileSelected.style.display = 'none';
    durationConfig.style.display = 'none';
    uploadSection.style.display = 'block';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}
