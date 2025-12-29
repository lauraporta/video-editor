/**
 * Segment Manager Module
 * Handles timeline segments and their execution
 */

export class SegmentManager {
    constructor(hydraManager) {
        this.hydraManager = hydraManager;
        this.segments = [];
        this.currentSegmentIndex = -1;
        this.editingSegmentIndex = -1;
    }

    /**
     * Add a new segment
     * @param {number} startTime - Start time in seconds
     * @param {number} endTime - End time in seconds
     * @param {string} code - Hydra code
     */
    addSegment(startTime, endTime, code) {
        this.segments.push({
            startTime,
            endTime,
            code
        });
        console.log(`Added segment: ${startTime}s - ${endTime}s`);
    }

    /**
     * Update existing segment
     * @param {number} index - Segment index
     * @param {number} startTime - Start time in seconds
     * @param {number} endTime - End time in seconds
     * @param {string} code - Hydra code
     */
    updateSegment(index, startTime, endTime, code) {
        if (index >= 0 && index < this.segments.length) {
            this.segments[index] = { startTime, endTime, code };
            console.log(`Updated segment ${index}: ${startTime}s - ${endTime}s`);
        }
    }

    /**
     * Delete a segment
     * @param {number} index - Segment index
     */
    deleteSegment(index) {
        if (index >= 0 && index < this.segments.length) {
            this.segments.splice(index, 1);
        }
    }

    /**
     * Sort segments by start time
     */
    sortSegments() {
        this.segments.sort((a, b) => a.startTime - b.startTime);
    }

    /**
     * Find active segment for given time
     * @param {number} currentTime - Current playback time
     * @returns {number} Active segment index or -1
     */
    findActiveSegment(currentTime) {
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            if (currentTime >= segment.startTime && currentTime < segment.endTime) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Update active segment based on current time
     * @param {number} currentTime - Current playback time
     * @returns {boolean} True if segment changed
     */
    updateActiveSegment(currentTime) {
        const activeIndex = this.findActiveSegment(currentTime);
        
        if (activeIndex !== this.currentSegmentIndex) {
            if (activeIndex >= 0) {
                this.executeSegment(activeIndex);
            } else if (this.segments.length === 0) {
                // Only show default black if NO segments exist at all
                this.executeDefaultVisual();
            }
            // If segments exist but none active, keep previous visual
            this.currentSegmentIndex = activeIndex;
            return true;
        }
        return false;
    }

    /**
     * Execute default visual when no segments exist
     */
    executeDefaultVisual() {
        try {
            this.hydraManager.executeCode('solid().out()');
            console.log('Default black visual active (no segments)');
        } catch (error) {
            console.error('Error executing default visual:', error);
        }
    }

    /**
     * Execute a segment's Hydra code
     * @param {number} index - Segment index
     * @throws {Error} If execution fails
     */
    executeSegment(index) {
        const segment = this.segments[index];
        console.log(`Executing segment ${index}: ${segment.startTime}s - ${segment.endTime}s`);
        
        // Debug: Check video element states before executing
        console.log('  Video sources state:');
        for (let i = 0; i < 8; i++) {
            const sourceKey = `s${i}`;
            if (window[sourceKey] && window[sourceKey].src) {
                const videoEl = window[sourceKey].src;
                if (videoEl && videoEl.tagName === 'VIDEO') {
                    console.log(`    ${sourceKey}: paused=${videoEl.paused}, currentTime=${videoEl.currentTime.toFixed(2)}s, readyState=${videoEl.readyState}`);
                }
            }
        }
        
        this.hydraManager.executeCode(segment.code);
        console.log('✓ Segment executed - previous outputs preserved for live coding');
    }

    /**
     * Get all segments
     * @returns {Array} Array of segments
     */
    getSegments() {
        return this.segments;
    }

    /**
     * Get segment by index
     * @param {number} index - Segment index
     * @returns {Object} Segment object
     */
    getSegment(index) {
        return this.segments[index];
    }

    /**
     * Get current segment index
     * @returns {number} Current segment index
     */
    getCurrentSegmentIndex() {
        return this.currentSegmentIndex;
    }

    /**
     * Get editing segment index
     * @returns {number} Editing segment index
     */
    getEditingSegmentIndex() {
        return this.editingSegmentIndex;
    }

    /**
     * Set editing segment index
     * @param {number} index - Segment index
     */
    setEditingSegmentIndex(index) {
        this.editingSegmentIndex = index;
    }

    /**
     * Reset current segment
     */
    resetCurrentSegment() {
        this.currentSegmentIndex = -1;
    }

    /**
     * Clear all segments
     */
    clear() {
        this.segments = [];
        this.currentSegmentIndex = -1;
        this.editingSegmentIndex = -1;
    }

    /**
     * Export segments for project saving
     * @returns {Array} Serializable segment data
     */
    export() {
        return this.segments.map(segment => ({
            startTime: segment.startTime,
            endTime: segment.endTime,
            code: segment.code
        }));
    }

    /**
     * Import segments from project data
     * @param {Array} segmentData - Segment data to import
     */
    import(segmentData) {
        this.segments = segmentData.map(seg => ({
            startTime: seg.startTime,
            endTime: seg.endTime,
            code: seg.code
        }));
    }
}
