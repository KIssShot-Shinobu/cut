import logging
import os
from logging.handlers import RotatingFileHandler

# Create logs directory
LOGS_DIR = 'logs'
os.makedirs(LOGS_DIR, exist_ok=True)

def setup_logging(app):
    """Configure application logging with rotating file handlers"""
    
    # Set base log level
    app.logger.setLevel(logging.INFO)
    
    # Remove default handlers
    app.logger.handlers.clear()
    
    # Format for log messages
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    )
    
    # Application log handler (rotating, max 10MB, keep 10 backups)
    app_handler = RotatingFileHandler(
        os.path.join(LOGS_DIR, 'app.log'),
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(formatter)
    app.logger.addHandler(app_handler)
    
    # Error log handler (only errors and above)
    error_handler = RotatingFileHandler(
        os.path.join(LOGS_DIR, 'error.log'),
        maxBytes=10485760,
        backupCount=10
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    app.logger.addHandler(error_handler)
    
    # Console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    app.logger.addHandler(console_handler)
    
    app.logger.info("Logging system initialized")
    
    return app.logger


def get_cleanup_logger():
    """Create a separate logger for cleanup operations"""
    logger = logging.getLogger('cleanup')
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        handler = RotatingFileHandler(
            os.path.join(LOGS_DIR, 'cleanup.log'),
            maxBytes=5242880,  # 5MB
            backupCount=5
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger
