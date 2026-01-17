# Progress tracking helper for real-time updates

def update_progress(job_id, percent, message, status='processing'):
    """Update progress for a job"""
    global progress_tracker
    progress_tracker[job_id] = {
        'percent': percent,
        'message': message,
        'status': status,
        'timestamp': time.time()
    }

def clear_progress(job_id):
    """Clear progress data after completion"""
    global progress_tracker
    if job_id in progress_tracker:
        del progress_tracker[job_id]
