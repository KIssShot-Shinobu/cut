// Progress tracking functions for SSE-based real-time updates

let currentEventSource = null;
let progressSimulation = null;

function startProgressTracking(jobId) {
    // DUMMY SIMULATION - Shows smooth progress without real backend
    // This simulates progress from 0% to 100% over ~10 seconds

    let currentProgress = 0;
    const totalParts = 3; // Simulated parts
    let currentPart = 1;

    // Reset progress UI
    if (progressBar) progressBar.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0%';
    if (progressParts) progressParts.textContent = '';
    if (progressStatus) progressStatus.textContent = 'Starting video analysis...';

    // Clear any existing simulation
    if (progressSimulation) {
        clearInterval(progressSimulation);
    }

    // Simulate progress updates every 500ms
    progressSimulation = setInterval(() => {
        currentProgress += Math.random() * 8 + 2; // Random increment 2-10%

        if (currentProgress >= 100) {
            currentProgress = 100;
            updateProgress({
                percent: 100,
                message: 'Video processing complete!',
                status: 'completed',
                current_part: totalParts,
                total_parts: totalParts
            });
            clearInterval(progressSimulation);
            return;
        }

        // Update current part based on progress
        if (currentProgress >= 33 && currentPart === 1) {
            currentPart = 2;
        } else if (currentProgress >= 66 && currentPart === 2) {
            currentPart = 3;
        }

        // Generate status message
        let message = '';
        if (currentProgress < 10) {
            message = 'Analyzing video duration and format...';
        } else if (currentProgress < 20) {
            message = 'Preparing to split video...';
        } else if (currentProgress < 90) {
            message = `Processing part ${currentPart} of ${totalParts}...`;
        } else {
            message = 'Finalizing video parts...';
        }

        updateProgress({
            percent: currentProgress,
            message: message,
            status: 'processing',
            current_part: currentPart,
            total_parts: totalParts
        });
    }, 500); // Update every 500ms
}

function updateProgress(data) {
    const { percent, message, status, current_part, total_parts } = data;

    // Update progress bar
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }

    // Update percentage text
    if (progressPercent) {
        progressPercent.textContent = `${Math.round(percent)}%`;
    }

    // Update status message
    if (progressStatus && message) {
        progressStatus.textContent = message;
    }

    // Update parts info
    if (progressParts && current_part !== null && total_parts !== null) {
        progressParts.textContent = `Part ${current_part} of ${total_parts}`;
    }

    // Handle error status
    if (status === 'error') {
        if (progressBar) progressBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
        toast.error(message || 'Processing failed');
    }
}

function stopProgressTracking() {
    if (progressSimulation) {
        clearInterval(progressSimulation);
        progressSimulation = null;
    }
    if (currentEventSource) {
        currentEventSource.close();
        currentEventSource = null;
    }
}

// Add to window for global access
window.startProgressTracking = startProgressTracking;
window.stopProgressTracking = stopProgressTracking;
