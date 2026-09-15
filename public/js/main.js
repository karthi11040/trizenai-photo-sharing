/**
 * TrizenAI Photo Sharing Platform - Core JavaScript Utilities
 */

// Retrieve CSRF token from document cookies for secure AJAX requests
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Universal Clipboard Copier with Fallback and Animated Button Feedback
 */
function copyTextToClipboard(text, btnElement, successLabel = 'Copied!') {
    if (!text) return;
    
    function onSuccess() {
        if (btnElement) {
            const origHtml = btnElement.innerHTML;
            btnElement.innerHTML = `<i class="bi bi-check2-circle me-1 text-success"></i> ${successLabel}`;
            btnElement.classList.add('border-success', 'text-success');
            setTimeout(() => {
                btnElement.innerHTML = origHtml;
                btnElement.classList.remove('border-success', 'text-success');
            }, 2000);
        }
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
            fallbackCopy(text, onSuccess);
        });
    } else {
        fallbackCopy(text, onSuccess);
    }
}

function fallbackCopy(text, callback) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        if (callback) callback();
    } catch (err) {
        console.error('Fallback clipboard copy failed', err);
    }
    document.body.removeChild(textArea);
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize & auto-dismiss global floating toast notifications after exactly 10 seconds
    const toastElements = document.querySelectorAll('.app-toast-container .toast');
    toastElements.forEach(toastEl => {
        const toast = new bootstrap.Toast(toastEl, {
            delay: 10000,
            autohide: true
        });
        toast.show();

        // Ironclad safety timer to ensure smooth fade and vanish after 10s
        setTimeout(() => {
            if (toastEl && toastEl.classList.contains('show')) {
                toast.hide();
            }
        }, 10000);
    });

    // Auto-dismiss inline banner alerts after 10 seconds
    const autoAlerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    autoAlerts.forEach(alertEl => {
        setTimeout(() => {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alertEl);
            if (bsAlert) {
                bsAlert.close();
            }
        }, 10000);
    });

    // Global Delegated Password Visibility Toggle
    document.addEventListener('click', (e) => {
        const button = e.target.closest('[data-password-toggle]');
        if (!button) return;
        e.preventDefault();
        e.stopPropagation();

        const targetId = button.getAttribute('data-password-toggle');
        const input = document.getElementById(targetId) || button.parentElement.querySelector('input');
        if (!input) return;

        const icon = button.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
                icon.className = 'bi bi-eye-slash';
            }
            button.setAttribute('aria-label', 'Hide password');
        } else {
            input.type = 'password';
            if (icon) {
                icon.className = 'bi bi-eye';
            }
            button.setAttribute('aria-label', 'Show password');
        }
    });

    // Universal Sidebar Toggle Handler (Supports Desktop collapse & Mobile offcanvas)
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            if (window.innerWidth < 992) {
                const offcanvasEl = document.getElementById('mobileSidebar');
                if (offcanvasEl) {
                    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
                    offcanvas.toggle();
                }
            } else {
                const workspaceEl = document.querySelector('.app-workspace');
                if (workspaceEl) {
                    workspaceEl.classList.toggle('sidebar-collapsed');
                    try {
                        localStorage.setItem('trizen_sidebar_collapsed', workspaceEl.classList.contains('sidebar-collapsed') ? '1' : '0');
                    } catch (e) {}
                }
            }
        });

        // Restore collapsed preference on desktop
        try {
            if (window.innerWidth >= 992 && localStorage.getItem('trizen_sidebar_collapsed') === '1') {
                const workspaceEl = document.querySelector('.app-workspace');
                if (workspaceEl) workspaceEl.classList.add('sidebar-collapsed');
            }
        } catch (e) {}
    }

    // Universal Tab State Persistence & Static Switch Stabilizer
    initTabPersistence();
});

/**
 * Universal Tab State Persistence & Dynamic Tab Synchronization
 * Keeps the exact tab active across browser tab switches, page reloads, form posts, and deep links.
 */
