/**
 * Waveform Renderer Module
 * Handles waveform visualization and interaction
 */

export class WaveformRenderer {
    // Constants
    static MIN_ZOOM = 1.0;
    static MAX_ZOOM = 20.0;
    static ZOOM_FACTOR = 1.2;
    static ZOOM_FACTOR_WHEEL = 1.03;
    static MIN_AMPLITUDE = 0.1;
    static MAX_AMPLITUDE = 5.0;
    static AMPLITUDE_FACTOR = 1.05;

    constructor(audioManager) {
        this.audioManager = audioManager;
        this.canvas = document.getElementById('waveform');
        this.ctx = this.canvas.getContext('2d');
        
        this.zoom = WaveformRenderer.MIN_ZOOM;
        this.offset = 0;
        this.amplitude = 1.0;
        this.isPanning = false;
        this.lastPanX = 0;
    }

    /**
     * Draw waveform on canvas
     * @param {Array} segments - Timeline segments to overlay
     */
    draw(segments = []) {
        const audioBuffer = this.audioManager.audioBuffer;
        if (!audioBuffer) return;

        // Set canvas size
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;

        // Get audio data with zoom/pan
        const data = audioBuffer.getChannelData(0);
        const { visibleStart, visibleDuration } = this.getVisibleTimeRange();
        const visibleLength = data.length / this.zoom;
        const startSample = Math.floor(this.offset * data.length);
        const endSample = Math.min(startSample + visibleLength, data.length);
        
        const step = Math.ceil((endSample - startSample) / this.canvas.width);
        const amp = (this.canvas.height / 2) * this.amplitude;

        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw timeline ticks and labels
        this.drawTimeline();

        // Draw waveform
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < this.canvas.width; i++) {
            let min = 1.0;
            let max = -1.0;

            for (let j = 0; j < step; j++) {
                const sampleIndex = startSample + (i * step) + j;
                if (sampleIndex >= data.length) break;
                const datum = data[sampleIndex];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }

            this.ctx.moveTo(i, (1 + min) * amp);
            this.ctx.lineTo(i, (1 + max) * amp);
        }

        this.ctx.stroke();

