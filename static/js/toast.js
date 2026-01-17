/**
 * Toast Notification Manager
 * Professional notification system with auto-dismiss and stacking support
 */

class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'i'
        };
        return icons[type] || icons.info;
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-entering`;

        const icon = document.createElement('span');
        icon.className = 'toast-icon';
        icon.textContent = this.getIcon(type);

        const messageEl = document.createElement('span');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.dismiss(toast);

        toast.appendChild(icon);
        toast.appendChild(messageEl);
        toast.appendChild(closeBtn);

        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.remove('toast-entering');
            toast.classList.add('toast-visible');
        }, 10);

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    }

    dismiss(toast) {
        if (!toast || !toast.parentElement) return;

        toast.classList.remove('toast-visible');
        toast.classList.add('toast-leaving');

        setTimeout(() => {
            if (toast.parentElement) {
                this.container.removeChild(toast);
                this.toasts = this.toasts.filter(t => t !== toast);
            }
        }, 300);
    }

    // Convenience methods
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }

    clearAll() {
        this.toasts.forEach(toast => this.dismiss(toast));
    }
}

// Create global toast instance
const toast = new ToastManager();