function initTabPersistence() {
    const storageKeyPrefix = 'trizen_active_tab_';
    const currentPath = window.location.pathname;
    const fullStorageKey = storageKeyPrefix + currentPath;

    function findTabTrigger(targetId) {
        if (!targetId) return null;
        const cleanId = targetId.replace(/^#/, '');
        return document.querySelector(`[data-bs-target="#${cleanId}"], [data-bs-target="${cleanId}"], [href="#${cleanId}"], button#${cleanId}-tab, a#${cleanId}-tab`);
    }

    function activateTab(tabTrigger) {
        if (!tabTrigger) return;
        try {
            const tabInstance = bootstrap.Tab.getOrCreateInstance(tabTrigger);
            tabInstance.show();
        } catch (err) {
            tabTrigger.click();
        }
    }

    // 1. Initial tab resolution on page load
    const currentHash = window.location.hash;
    let targetTrigger = null;

    if (currentHash) {
        targetTrigger = findTabTrigger(currentHash);
    }

    if (!targetTrigger) {
        try {
            const savedTarget = sessionStorage.getItem(fullStorageKey) || localStorage.getItem(fullStorageKey);
            if (savedTarget) {
                targetTrigger = findTabTrigger(savedTarget);
            }
        } catch (e) {}
    }

    if (targetTrigger) {
        // Small delay to ensure all custom scripts or child components have mounted
        setTimeout(() => {
            activateTab(targetTrigger);
        }, 30);
    }

    // 2. Global listener for all Bootstrap tab changes
    document.addEventListener('shown.bs.tab', (event) => {
        const trigger = event.target;
        const targetSelector = trigger.getAttribute('data-bs-target') || trigger.getAttribute('href') || trigger.getAttribute('id') || '';
        if (!targetSelector) return;

        const hash = targetSelector.startsWith('#') ? targetSelector : '#' + targetSelector;

        try {
            sessionStorage.setItem(fullStorageKey, hash);
            localStorage.setItem(fullStorageKey, hash);
            // Update URL hash smoothly without triggering a page jump
            if (history.replaceState) {
                history.replaceState(null, null, hash);
            } else {
                window.location.hash = hash;
            }
        } catch (e) {}

        // Ensure all forms in the newly active tab pane retain the hash upon submission
        const activePane = document.querySelector(hash);
        if (activePane) {
            const forms = activePane.querySelectorAll('form');
            forms.forEach(form => {
                const action = form.getAttribute('action') || '';
                if (action && !action.includes('#')) {
                    form.setAttribute('action', action + hash);
                }
            });
        }
    });

    // 3. Browser Back/Forward navigation (hashchange)
    window.addEventListener('hashchange', () => {
        if (window.location.hash) {
            const trigger = findTabTrigger(window.location.hash);
            if (trigger) activateTab(trigger);
        }
    });

    // 4. Multi-tab / Browser tab switching visibility stabilizer
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const activeHash = window.location.hash || sessionStorage.getItem(fullStorageKey);
            if (activeHash) {
                const trigger = findTabTrigger(activeHash);
                if (trigger && !trigger.classList.contains('active')) {
                    activateTab(trigger);
                }
            }
        }
    });
}

/**
 * Real-time Password Strength Meter & Interactive Requirements Checklist
 */
function initPasswordStrengthMeter(options) {
    const passwordInput = document.getElementById(options.passwordId);
    const usernameInput = document.getElementById(options.usernameId);
    const emailInput = document.getElementById(options.emailId);
    const confirmInput = document.getElementById(options.confirmPasswordId);
    const meterBar = document.getElementById(options.meterBarId);
    const meterText = document.getElementById(options.meterTextId);
    const checklist = options.checklist || {};

    if (!passwordInput) return;

    const workspaceKeywords = [
        'trizen', 'trizenai', 'trizen_ai', 'trizen-ai',
        'photo_sharing_platform', 'photosharingplatform', 'photo-sharing-platform', 'photosharing'
    ];

    function updateChecklistItem(itemEl, isValid) {
        if (!itemEl) return;
        const icon = itemEl.querySelector('i');
        if (isValid) {
            itemEl.classList.remove('text-muted');
            itemEl.classList.add('text-success', 'fw-medium');
            if (icon) {
                icon.className = 'bi bi-check-circle-fill me-1 text-success';
            }
        } else {
            itemEl.classList.remove('text-success', 'fw-medium');
            itemEl.classList.add('text-muted');
            if (icon) {
                icon.className = 'bi bi-circle me-1 text-muted';
            }
        }
    }

    function evaluate() {
        const val = passwordInput.value || '';
        const username = (usernameInput ? usernameInput.value : '').trim().toLowerCase();
        const email = (emailInput ? emailInput.value : '').trim().toLowerCase();
        const emailPrefix = email.split('@')[0] || '';
        const valLower = val.toLowerCase();

        const hasLength = val.length >= 8;
        const hasUpper = /[A-Z]/.test(val);
        const hasLower = /[a-z]/.test(val);
        const hasDigit = /[0-9]/.test(val);
        const hasSpecial = /[^A-Za-z0-9]/.test(val);

        const noUsername = !(username.length >= 3 && valLower.includes(username));
        const noEmail = !(emailPrefix.length >= 3 && valLower.includes(emailPrefix));
        const noIdentity = val.length > 0 ? (noUsername && noEmail) : false;

        let containsWorkspace = false;
        for (const kw of workspaceKeywords) {
            if (valLower.includes(kw)) {
                containsWorkspace = true;
                break;
            }
        }
        const noWorkspace = val.length > 0 ? !containsWorkspace : false;

        // Update UI checklist
        updateChecklistItem(checklist.length, hasLength);
        updateChecklistItem(checklist.uppercase, hasUpper);
        updateChecklistItem(checklist.lowercase, hasLower);
        updateChecklistItem(checklist.number, hasDigit);
        updateChecklistItem(checklist.special, hasSpecial);
        updateChecklistItem(checklist.noIdentity, noIdentity);
        updateChecklistItem(checklist.noWorkspace, noWorkspace);

        if (confirmInput && checklist.match) {
            const isMatch = val.length > 0 && confirmInput.value === val;
            updateChecklistItem(checklist.match, isMatch);
        }

        // Calculate strength score
        let score = 0;
        if (hasLength) score += 1;
        if (hasUpper) score += 1;
        if (hasLower) score += 1;
        if (hasDigit) score += 1;
        if (hasSpecial) score += 1;
        if (val.length >= 12) score += 1;
        if (noIdentity) score += 1;
        if (noWorkspace) score += 1;

        if (meterBar && meterText) {
            if (val.length === 0) {
                meterBar.style.width = '0%';
                meterBar.className = 'progress-bar';
                meterText.textContent = 'Password strength: enter password';
                meterText.className = 'small text-muted';
            } else if (containsWorkspace || !noUsername || !noEmail) {
                meterBar.style.width = '25%';
                meterBar.className = 'progress-bar bg-danger';
                meterText.textContent = 'Cannot contain username, email, or workspace name';
                meterText.className = 'small text-danger fw-semibold';
            } else if (score <= 3) {
                meterBar.style.width = '30%';
                meterBar.className = 'progress-bar bg-danger';
                meterText.textContent = 'Weak password';
                meterText.className = 'small text-danger fw-semibold';
            } else if (score <= 5) {
                meterBar.style.width = '60%';
                meterBar.className = 'progress-bar bg-warning';
                meterText.textContent = 'Moderate password';
                meterText.className = 'small text-warning fw-semibold';
            } else if (score < 7) {
                meterBar.style.width = '80%';
                meterBar.className = 'progress-bar bg-info';
                meterText.textContent = 'Good password';
                meterText.className = 'small text-info fw-semibold';
            } else {
                meterBar.style.width = '100%';
                meterBar.className = 'progress-bar bg-success';
                meterText.textContent = 'Strong password ✓';
                meterText.className = 'small text-success fw-semibold';
            }
        }
    }

    passwordInput.addEventListener('input', evaluate);
    if (usernameInput) usernameInput.addEventListener('input', evaluate);
    if (emailInput) emailInput.addEventListener('input', evaluate);
    if (confirmInput) confirmInput.addEventListener('input', evaluate);
}

