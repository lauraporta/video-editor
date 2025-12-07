/**
 * Hydra Video Editor - Main Application Module
 * A timeline-based video editor using Hydra synth for visuals
 */

import { HydraManager } from './hydra-manager.js';
import { AudioManager } from './audio-manager.js';
import { WaveformRenderer } from './waveform-renderer.js';
import { MediaManager } from './media-manager.js';
import { SegmentManager } from './segment-manager.js';
import { ProjectManager } from './project-manager.js';
import { UIController } from './ui-controller.js';
import { formatTime, validateSegmentTimes } from './utils.js';

class HydraVideoEditor {
    constructor() {
        // Initialize managers
        this.hydraManager = new HydraManager();
        this.audioManager = new AudioManager();
        this.mediaManager = new MediaManager();
        this.projectManager = new ProjectManager();
        
        // Initialize segment manager after hydra manager
        this.segmentManager = new SegmentManager(this.hydraManager);
        
        // Initialize waveform renderer
        this.waveformRenderer = new WaveformRenderer(this.audioManager);
        
        // Initialize UI controller
        this.uiController = new UIController(this);
        
        // Initialize Hydra
        this.hydraManager.init();
        
        // Setup audio event listeners
        this.setupAudioListeners();
        
        // Set default visual
        setTimeout(() => {
            if (this.segmentManager.getSegments().length === 0) {
                this.segmentManager.executeDefaultVisual();
            }
        }, 200);
        
        console.log('Hydra Video Editor initialized');
        console.log('Available sources: s0-s7 for custom media');
        console.log('Use arrays with .smooth() for transitions');
    }

    /**
     * Setup audio event listeners
     */
    setupAudioListeners() {
        this.audioManager.on('ended', () => {
            this.stop();
        });

        this.audioManager.on('timeupdate', () => {
            this.updatePlayhead();
            this.updateActiveSegment();
        });
    }

    /**
     * Load audio file
     * @param {File} file - Audio file
     * @param {FileSystemFileHandle} fileHandle - Optional file handle
     */
    async loadAudioFile(file, fileHandle = null) {
        try {
            const filename = await this.audioManager.loadFile(file);
            const audioPath = file.path || file.webkitRelativePath || filename;
            this.projectManager.setAudioPath(audioPath);
            
            // Store file handle if provided
            if (fileHandle) {
                this.projectManager.setAudioFileHandle(fileHandle);
            }
            
            this.waveformRenderer.draw(this.segmentManager.getSegments());
            
            // Update audio info in UI
            const duration = this.audioManager.getDuration();
            this.uiController.updateAudioInfo(file.name, duration);
        } catch (error) {
            console.error('Error loading audio:', error);
            alert('Error loading audio file');
        }
    }

