import os
import subprocess
import json
import time
import threading
import uuid
from datetime import datetime, timedelta
from flask import Flask, render_template, request, send_file, jsonify, Response
from werkzeug.utils import secure_filename
import math
import shutil
from logging_config import setup_logging, get_cleanup_logger
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)

# Setup logging
logger = setup_logging(app)
cleanup_logger = get_cleanup_logger()

# Setup rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per hour"],
    storage_uri="memory://",
    headers_enabled=True
)
logger.info("Rate limiter initialized")

# Configuration
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'mpeg', 'mpg'}
MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
SEGMENT_DURATION = 300  # 5 minutes in seconds
CLEANUP_HOURS = 2  # Delete files older than 2 hours
CLEANUP_INTERVAL = 600  # Check every 10 minutes (600 seconds)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Global progress tracker for SSE
progress_tracker = {}

# Session storage
user_sessions = {}

def update_progress(job_id, percent, message, status='processing', current_part=None, total_parts=None):
    """Update progress for a job"""
    progress_tracker[job_id] = {
        'percent': percent,
        'message': message,
        'status': status,
        'current_part': current_part,
        'total_parts': total_parts,
        'timestamp': time.time()
    }

def clear_progress(job_id):
    """Clear progress data after completion"""
    if job_id in progress_tracker:
        del progress_tracker[job_id]

# Create necessary directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


def cleanup_old_files():
    """Delete output and upload files older than CLEANUP_HOURS"""
    try:
        current_time = time.time()
        cutoff_time = current_time - (CLEANUP_HOURS * 3600)  # Convert hours to seconds
        deleted_count = 0
        
        # Clean outputs folder
        if os.path.exists(OUTPUT_FOLDER):
            for dir_name in os.listdir(OUTPUT_FOLDER):
                dir_path = os.path.join(OUTPUT_FOLDER, dir_name)
                
                if os.path.isdir(dir_path):
                    dir_mtime = os.path.getmtime(dir_path)
                    
                    if dir_mtime < cutoff_time:
                        try:
                            shutil.rmtree(dir_path)
                            deleted_count += 1
                            cleanup_logger.info(f"Deleted old output directory: {dir_name}")
                        except Exception as e:
                            cleanup_logger.error(f"Error deleting output {dir_name}: {e}")
        
        # Clean uploads folder
        if os.path.exists(UPLOAD_FOLDER):
            for filename in os.listdir(UPLOAD_FOLDER):
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                
                if os.path.isfile(file_path):
                    file_mtime = os.path.getmtime(file_path)
                    
                    if file_mtime < cutoff_time:
                        try:
                            os.remove(file_path)
                            deleted_count += 1
                            cleanup_logger.info(f"Deleted old upload file: {filename}")
                        except Exception as e:
                            cleanup_logger.error(f"Error deleting upload {filename}: {e}")
        
        if deleted_count > 0:
            cleanup_logger.info(f"Cleaned up {deleted_count} old files/directories")
            
    except Exception as e:
        cleanup_logger.error(f"Error in cleanup process: {e}")


def cleanup_scheduler():
    """Background thread to run cleanup periodically"""
    while True:
        time.sleep(CLEANUP_INTERVAL)
        cleanup_old_files()


# Start cleanup background thread
cleanup_thread = threading.Thread(target=cleanup_scheduler, daemon=True)
cleanup_thread.start()
logger.info(f"Auto-cleanup started - will delete files older than {CLEANUP_HOURS} hours")