/**
 * Creates dynamic Bootstrap floating toast notifications
 */
function createToastNotification(message, type = 'success') {
    let container = document.querySelector('.app-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'app-toast-container';
        document.body.appendChild(container);
    }

    const iconMap = {
        success: 'bi-check-circle-fill text-success',
        danger: 'bi-exclamation-triangle-fill text-danger',
        error: 'bi-exclamation-triangle-fill text-danger',
        warning: 'bi-exclamation-circle-fill text-warning',
        info: 'bi-info-circle-fill text-primary'
    };

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center bg-white border-start border-4 border-${type === 'error' ? 'danger' : type} shadow-sm`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
        <div class="d-flex p-2">
            <div class="toast-body d-flex align-items-center gap-2 small text-dark">
                <i class="bi ${iconMap[type] || iconMap.info} fs-5"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 6000, autohide: true });
    toast.show();
    setTimeout(() => { toastEl.remove(); }, 6500);
}

// Global HTMX Event Interceptors
document.addEventListener('DOMContentLoaded', () => {
    // Listen for custom trigger headers sent from Django (e.g. HX-Trigger: {"showToast": "Event created!"})
    document.body.addEventListener('showToast', (e) => {
        const detail = e.detail;
        if (typeof detail === 'string') {
            createToastNotification(detail, 'success');
        } else if (detail && detail.message) {
            createToastNotification(detail.message, detail.type || 'success');
        }
    });

    // Close active Bootstrap modals when HTMX triggers closeModal
    document.body.addEventListener('closeModal', () => {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(m => {
            const bsModal = bootstrap.Modal.getInstance(m);
            if (bsModal) bsModal.hide();
        });
    });

    // Handle HTMX Response Errors (401 Session Expired, 403 Forbidden, 500 Server Error)
    document.body.addEventListener('htmx:responseError', (e) => {
        const xhr = e.detail.xhr;
        if (xhr.status === 401) {
            createToastNotification("Your session has expired. Please sign in again.", 'warning');
            setTimeout(() => { window.location.href = '/login/'; }, 2000);
        } else if (xhr.status === 403) {
            createToastNotification("You don't have permission to perform this action.", 'danger');
        } else if (xhr.status === 404) {
            createToastNotification("Target resource not found.", 'warning');
        } else {
            createToastNotification("An unexpected error occurred. Please try again.", 'danger');
        }
    });
});