    /**
     * Load audio file with file picker
     */
    async loadAudioWithPicker() {
        try {
            const file = await this.projectManager.requestAudioFileAccess();
            await this.loadAudioFile(file, this.projectManager.audioFileHandle);
        } catch (error) {
            // Error already logged in projectManager
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (this.audioManager.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Play audio
     */
    async play() {
        if (!this.audioManager.audioBuffer) {
            alert('Please load an audio file first');
            return;
        }

        try {
            await this.audioManager.play();
            this.uiController.updatePlayPauseButton(true);
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    }

    /**
     * Pause audio
     */
    pause() {
        this.audioManager.pause();
        this.uiController.updatePlayPauseButton(false);
    }

    /**
     * Stop audio
     */
    stop() {
        this.audioManager.stop();
        this.segmentManager.resetCurrentSegment();
        this.uiController.updatePlayPauseButton(false);
        this.updatePlayhead();
        this.renderTimeline();
    }

    /**
     * Update playhead position
     */
    updatePlayhead() {
        const duration = this.audioManager.getDuration();
        if (!duration) return;

        const currentTime = this.audioManager.getCurrentTime();
        
        // Calculate playhead position accounting for zoom and offset
        const zoom = this.waveformRenderer.zoom;
        const offset = this.waveformRenderer.offset;
        const visibleStart = offset * duration;
        const visibleDuration = duration / zoom;
        
        const progress = (currentTime - visibleStart) / visibleDuration;
        this.uiController.updatePlayhead(progress);

        const current = formatTime(currentTime);
        const total = formatTime(duration);
        this.uiController.updateTimeDisplay(current, total);
    }

    /**
     * Update active segment
     */
    updateActiveSegment() {
        const currentTime = this.audioManager.getCurrentTime();
        const changed = this.segmentManager.updateActiveSegment(currentTime);
        
        if (changed) {
            this.renderTimeline();
            
            // Clear any previous errors on successful segment change
            if (this.segmentManager.getCurrentSegmentIndex() >= 0) {
                this.uiController.clearError();
            }
        }
    }

    /**
     * Seek from waveform click
     * @param {MouseEvent} e - Click event
     */
    seekFromWaveform(e) {
        const duration = this.audioManager.getDuration();
        if (!duration) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = x / rect.width;
        this.audioManager.setCurrentTime(progress * duration);
    }

    /**
     * Zoom in waveform
     */
    waveformZoomIn() {
        this.waveformRenderer.zoomIn();
        this.updateZoomDisplay();
        this.waveformRenderer.draw(this.segmentManager.getSegments());
    }

    /**
     * Zoom out waveform
     */
    waveformZoomOut() {
        this.waveformRenderer.zoomOut();
        this.updateZoomDisplay();
        this.waveformRenderer.draw(this.segmentManager.getSegments());
    }

    /**
     * Reset waveform view
     */
    waveformResetView() {
        this.waveformRenderer.resetView();
        this.updateZoomDisplay();
        this.waveformRenderer.draw(this.segmentManager.getSegments());
    }

    /**
     * Handle waveform pan
     * @param {MouseEvent} e - Mouse event
     */
    waveformPan(e) {
        if (!this.audioManager.audioBuffer) return;
        
        const deltaX = e.clientX - this.waveformRenderer.lastPanX;
        const container = document.getElementById('waveform-container');
        this.waveformRenderer.pan(deltaX, container.offsetWidth);
        this.waveformRenderer.lastPanX = e.clientX;
        this.waveformRenderer.draw(this.segmentManager.getSegments());
    }

    /**
     * Handle waveform wheel
     * @param {WheelEvent} e - Wheel event
     */
    waveformWheel(e) {
        if (!this.audioManager.audioBuffer) return;
        
        this.waveformRenderer.handleWheel(e);
        this.updateZoomDisplay();
        this.waveformRenderer.draw(this.segmentManager.getSegments());
    }

    /**
     * Update zoom display
     */
    updateZoomDisplay() {
        const text = this.waveformRenderer.getZoomDisplay();
        this.uiController.updateZoomDisplay(text);
    }

    /**
     * Add media source
     * @param {string} type - 'video' or 'image'
     * @param {File} file - Media file
     */
    addMediaSource(type, file) {
        this.mediaManager.addSource(type, file);
        this.renderMediaSources();
    }

    /**
     * Render media sources
     */
    renderMediaSources() {
        const sources = this.mediaManager.getSources();
        this.uiController.renderMediaSources(sources);
    }

    /**
     * Add or update segment
     */
    addOrUpdateSegment() {
        const inputs = this.uiController.getSegmentInputs();
        
        if (!inputs.code) {
            alert('Please enter Hydra code for the segment');
            return;
        }

        const validation = validateSegmentTimes(inputs.start, inputs.end);
        if (!validation.valid) {
            alert(validation.message);
            return;
        }

        const editingIndex = this.segmentManager.getEditingSegmentIndex();
        
        if (editingIndex >= 0) {
            // Update existing segment
            this.segmentManager.updateSegment(editingIndex, inputs.start, inputs.end, inputs.code);
            this.cancelEdit();
        } else {
            // Add new segment
            this.segmentManager.addSegment(inputs.start, inputs.end, inputs.code);
            
            // Auto-increment for next segment
            this.uiController.clearSegmentInputs(inputs.end, inputs.end + 6);
        }

        this.sortSegments();
    }

    /**
     * Cancel edit mode
     */
    cancelEdit() {
        this.segmentManager.setEditingSegmentIndex(-1);
        this.uiController.setEditMode(false);
        
        const segments = this.segmentManager.getSegments();
        const defaultStart = segments.length > 0 ? segments[segments.length - 1].endTime : 0;
        const defaultEnd = defaultStart + 6;
        this.uiController.clearSegmentInputs(defaultStart, defaultEnd);
        
        this.renderTimeline();
    }

    /**
     * Edit segment
     * @param {number} index - Segment index
     */
    editSegment(index) {
        const segment = this.segmentManager.getSegment(index);
        
        this.segmentManager.setEditingSegmentIndex(index);
        this.uiController.setEditMode(true, index);
        this.uiController.loadSegmentIntoInputs(segment);
        this.renderTimeline();
    }

    /**
     * Delete segment
     * @param {number} index - Segment index
     */
    deleteSegment(index) {
        if (confirm('Delete this segment?')) {
            this.segmentManager.deleteSegment(index);
            this.renderTimeline();
            this.waveformRenderer.draw(this.segmentManager.getSegments());
        }
    }

    /**
     * Sort segments by start time
     */
    sortSegments() {
        this.segmentManager.sortSegments();
        this.renderTimeline();
        this.waveformRenderer.draw(this.segmentManager.getSegments());
    }

    /**
     * Render timeline
     */
    renderTimeline() {
        const segments = this.segmentManager.getSegments();
        const currentIndex = this.segmentManager.getCurrentSegmentIndex();
        const editingIndex = this.segmentManager.getEditingSegmentIndex();
        
        this.uiController.renderTimeline(
            segments,
            currentIndex,
            editingIndex,
            (index) => this.deleteSegment(index),
            (index) => this.editSegment(index)
        );
    }

    /**
     * Clear error display
     */
    clearError() {
        this.uiController.clearError();
    }

    /**
     * Save project
     */
    saveProject() {
        const data = {
            audioDuration: this.audioManager.getDuration(),
            mediaSources: this.mediaManager.export(),
            segments: this.segmentManager.export(),
            waveformView: {
                zoom: this.waveformRenderer.zoom,
                offset: this.waveformRenderer.offset,
                amplitude: this.waveformRenderer.amplitude
            }
        };
        
        this.projectManager.save(data);
    }

    /**
     * Set canvas size
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    setCanvasSize(width, height) {
        this.hydraManager.setCanvasSize(width, height);
        const resolutionDisplay = document.getElementById('current-resolution');
        if (resolutionDisplay) {
            resolutionDisplay.textContent = `Current: ${width}×${height}`;
        }
    }

    /**
     * Load project
     * @param {File} file - Project file
     */
    async loadProject(file) {
        try {
            const project = await this.projectManager.load(file);
            
            // Clear current state
            this.segmentManager.clear();
            this.mediaManager.clear();
            this.projectManager.clearMediaFileHandles();
            
            // Load project data
            this.segmentManager.import(project.segments);
            
            // Restore waveform view
            if (project.waveformView) {
                this.waveformRenderer.zoom = project.waveformView.zoom || 1.0;
                this.waveformRenderer.offset = project.waveformView.offset || 0;
                this.waveformRenderer.amplitude = project.waveformView.amplitude || 1.0;
                this.updateZoomDisplay();
            }
            
            // Attempt to restore files from IndexedDB handles
            if (project.storedHandles) {
                // Try to restore audio
                if (project.storedHandles.audio) {
                    try {
                        this.projectManager.audioFileHandle = project.storedHandles.audio;
                        const audioFile = await this.projectManager.getAudioFile();
                        await this.loadAudioFile(audioFile, this.projectManager.audioFileHandle);
                        console.log('✓ Audio file restored');
                    } catch (error) {
                        console.log('Could not restore audio file:', error.message);
                        console.log(`Please reload audio file: ${project.audioName}`);
                    }
                }
                
                // Try to restore media files
                if (project.storedHandles.media && project.storedHandles.media.length > 0) {
                    try {
                        this.projectManager.mediaFileHandles = project.storedHandles.media;
                        const mediaFiles = await this.projectManager.getMediaFiles();
                        for (const mediaFile of mediaFiles) {
                            const type = mediaFile.type.startsWith('video/') ? 'video' : 'image';
                            this.addMediaSource(type, mediaFile);
                        }
                        console.log(`✓ ${mediaFiles.length} media file(s) restored`);
                    } catch (error) {
                        console.log('Could not restore some media files');
                    }
                }
            }
            
            // Render UI
            this.renderTimeline();
            this.renderMediaSources();
            
            if (this.audioManager.audioBuffer) {
                this.waveformRenderer.draw(this.segmentManager.getSegments());
            }
            
            const segmentCount = this.segmentManager.getSegments().length;
            console.log(`✓ Project loaded: ${segmentCount} segments`);
            
        } catch (error) {
            console.error('Error loading project:', error);
            alert('Error loading project file');
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new HydraVideoEditor();
});