def allowed_file(filename):
    """Check if file has an allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_thumbnail(video_path, output_path, timestamp='00:00:01'):
    """Generate thumbnail from video at specified timestamp"""
    try:
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-ss', timestamp,
            '-vframes', '1',
            '-vf', 'scale=320:-1',
            '-y',  # Overwrite output file
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0 and os.path.exists(output_path):
            logger.info(f"Thumbnail generated: {output_path}")
            return True
        else:
            logger.error(f"Thumbnail generation failed: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"Error generating thumbnail: {e}")
        return False


def get_video_duration(video_path):
    """Get video duration using ffprobe"""
    try:
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        duration = float(result.stdout.strip())
        return duration
    except Exception as e:
        print(f"Error getting video duration: {e}")
        return None


def split_video(input_path, output_dir, base_name, segment_duration=SEGMENT_DURATION, job_id=None):
    """Split video into segments using FFmpeg"""
    try:
        # Initialize progress
        if job_id:
            update_progress(job_id, 0, "Analyzing video...", "processing")
        
        # Get video duration
        duration = get_video_duration(input_path)
        if duration is None:
            if job_id:
                update_progress(job_id, 0, "Failed to get video duration", "error")
            return None, "Failed to get video duration"
        
        # Calculate number of segments
        num_segments = math.ceil(duration / segment_duration)
        
        if job_id:
            update_progress(job_id, 5, f"Will create {num_segments} parts. Starting split...", "processing", 0, num_segments)
        
        # Get file extension
        file_ext = os.path.splitext(input_path)[1]
        
        # Output pattern
        output_pattern = os.path.join(output_dir, f"{base_name}_part%03d{file_ext}")
        
        # FFmpeg command to split video
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-c', 'copy',
            '-map', '0',
            '-segment_time', str(segment_duration),
            '-f', 'segment',
            '-reset_timestamps', '1',
            output_pattern
        ]
        
        if job_id:
            update_progress(job_id, 10, "Splitting video...", "processing", 0, num_segments)
        
        # Run FFmpeg and wait for completion
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            if job_id:
                update_progress(job_id, 0, f"FFmpeg error: {result.stderr}", "error")
            return None, f"FFmpeg error: {result.stderr}"
        
        # Get list of created files and generate thumbnails
        output_files = []
        for i in range(num_segments):
            file_name = f"{base_name}_part{i:03d}{file_ext}"
            file_path = os.path.join(output_dir, file_name)
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                
                # Generate thumbnail for this part
                thumb_name = f"{base_name}_part{i:03d}_thumb.jpg"
                thumb_path = os.path.join(output_dir, thumb_name)
                has_thumbnail = generate_thumbnail(file_path, thumb_path)
                
                output_files.append({
                    'filename': file_name,
                    'size': file_size,
                    'size_mb': round(file_size / (1024 * 1024), 2),
                    'thumbnail': thumb_name if has_thumbnail else None
                })
                
                # Update progress after each part is processed
                if job_id:
                    progress_percent = 10 + ((i + 1) / num_segments) * 85  # 10-95%
                    update_progress(
                        job_id, 
                        int(progress_percent), 
                        f"Processed part {i + 1} of {num_segments}", 
                        "processing",
                        i + 1,
                        num_segments
                    )
        
        # Final completion
        if job_id:
            update_progress(job_id, 100, "Video split completed!", "completed", num_segments, num_segments)
        
        return {
            'original_duration': round(duration, 2),
            'num_segments': num_segments,
            'segment_duration': segment_duration,
            'files': output_files
        }, None
        
    except Exception as e:
        if job_id:
            update_progress(job_id, 0, f"Error splitting video: {str(e)}", "error")
        return None, f"Error splitting video: {str(e)}"


@app.route('/')
def index():
    """Render main page"""
    logger.info(f"Page accessed from {request.remote_addr}")
    return render_template('index.html')


@app.route('/progress/<job_id>')
def progress_stream(job_id):
    """SSE endpoint for progress updates"""
    def generate():
        """Generate Server-Sent Events"""
        last_sent = None
        timeout_start = time.time()
        max_timeout = 300  # 5 minutes max
        
        while True:
            # Check timeout
            if time.time() - timeout_start > max_timeout:
                yield f"data: {json.dumps({'status': 'timeout', 'message': 'Connection timeout'})}\n\n"
                break
            
            # Get current progress
            if job_id in progress_tracker:
                current_progress = progress_tracker[job_id].copy()
                
                # Only send if changed
                if current_progress != last_sent:
                    yield f"data: {json.dumps(current_progress)}\n\n"
                    last_sent = current_progress
                    
                    # Check if completed
                    if current_progress.get('status') in ['completed', 'error']:
                        break
            
            time.sleep(0.5)  # Poll every 500ms
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/upload', methods=['POST'])
@limiter.limit("10 per hour")
def upload_video():
    """Handle video upload and splitting"""
    client_ip = request.remote_addr
    logger.info(f"Upload request from {client_ip}")
    
    # Get or create session
    session_id = request.form.get('session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if session_id not in user_sessions:
        user_sessions[session_id] = {
            'uploads': [],
            'created_at': time.time(),
            'ip': client_ip
        }
    
    try:
        # Check if file is present
        if 'video' not in request.files:
            logger.warning(f"No file provided from {client_ip}")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['video']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: ' + ', '.join(ALLOWED_EXTENSIONS)}), 400
        
        # Get duration parameter (in seconds)
        duration = request.form.get('duration', SEGMENT_DURATION, type=int)
        
        # Validate duration (1 second to 60 minutes)
        if duration < 1 or duration > 3600:
            return jsonify({'error': 'Duration must be between 1 second and 60 minutes (3600 seconds)'}), 400
        
        # Secure filename
        filename = secure_filename(file.filename)
        base_name = os.path.splitext(filename)[0]
        
        # Get job_id from request or generate new one
        job_id = request.form.get('job_id')
        if not job_id:
            job_id = str(uuid.uuid4())
        
        # Create unique output directory for this video
        output_dir = os.path.join(app.config['OUTPUT_FOLDER'], base_name)
        os.makedirs(output_dir, exist_ok=True)
        
        # Save uploaded file
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(upload_path)
        
        # Get file size before processing
        upload_size = os.path.getsize(upload_path)
        
        # Split video with custom duration and job_id for progress tracking
        result, error = split_video(upload_path, output_dir, base_name, duration, job_id)
        
        # Clean up uploaded file (with error handling for Windows)
        try:
            time.sleep(0.5)  # Small delay to ensure FFmpeg releases file handle
            os.remove(upload_path)
        except Exception as cleanup_error:
            print(f"Warning: Could not delete upload file: {cleanup_error}")
            # Continue anyway - the important part is the split succeeded
        
        if error:
            # Clean up output directory if split failed
            if os.path.exists(output_dir):
                shutil.rmtree(output_dir)
            return jsonify({'error': error}), 500
        
        if session_id in user_sessions and result:
            user_sessions[session_id]['uploads'].insert(0, {
                'filename': file.filename,
                'timestamp': time.time(),
                'size': upload_size,
                'output_dir': base_name,
                'parts': result.get('num_segments', 0),
                'duration': result.get('original_duration', 0)
            })
            # Keep only last 10 uploads
            if len(user_sessions[session_id]['uploads']) > 10:
                user_sessions[session_id]['uploads'] = user_sessions[session_id]['uploads'][:10]
        
        # Clear progress after completion
        clear_progress(job_id)
        
        return jsonify({
            'success': True,
            'message': 'Video split successfully',
            'data': result,
            'output_dir': base_name,
            'session_id': session_id,
            'job_id': job_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/download/<path:filepath>')
def download_file(filepath):
    """Download a split video file"""
    try:
        file_path = os.path.join(app.config['OUTPUT_FOLDER'], filepath)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/list', methods=['GET'])
def list_outputs():
    """List all output directories and their files"""
    try:
        outputs = []
        output_path = app.config['OUTPUT_FOLDER']
        
        if not os.path.exists(output_path):
            return jsonify({'outputs': []})
        
        for dir_name in os.listdir(output_path):
            dir_path = os.path.join(output_path, dir_name)
            if os.path.isdir(dir_path):
                files = []
                for file_name in os.listdir(dir_path):
                    file_path = os.path.join(dir_path, file_name)
                    if os.path.isfile(file_path):
                        files.append({
                            'filename': file_name,
                            'size': os.path.getsize(file_path),
                            'path': f"{dir_name}/{file_name}"
                        })
                
                outputs.append({
                    'name': dir_name,
                    'files': files,
                    'count': len(files)
                })
        
        return jsonify({'outputs': outputs})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/clear', methods=['POST'])
def clear_outputs():
    """Clear all output files"""
    try:
        output_path = app.config['OUTPUT_FOLDER']
        if os.path.exists(output_path):
            shutil.rmtree(output_path)
            os.makedirs(output_path, exist_ok=True)
        return jsonify({'success': True, 'message': 'All outputs cleared'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
