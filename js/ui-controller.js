/**
 * UI Controller Module
 * Handles all user interface interactions and updates
 */

export class UIController {
    constructor(app) {
        this.app = app;
        this.initEventListeners();
    }

    /**
     * Initialize all event listeners
     */
    initEventListeners() {
        this.initTabSwitching();
        this.initAudioControls();
        this.initMediaControls();
        this.initSegmentControls();
        this.initWaveformControls();
        this.initProjectControls();
    }

    /**
     * Initialize tab switching functionality
     */
    initTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Remove active class from all buttons and panels
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Add active class to clicked button and corresponding panel
                button.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');
            });
        });
    }

    /**
     * Initialize audio control event listeners
     */
    initAudioControls() {
        document.getElementById('audio-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.app.loadAudioFile(file);
            }
        });

        document.getElementById('play-pause').addEventListener('click', () => {
            this.app.togglePlayPause();
        });

        document.getElementById('stop').addEventListener('click', () => {
            this.app.stop();
        });
    }

    /**
     * Initialize media control event listeners
     */
    initMediaControls() {
        document.getElementById('video-file').addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                this.app.addMediaSource('video', file);
            });
        });

        document.getElementById('image-file').addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                this.app.addMediaSource('image', file);
            });
        });
    }

    /**
     * Initialize segment control event listeners
     */
    initSegmentControls() {
        document.getElementById('add-segment').addEventListener('click', () => {
            this.app.addOrUpdateSegment();
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.app.cancelEdit();
        });

        document.getElementById('sort-segments').addEventListener('click', () => {
            this.app.sortSegments();
        });

        document.getElementById('clear-error').addEventListener('click', () => {
            this.app.clearError();
        });
    }

    /**
     * Initialize waveform control event listeners
     */
    initWaveformControls() {
        const container = document.getElementById('waveform-container');

        // Click to seek
        container.addEventListener('click', (e) => {
            if (this.app.waveformRenderer.isPanning) return;
            this.app.seekFromWaveform(e);
        });

        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.app.waveformZoomIn();
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            this.app.waveformZoomOut();
        });

        document.getElementById('reset-view').addEventListener('click', () => {
            this.app.waveformResetView();
        });

        // Pan controls
        container.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.app.waveformRenderer.isPanning = true;
                this.app.waveformRenderer.lastPanX = e.clientX;
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.app.waveformRenderer.isPanning) {
                this.app.waveformPan(e);
            }
        });

        document.addEventListener('mouseup', () => {
            this.app.waveformRenderer.isPanning = false;
        });

        // Wheel zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.app.waveformWheel(e);
        }, { passive: false });
    }

    /**
     * Initialize project control event listeners
     */
    initProjectControls() {
        document.getElementById('save-project').addEventListener('click', () => {
            this.app.saveProject();
        });

        document.getElementById('load-project').addEventListener('click', () => {
            document.getElementById('project-file').click();
        });

        document.getElementById('project-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.app.loadProject(file);
            }
        });
    }



    /**
     * Update playhead position
     * @param {number} progress - Playback progress (0-1)
     */
    updatePlayhead(progress) {
        const playhead = document.getElementById('playhead');
        playhead.style.left = `${progress * 100}%`;
    }

    /**
     * Update time display
     * @param {string} current - Current time string
     * @param {string} total - Total time string
     */
    updateTimeDisplay(current, total) {
        document.getElementById('time-display').textContent = `${current} / ${total}`;
    }

    /**
     * Update play/pause button text
     * @param {boolean} isPlaying - Whether audio is playing
     */
    updatePlayPauseButton(isPlaying) {
        document.getElementById('play-pause').textContent = isPlaying ? 'Pause' : 'Play';
    }

    /**
     * Update zoom display
     * @param {string} text - Zoom display text
     */
    updateZoomDisplay(text) {
        document.getElementById('zoom-level').textContent = text;
    }

    /**
     * Render timeline segments
     * @param {Array} segments - Segments to render
     * @param {number} currentIndex - Current active segment index
     * @param {number} editingIndex - Editing segment index
     * @param {Function} onDelete - Delete callback
     * @param {Function} onEdit - Edit callback
     */
    renderTimeline(segments, currentIndex, editingIndex, onDelete, onEdit) {
        // Render segments in left panel list
        this.renderSegmentsList(segments, currentIndex, editingIndex, onDelete, onEdit);
        
        // Render segments overlaid on waveform
        this.renderSegmentsOnWaveform(segments, currentIndex, editingIndex, onEdit);
    }

    /**
     * Render segments list in left panel
     */
    renderSegmentsList(segments, currentIndex, editingIndex, onDelete, onEdit) {
        const container = document.getElementById('segments-list');
        container.innerHTML = '';

        if (segments.length === 0) {
            container.innerHTML = '<div class="info">No segments yet. Add your first segment above.</div>';
            return;
        }

        segments.forEach((segment, index) => {
            const div = document.createElement('div');
            div.className = 'segment-item';
            
            if (index === currentIndex) {
                div.classList.add('active');
            }
            
            if (index === editingIndex) {
                div.classList.add('editing');
            }

            div.innerHTML = `
                <div class="segment-item-header">
                    <span class="segment-time">
                        ${segment.startTime.toFixed(1)}s - ${segment.endTime.toFixed(1)}s
                    </span>
                    <button class="segment-delete" data-index="${index}">Delete</button>
                </div>
                <textarea readonly style="min-height: 60px; font-size: 11px;">${segment.code}</textarea>
            `;

            div.querySelector('.segment-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                onDelete(index);
            });

            div.addEventListener('click', () => {
                onEdit(index);
            });

            container.appendChild(div);
        });
    }

    /**
     * Render segments overlaid on waveform
     */
    renderSegmentsOnWaveform(segments, currentIndex, editingIndex, onEdit) {
        const container = document.getElementById('timeline');
        const waveformContainer = document.getElementById('waveform-container');
        container.innerHTML = '';

        // Get audio duration to calculate positions
        const audioDuration = this.app.audioManager.getDuration();
        if (!audioDuration) return;

        const containerWidth = waveformContainer.offsetWidth;

        segments.forEach((segment, index) => {
            const div = document.createElement('div');
            div.className = 'segment';
            
            if (index === currentIndex) {
                div.classList.add('active');
            }
            
            if (index === editingIndex) {
                div.classList.add('editing');
            }

            // Calculate position and width based on time
            const startPercent = (segment.startTime / audioDuration) * 100;
            const endPercent = (segment.endTime / audioDuration) * 100;
            const widthPercent = endPercent - startPercent;

            div.style.left = `${startPercent}%`;
            div.style.width = `${widthPercent}%`;

            div.innerHTML = `
                <div class="segment-label">
                    <div class="segment-time">${segment.startTime.toFixed(1)}s - ${segment.endTime.toFixed(1)}s</div>
                </div>
            `;

            div.addEventListener('click', (e) => {
                e.stopPropagation();
                onEdit(index);
            });

            container.appendChild(div);
        });
    }

    /**
     * Render media sources
     * @param {Array} sources - Media sources to render
     */
    renderMediaSources(sources) {
        const container = document.getElementById('sources-list');
        container.innerHTML = '';

        sources.forEach(source => {
            const div = document.createElement('div');
            div.className = `source-item ${source.type}`;
            
            if (source.type === 'video') {
                const video = document.createElement('video');
                video.className = 'source-preview';
                video.src = source.url;
                video.muted = true;
                video.currentTime = 1;
                div.appendChild(video);
            } else if (source.type === 'image') {
                const img = document.createElement('img');
                img.className = 'source-preview';
                img.src = source.url;
                div.appendChild(img);
            }
            
            const label = document.createElement('span');
            label.className = 'source-label';
            label.textContent = `s${source.index}`;
            div.appendChild(label);
            
            const filename = document.createElement('div');
            filename.textContent = source.file;
            filename.style.fontSize = '11px';
            filename.style.color = '#888';
            filename.style.marginTop = '5px';
            div.appendChild(filename);
            
            container.appendChild(div);
        });
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @param {Object} segment - Segment that caused error
     * @param {number} index - Segment index
     */
    showError(message, segment, index) {
        const errorSection = document.getElementById('error-section');
        const errorDisplay = document.getElementById('error-display');
        
        errorSection.style.display = 'block';
        errorDisplay.innerHTML = `<strong>Segment ${index} (${segment.startTime}s - ${segment.endTime}s):</strong>
${message}

<strong>Code:</strong>
${segment.code}`;
        
        errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Clear error display
     */
    clearError() {
        const errorSection = document.getElementById('error-section');
        if (errorSection) {
            errorSection.style.display = 'none';
            document.getElementById('error-display').innerHTML = '';
        }
    }

    /**
     * Set edit mode UI
     * @param {boolean} isEditing - Whether in edit mode
     * @param {number} index - Editing segment index
     */
    setEditMode(isEditing, index = -1) {
        const addButton = document.getElementById('add-segment');
        const cancelButton = document.getElementById('cancel-edit');
        const indicator = document.getElementById('edit-mode-indicator');

        if (isEditing) {
            addButton.textContent = 'Update Segment';
            cancelButton.style.display = 'inline-block';
            indicator.textContent = `(Editing segment ${index})`;
        } else {
            addButton.textContent = 'Add Segment';
            cancelButton.style.display = 'none';
            indicator.textContent = '';
        }
    }

    /**
     * Load segment data into inputs
     * @param {Object} segment - Segment to load
     */
    loadSegmentIntoInputs(segment) {
        document.getElementById('segment-start').value = segment.startTime;
        document.getElementById('segment-end').value = segment.endTime;
        document.getElementById('segment-code').value = segment.code;
        
        document.getElementById('segment-code').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        document.getElementById('segment-code').focus();
    }

    /**
     * Clear segment inputs
     * @param {number} defaultStart - Default start time
     * @param {number} defaultEnd - Default end time
     */
    clearSegmentInputs(defaultStart = 0, defaultEnd = 6) {
        document.getElementById('segment-code').value = '';
        document.getElementById('segment-start').value = defaultStart;
        document.getElementById('segment-end').value = defaultEnd;
    }

    /**
     * Get segment input values
     * @returns {Object} Segment input values
     */
    getSegmentInputs() {
        return {
            start: parseFloat(document.getElementById('segment-start').value),
            end: parseFloat(document.getElementById('segment-end').value),
            code: document.getElementById('segment-code').value.trim()
        };
    }

    /**
     * Update audio info display
     * @param {string} filename - Audio filename
     * @param {number} duration - Audio duration in seconds
     */
    updateAudioInfo(filename, duration) {
        const audioInfo = document.getElementById('audio-info');
        const audioFilename = document.getElementById('audio-filename');
        const audioDuration = document.getElementById('audio-duration');
        
        if (audioInfo && audioFilename && audioDuration) {
            audioInfo.style.display = 'block';
            audioFilename.textContent = filename;
            
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            audioDuration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}
