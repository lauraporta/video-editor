/**
 * Media Manager Module
 * Handles video and image media sources for Hydra
 */

export class MediaManager {
    constructor() {
        this.sources = [];
    }

    /**
     * Add a media source
     * @param {string} type - 'video' or 'image'
     * @param {File} file - Media file
     * @returns {number} Source index
     */
    addSource(type, file) {
        const url = URL.createObjectURL(file);
        const index = this.sources.length;
        
        // Store file path if available (for desktop), otherwise store name
        const filePath = file.path || file.webkitRelativePath || file.name;
        
        this.sources.push({
            type,
            file: file.name,
            path: filePath,
            url,
            index
        });

        // Initialize Hydra source
        if (type === 'video') {
            const video = document.createElement('video');
            video.src = url;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.crossOrigin = 'anonymous';
            
            // Add video to DOM (required for Hydra)
            video.style.display = 'none';
            document.body.appendChild(video);
            
            // Store video element reference
            this.sources[index].element = video;
            
            // Wait for video to be ready before initializing Hydra source
            video.addEventListener('loadedmetadata', () => {
                console.log(`Video loaded successfully: ${file.name} (${video.videoWidth}x${video.videoHeight})`);
                console.log(`  readyState: ${video.readyState} (${this.getReadyStateText(video.readyState)})`);
                console.log(`  paused: ${video.paused}`);
                
                // Start playing first
                video.play().then(() => {
                    console.log(`  Video playing started`);
                    console.log(`  readyState after play: ${video.readyState} (${this.getReadyStateText(video.readyState)})`);
                    
                    // Wait for actual frames to be rendered before initializing Hydra
                    // This ensures WebGL has valid texture data
                    requestAnimationFrame(() => {
                        console.log(`  First animation frame`);
                        requestAnimationFrame(() => {
                            console.log(`  Second animation frame - initializing Hydra source`);
                            console.log(`  readyState before init: ${video.readyState} (${this.getReadyStateText(video.readyState)})`);
                            console.log(`  currentTime: ${video.currentTime}`);
                            console.log(`  paused: ${video.paused}`);
                            
                            try {
                                window[`s${index}`].init({ src: video });
                                console.log(`✓ Hydra source s${index} initialized`);
                                
                                // Test if video is actually rendering
                                setTimeout(() => {
                                    console.log(`  [After 500ms] currentTime: ${video.currentTime}, paused: ${video.paused}`);
                                }, 500);
                            } catch (err) {
                                console.error(`Error initializing Hydra source s${index}:`, err);
                            }
                        });
                    });
                }).catch(err => {
                    console.error(`Error playing video ${file.name}:`, err);
                });
            }, { once: true });
            
            video.addEventListener('error', (e) => {
                console.error(`Error loading video ${file.name}:`, e);
                console.error('Video error details:', video.error);
                const errorMsg = video.error?.message || 'Unknown error';
                alert(`Failed to load video: ${file.name}\n\nError: ${errorMsg}\n\nCodec may not be supported.\n\nSupported formats:\n• MP4 (H.264 video codec)\n• WebM (VP8/VP9 codec)\n• OGG (Theora codec)\n\nTip: Convert with ffmpeg:\nffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4`);
            });
            
            // Start loading the video
            video.load();
        } else if (type === 'image') {
            const img = document.createElement('img');
            img.src = url;
            img.onload = () => {
                window[`s${index}`].init({ src: img });
            };
            img.onerror = (e) => {
                console.error(`Error loading image ${file.name}:`, e);
                alert(`Failed to load image: ${file.name}`);
            };
        }

        console.log(`Added ${type} source s${index}: ${file.name}`);
        return index;
    }

    /**
     * Get human-readable text for video readyState
     * @param {number} state - Video readyState value
     * @returns {string} Description
     */
    getReadyStateText(state) {
        const states = {
            0: 'HAVE_NOTHING',
            1: 'HAVE_METADATA',
            2: 'HAVE_CURRENT_DATA',
            3: 'HAVE_FUTURE_DATA',
            4: 'HAVE_ENOUGH_DATA'
        };
        return states[state] || 'UNKNOWN';
    }

    /**
     * Get all sources
     * @returns {Array} Array of source objects
     */
    getSources() {
        return this.sources;
    }

    /**
     * Remove a specific source
     * @param {number} index - Index of source to remove
     */
    removeSource(index) {
        const sourceIndex = this.sources.findIndex(s => s.index === index);
        if (sourceIndex !== -1) {
            const source = this.sources[sourceIndex];
            
            // Remove video element from DOM if it exists
            if (source.element && source.element.parentNode) {
                source.element.pause();
                source.element.src = '';
                source.element.parentNode.removeChild(source.element);
            }
            
            // Revoke object URL to free memory
            URL.revokeObjectURL(source.url);
            this.sources.splice(sourceIndex, 1);
            console.log(`Removed source s${index}`);
        }
    }

    /**
     * Clear all sources
     */
    clear() {
        // Revoke all object URLs and remove video elements
        this.sources.forEach(source => {
            // Remove video element from DOM if it exists
            if (source.element && source.element.parentNode) {
                source.element.pause();
                source.element.src = '';
                source.element.parentNode.removeChild(source.element);
            }
            URL.revokeObjectURL(source.url);
        });
        this.sources = [];
    }

    /**
     * Play all video sources
     */
    playVideos() {
        this.sources.forEach(source => {
            if (source.type === 'video' && source.element) {
                source.element.play().catch(err => {
                    console.error(`Error playing video ${source.file}:`, err);
                });
            }
        });
    }

    /**
     * Pause all video sources
     */
    pauseVideos() {
        this.sources.forEach(source => {
            if (source.type === 'video' && source.element) {
                source.element.pause();
            }
        });
    }

    /**
     * Seek all video sources to a specific time
     * @param {number} time - Time in seconds
     */
    seekVideos(time) {
        this.sources.forEach(source => {
            if (source.type === 'video' && source.element) {
                source.element.currentTime = time;
            }
        });
    }

    /**
     * Export sources for project saving
     * @returns {Array} Serializable source data
     */
    export() {
        return this.sources.map(source => ({
            type: source.type,
            file: source.file,
            path: source.path,
            index: source.index
        }));
    }
}