        // Draw segment markers
        this.drawSegmentMarkers(segments);
    }

    /**
     * Draw timeline with second markers and ticks
     */
    drawTimeline() {
        const duration = this.audioManager.getDuration();
        if (!duration) return;

        const { visibleStart, visibleEnd, visibleDuration } = this.getVisibleTimeRange();

        // Determine tick interval based on zoom level
        let tickInterval;
        if (visibleDuration > 60) {
            tickInterval = 10; // 10 second intervals
        } else if (visibleDuration > 20) {
            tickInterval = 5; // 5 second intervals
        } else if (visibleDuration > 10) {
            tickInterval = 2; // 2 second intervals
        } else {
            tickInterval = 1; // 1 second intervals
        }

        // Draw ticks
        const startTick = Math.ceil(visibleStart / tickInterval) * tickInterval;
        
        for (let time = startTick; time <= visibleEnd; time += tickInterval) {
            const x = ((time - visibleStart) / visibleDuration) * this.canvas.width;
            
            // Draw tick line
            this.ctx.strokeStyle = '#555';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
            
            // Draw time label
            this.ctx.fillStyle = '#888';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${time.toFixed(1)}s`, x, 12);
        }
    }

    /**
     * Draw segment markers on waveform
     * @param {Array} segments - Timeline segments
     */
    drawSegmentMarkers(segments) {
        const duration = this.audioManager.getDuration();
        if (!duration) return;

        const { visibleStart, visibleEnd, visibleDuration } = this.getVisibleTimeRange();

        segments.forEach(segment => {
            if (segment.endTime < visibleStart || segment.startTime > visibleEnd) return;
            
            const startX = ((segment.startTime - visibleStart) / visibleDuration) * this.canvas.width;
            const endX = ((segment.endTime - visibleStart) / visibleDuration) * this.canvas.width;

            // Draw segment region
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fillRect(startX, 0, endX - startX, this.canvas.height);

            // Draw start line
            this.ctx.strokeStyle = '#888';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(startX, 0);
            this.ctx.lineTo(startX, this.canvas.height);
            this.ctx.stroke();

            // Draw end line
            this.ctx.strokeStyle = '#666';
            this.ctx.beginPath();
            this.ctx.moveTo(endX, 0);
            this.ctx.lineTo(endX, this.canvas.height);
            this.ctx.stroke();
        });
    }

    /**
     * Zoom in
     */
    zoomIn() {
        this.zoom = Math.min(this.zoom * WaveformRenderer.ZOOM_FACTOR, WaveformRenderer.MAX_ZOOM);
        this.clampOffset();
    }

    /**
     * Zoom out
     */
    zoomOut() {
        this.zoom = Math.max(this.zoom / WaveformRenderer.ZOOM_FACTOR, WaveformRenderer.MIN_ZOOM);
        this.clampOffset();
    }

    /**
     * Reset view to default
     */
    resetView() {
        this.zoom = WaveformRenderer.MIN_ZOOM;
        this.offset = 0;
        this.amplitude = 1.0;
    }

    /**
     * Handle mouse pan
     * @param {number} deltaX - Horizontal delta
     * @param {number} containerWidth - Container width
     */
    pan(deltaX, containerWidth) {
        const panAmount = deltaX / containerWidth;
        this.offset -= panAmount / this.zoom;
        this.clampOffset();
    }

    /**
     * Handle zoom with wheel
     * @param {WheelEvent} e - Wheel event
     */
    handleWheel(e) {
        if (e.shiftKey) {
            // Amplitude zoom with Shift
            const ampDelta = e.deltaY > 0 ? (1 / WaveformRenderer.AMPLITUDE_FACTOR) : WaveformRenderer.AMPLITUDE_FACTOR;
            this.amplitude = Math.max(WaveformRenderer.MIN_AMPLITUDE, Math.min(this.amplitude * ampDelta, WaveformRenderer.MAX_AMPLITUDE));
        } else if (e.ctrlKey || e.metaKey) {
            // Time zoom with Ctrl/Cmd (slower for trackpad)
            const zoomDelta = e.deltaY > 0 ? (1 / WaveformRenderer.ZOOM_FACTOR_WHEEL) : WaveformRenderer.ZOOM_FACTOR_WHEEL;
            this.zoom = Math.max(WaveformRenderer.MIN_ZOOM, Math.min(this.zoom * zoomDelta, WaveformRenderer.MAX_ZOOM));
            this.clampOffset();
        } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            // Vertical scroll = time zoom (slower for trackpad)
            const zoomDelta = e.deltaY > 0 ? (1 / WaveformRenderer.ZOOM_FACTOR_WHEEL) : WaveformRenderer.ZOOM_FACTOR_WHEEL;
            this.zoom = Math.max(WaveformRenderer.MIN_ZOOM, Math.min(this.zoom * zoomDelta, WaveformRenderer.MAX_ZOOM));
            this.clampOffset();
        } else {
            // Horizontal scroll = pan
            const panAmount = e.deltaX / (this.canvas.offsetWidth * 2);
            this.offset += panAmount / this.zoom;
            this.clampOffset();
        }
    }

    /**
     * Get zoom display text
     * @returns {string} Zoom and amplitude info
     */
    getZoomDisplay() {
        return `Zoom: ${this.zoom.toFixed(1)}x | Amp: ${this.amplitude.toFixed(1)}x`;
    }

    /**
     * Get visible time range based on current zoom and offset
     * @returns {Object} Object with visibleStart, visibleEnd, visibleDuration
     */
    getVisibleTimeRange() {
        const duration = this.audioManager.getDuration();
        const visibleStart = this.offset * duration;
        const visibleDuration = duration / this.zoom;
        const visibleEnd = visibleStart + visibleDuration;
        return { visibleStart, visibleEnd, visibleDuration };
    }

    /**
     * Clamp offset to valid range based on current zoom
     */
    clampOffset() {
        this.offset = Math.max(0, Math.min(this.offset, 1 - 1/this.zoom));
    }
}
