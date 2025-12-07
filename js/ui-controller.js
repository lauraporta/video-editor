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
        this.initAccordion();
        this.initResizeHandles();
        this.initAudioControls();
        this.initMediaControls();
        this.initSegmentControls();
        this.initWaveformControls();
        this.initProjectControls();
        this.initCanvasSizeControls();
    }

    /**
     * Initialize accordion functionality
     */
    initAccordion() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                const content = item.querySelector('.accordion-content');
                const icon = item.querySelector('.accordion-icon');
                const wasActive = item.classList.contains('active');
                
                // Don't allow closing if already active (always keep one open)
                if (wasActive) return;
                
                // Close all accordion items with pure JavaScript
                document.querySelectorAll('.accordion-item').forEach(i => {
                    i.classList.remove('active');
                    const c = i.querySelector('.accordion-content');
                    const ic = i.querySelector('.accordion-icon');
                    if (c) c.style.display = 'none';
                    if (ic) ic.style.transform = 'rotate(0deg)';
                });
                
                // Open clicked item
                item.classList.add('active');
                if (content) content.style.display = 'block';
                if (icon) icon.style.transform = 'rotate(180deg)';
            });
        });
    }

    /**
     * Initialize resize handles for panels
     */
    initResizeHandles() {
        // Create vertical resize handle (between left and right panels)
        const verticalHandle = document.createElement('div');
        verticalHandle.className = 'resize-handle-vertical';
        verticalHandle.style.left = '350px';
        document.getElementById('app-container').appendChild(verticalHandle);
        
        // Create horizontal resize handle (between top and bottom)
        const horizontalHandle = document.createElement('div');
        horizontalHandle.className = 'resize-handle-horizontal';
        horizontalHandle.style.top = 'calc(100vh - 280px)';
        document.getElementById('app-container').appendChild(horizontalHandle);
        
        // Vertical resize
        let isResizingVertical = false;
        verticalHandle.addEventListener('mousedown', (e) => {
            isResizingVertical = true;
            e.preventDefault();
        });
        
        // Horizontal resize
        let isResizingHorizontal = false;
        horizontalHandle.addEventListener('mousedown', (e) => {
            isResizingHorizontal = true;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isResizingVertical) {
                const container = document.getElementById('app-container');
                const newLeftWidth = Math.max(200, Math.min(e.clientX, window.innerWidth - 400));
                container.style.gridTemplateColumns = `${newLeftWidth}px 1fr`;
                verticalHandle.style.left = `${newLeftWidth}px`;
                localStorage.setItem('leftPanelWidth', newLeftWidth);
                
                // Redraw waveform on resize
                if (this.app.waveformRenderer && this.app.audioManager.audioBuffer) {
                    setTimeout(() => {
                        this.app.waveformRenderer.draw(this.app.segmentManager.getSegments());
                    }, 50);
                }
            }
            
            if (isResizingHorizontal) {
                const container = document.getElementById('app-container');
                const newBottomHeight = Math.max(150, Math.min(window.innerHeight - e.clientY, window.innerHeight - 200));
                container.style.gridTemplateRows = `1fr ${newBottomHeight}px`;
                horizontalHandle.style.top = `${window.innerHeight - newBottomHeight}px`;
                localStorage.setItem('bottomPanelHeight', newBottomHeight);
                
                // Redraw waveform on resize
                if (this.app.waveformRenderer && this.app.audioManager.audioBuffer) {
                    setTimeout(() => {
                        this.app.waveformRenderer.draw(this.app.segmentManager.getSegments());
                    }, 50);
                }
            }
        });
        
        document.addEventListener('mouseup', () => {
            isResizingVertical = false;
            isResizingHorizontal = false;
        });
        
        // Restore saved sizes
        const savedLeftWidth = localStorage.getItem('leftPanelWidth');
        const savedBottomHeight = localStorage.getItem('bottomPanelHeight');
        
        if (savedLeftWidth) {
            const container = document.getElementById('app-container');
            container.style.gridTemplateColumns = `${savedLeftWidth}px 1fr`;
            verticalHandle.style.left = `${savedLeftWidth}px`;
        }
        
        if (savedBottomHeight) {
            const container = document.getElementById('app-container');
            container.style.gridTemplateRows = `1fr ${savedBottomHeight}px`;
            horizontalHandle.style.top = `${window.innerHeight - savedBottomHeight}px`;
        }
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

        // Timeline scroll slider
        const scrollSlider = document.getElementById('timeline-scroll');
        if (scrollSlider) {
            scrollSlider.addEventListener('input', (e) => {
                const scrollPercent = parseFloat(e.target.value) / 100;
                this.app.waveformRenderer.offset = scrollPercent * (1 - 1/this.app.waveformRenderer.zoom);
                this.app.waveformRenderer.draw(this.app.segmentManager.getSegments());
                this.app.renderTimeline();
            });
        }

        // Trackpad two-finger pan and zoom with wheel
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // Detect horizontal scroll (two-finger pan on trackpad)
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                // Horizontal pan
                const panAmount = e.deltaX / container.offsetWidth;
                this.app.waveformRenderer.offset += panAmount * 0.5;
                this.app.waveformRenderer.offset = Math.max(0, Math.min(
                    this.app.waveformRenderer.offset, 
                    1 - 1/this.app.waveformRenderer.zoom
                ));
                this.app.waveformRenderer.draw(this.app.segmentManager.getSegments());
                this.app.renderTimeline();
                this.updateScrollSlider();
            } else {
                // Vertical scroll = zoom
                this.app.waveformWheel(e);
                this.updateScrollSlider();
            }
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
     * Initialize canvas size controls
     */
    initCanvasSizeControls() {
        const presetButtons = document.querySelectorAll('.preset-btn');
        const customSizeDiv = document.getElementById('custom-size');
        
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const width = btn.dataset.width;
                const height = btn.dataset.height;
                
                if (width === 'custom') {
                    customSizeDiv.style.display = 'block';
                } else {
                    customSizeDiv.style.display = 'none';
                    this.app.setCanvasSize(parseInt(width), parseInt(height));
                }
            });
        });
        
        document.getElementById('apply-custom-size').addEventListener('click', () => {
            const width = parseInt(document.getElementById('canvas-width').value);
            const height = parseInt(document.getElementById('canvas-height').value);
            this.app.setCanvasSize(width, height);
        });
        
        // Set default desktop resolution on init
        this.app.setCanvasSize(1920, 1080);
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
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (playIcon && pauseIcon) {
            playIcon.style.display = isPlaying ? 'none' : 'block';
            pauseIcon.style.display = isPlaying ? 'block' : 'none';
        }
    }

    /**
     * Update zoom display
     * @param {string} text - Zoom display text
     */
    updateZoomDisplay(text) {
        // Display removed per user request
    }

    /**
     * Update scroll slider position
     */
    updateScrollSlider() {
        const scrollSlider = document.getElementById('timeline-scroll');
        if (scrollSlider) {
            const maxOffset = 1 - 1/this.app.waveformRenderer.zoom;
            const scrollPercent = maxOffset > 0 ? (this.app.waveformRenderer.offset / maxOffset) * 100 : 0;
            scrollSlider.value = scrollPercent;
        }
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
        // Render segments overlaid on waveform
        this.renderSegmentsOnWaveform(segments, currentIndex, editingIndex, onDelete, onEdit);
    }

    /**
     * Render segments overlaid on waveform
     */
    renderSegmentsOnWaveform(segments, currentIndex, editingIndex, onDelete, onEdit) {
        const container = document.getElementById('timeline');
        const waveformContainer = document.getElementById('waveform-container');
        container.innerHTML = '';

        // Get audio duration to calculate positions
        const audioDuration = this.app.audioManager.getDuration();
        if (!audioDuration) return;

        // Get zoom and offset from waveform renderer
        const zoom = this.app.waveformRenderer.zoom;
        const offset = this.app.waveformRenderer.offset;
        const visibleStart = offset * audioDuration;
        const visibleEnd = visibleStart + (audioDuration / zoom);
        const visibleDuration = visibleEnd - visibleStart;

        segments.forEach((segment, index) => {
            // Skip segments outside visible range
            if (segment.endTime < visibleStart || segment.startTime > visibleEnd) return;
            
            const div = document.createElement('div');
            div.className = 'segment';
            div.dataset.index = index;
            
            if (index === currentIndex) {
                div.classList.add('active');
            }
            
            if (index === editingIndex) {
                div.classList.add('editing');
                div.classList.add('selected');
            }

            // Calculate position and width based on visible time range
            const startPercent = ((segment.startTime - visibleStart) / visibleDuration) * 100;
            const endPercent = ((segment.endTime - visibleStart) / visibleDuration) * 100;
            const widthPercent = endPercent - startPercent;

            div.style.left = `${startPercent}%`;
            div.style.width = `${widthPercent}%`;

            div.innerHTML = `
                <div class="segment-edge left" data-index="${index}" data-edge="start"></div>
                <div class="segment-edge right" data-index="${index}" data-edge="end"></div>
                <div class="segment-label">
                    <div class="segment-time">${segment.startTime.toFixed(1)}s - ${segment.endTime.toFixed(1)}s</div>
                </div>
                <button class="segment-delete-btn" data-index="${index}">×</button>
            `;

            // Click on segment body to select and edit
            div.addEventListener('click', (e) => {
                if (!e.target.classList.contains('segment-edge') && 
                    !e.target.classList.contains('segment-delete-btn') &&
                    !e.target.classList.contains('segment-label')) {
                    e.stopPropagation();
                    
                    // Remove selected class from all segments
                    document.querySelectorAll('.segment').forEach(s => s.classList.remove('selected'));
                    // Add selected class to this segment
                    div.classList.add('selected');
                    
                    onEdit(index);
                }
            });
            
            // Delete button
            const deleteBtn = div.querySelector('.segment-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onDelete(index);
            });
            
            // Edge dragging
            const leftEdge = div.querySelector('.segment-edge.left');
            const rightEdge = div.querySelector('.segment-edge.right');
            
            this.initSegmentEdgeDrag(leftEdge, index, 'start', segment, audioDuration);
            this.initSegmentEdgeDrag(rightEdge, index, 'end', segment, audioDuration);
            
            // Segment body dragging (move entire segment)
            this.initSegmentDrag(div, index, segment, audioDuration);

            container.appendChild(div);
        });
    }

    /**
     * Initialize segment edge dragging
     */
    initSegmentEdgeDrag(edgeElement, segmentIndex, edge, segment, audioDuration) {
        let isDragging = false;
        let startX = 0;
        
        edgeElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            e.stopPropagation();
            e.preventDefault();
        });
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const waveformContainer = document.getElementById('waveform-container');
            const rect = waveformContainer.getBoundingClientRect();
            
            // Get the latest segment data (in case it was updated)
            const currentSegment = this.app.segmentManager.getSegment(segmentIndex);
            if (!currentSegment) return;
            
            // Account for zoom and offset
            const zoom = this.app.waveformRenderer.zoom;
            const offset = this.app.waveformRenderer.offset;
            const visibleStart = offset * audioDuration;
            const visibleDuration = audioDuration / zoom;
            
            const x = e.clientX - rect.left;
            const timeAtCursor = visibleStart + (x / rect.width) * visibleDuration;
            
            // Snap to 0.1 second grid
            const snappedTime = Math.round(timeAtCursor * 10) / 10;
            
            if (edge === 'start') {
                const newStart = Math.max(0, Math.min(snappedTime, currentSegment.endTime - 0.1));
                this.app.segmentManager.updateSegment(segmentIndex, newStart, currentSegment.endTime, currentSegment.code);
            } else {
                const newEnd = Math.max(currentSegment.startTime + 0.1, Math.min(snappedTime, audioDuration));
                this.app.segmentManager.updateSegment(segmentIndex, currentSegment.startTime, newEnd, currentSegment.code);
            }
            
            this.app.renderTimeline();
            this.app.waveformRenderer.draw(this.app.segmentManager.getSegments());
        };
        
        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                this.app.sortSegments();
            }
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    /**
     * Initialize segment body dragging (move entire segment)
     */
    initSegmentDrag(segmentElement, segmentIndex, segment, audioDuration) {
        let isDragging = false;
        let dragStartX = 0;
        let segmentStartTime = 0;
        let segmentDuration = 0;
        
        const segmentLabel = segmentElement.querySelector('.segment-label');
        
        segmentLabel.addEventListener('mousedown', (e) => {
            // CRITICAL: Stop propagation so waveform click doesn't fire
            e.stopPropagation();
            e.preventDefault();
            
            // Get the latest segment data at drag start
            const currentSegment = this.app.segmentManager.getSegment(segmentIndex);
            if (!currentSegment) return;
            
            isDragging = true;
            dragStartX = e.clientX;
            segmentStartTime = currentSegment.startTime;
            segmentDuration = currentSegment.endTime - currentSegment.startTime;
            segmentElement.style.cursor = 'grabbing';
            
            // Add selected class
            document.querySelectorAll('.segment').forEach(s => s.classList.remove('selected'));
            segmentElement.classList.add('selected');
        });
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const waveformContainer = document.getElementById('waveform-container');
            const rect = waveformContainer.getBoundingClientRect();
            
            // Get the latest segment data (in case it was updated)
            const currentSegment = this.app.segmentManager.getSegment(segmentIndex);
            if (!currentSegment) return;
            
            // Account for zoom and offset
            const zoom = this.app.waveformRenderer.zoom;
            const offset = this.app.waveformRenderer.offset;
            const visibleStart = offset * audioDuration;
            const visibleDuration = audioDuration / zoom;
            
            const deltaX = e.clientX - dragStartX;
            const deltaTime = (deltaX / rect.width) * visibleDuration;
            
            let newStart = segmentStartTime + deltaTime;
            
            // Snap to 0.1 second grid
            newStart = Math.round(newStart * 10) / 10;
            
            // Clamp to valid range
            newStart = Math.max(0, Math.min(newStart, audioDuration - segmentDuration));
            const newEnd = newStart + segmentDuration;
            
            // Update the segment in the manager
            this.app.segmentManager.updateSegment(segmentIndex, newStart, newEnd, currentSegment.code);
            
            // Re-render timeline and waveform
            this.app.renderTimeline();
            this.app.waveformRenderer.draw(this.app.segmentManager.getSegments());
        };
        
        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                segmentElement.style.cursor = 'pointer';
                this.app.sortSegments();
            }
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
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
