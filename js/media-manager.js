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
            window[`s${index}`].init({ src: video });
            video.play();
        } else if (type === 'image') {
            const img = document.createElement('img');
            img.src = url;
            img.onload = () => {
                window[`s${index}`].init({ src: img });
            };
        }

        console.log(`Added ${type} source s${index}: ${file.name}`);
        return index;
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
            // Revoke object URL to free memory
            URL.revokeObjectURL(this.sources[sourceIndex].url);
            this.sources.splice(sourceIndex, 1);
            console.log(`Removed source s${index}`);
        }
    }

    /**
     * Clear all sources
     */
    clear() {
        // Revoke all object URLs to free memory
        this.sources.forEach(source => {
            URL.revokeObjectURL(source.url);
        });
        this.sources = [];
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
