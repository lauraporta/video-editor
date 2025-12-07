// Hydra Video Editor - Main Application
// A timeline-based video editor using Hydra synth for visuals

class HydraVideoEditor {
    constructor() {
        this.hydra = null;
        this.audio = new Audio();
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.audioAnalyser = null;
        this.audioDataArray = null;
        this.segments = [];
        this.mediaSources = [];
        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;
        this.currentSegmentIndex = -1;
        this.editingSegmentIndex = -1; // -1 = add mode, >= 0 = edit mode
        this.animationFrameId = null;
        
        // Waveform zoom/pan state
        this.waveformZoom = 1.0;
        this.waveformOffset = 0;
        this.waveformAmplitude = 1.0;
        this.isPanning = false;
        this.lastPanX = 0;
        
        // Project state
        this.projectAudioPath = '';
        this.projectName = 'untitled';
        
        this.initHydra();
        this.initAudio();
        this.initUI();
        this.initSplitter();
    }

    initHydra() {
        // Initialize Hydra with custom settings
        this.hydra = new Hydra({
            canvas: document.getElementById('hydra-canvas'),
            detectAudio: false,
            autoLoop: true, // Let Hydra handle the loop - this is important!
            numSources: 8, // Support up to 8 custom sources
            numOutputs: 4,
            makeGlobal: true, // Makes Hydra functions available globally
            enableStreamCapture: true
        });

        console.log('Hydra initialized with 8 sources');
        
        // Give Hydra a moment to initialize, then start with a default visual
        setTimeout(() => {
            try {
                osc(10, 0.1, 1).out();
                console.log('Default visual loaded');
            } catch (error) {
                console.error('Error loading default visual:', error);
            }
        }, 100);
    }

    initAudio() {
        // Audio file loading
        document.getElementById('audio-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadAudioFile(file);
            }
        });

        // Playback controls
        document.getElementById('play-pause').addEventListener('click', () => {
            this.togglePlayPause();
        });

        document.getElementById('stop').addEventListener('click', () => {
            this.stop();
        });

        // Audio ended event
        this.audio.addEventListener('ended', () => {
            this.stop();
        });

        // Update playhead during playback
        this.audio.addEventListener('timeupdate', () => {
            this.updatePlayhead();
            this.updateActiveSegment();
        });
    }

    async loadAudioFile(file) {
        try {
            // Create audio context if not exists
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Load audio file
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Set audio source
            const url = URL.createObjectURL(file);
            this.audio.src = url;
            
            // Store audio file path for project saving
            this.projectAudioPath = file.name;
            
            // Set up audio analysis for reactivity
            this.setupAudioAnalysis();

            // Draw waveform
            this.drawWaveform();

            console.log(`Audio loaded: ${file.name}, duration: ${this.audioBuffer.duration}s`);
            console.log('🎵 Audio reactivity enabled - use a.fft[] in your Hydra code');
        } catch (error) {
            console.error('Error loading audio:', error);
            alert('Error loading audio file');
        }
    }

    setupAudioAnalysis() {
        // Create analyser node for FFT analysis
        this.audioAnalyser = this.audioContext.createAnalyser();
        this.audioAnalyser.fftSize = 2048;
        this.audioAnalyser.smoothingTimeConstant = 0.8;
        
        const bufferLength = this.audioAnalyser.frequencyBinCount;
        this.audioDataArray = new Uint8Array(bufferLength);
        
        // Create media element source from audio element
        if (this.audioSource) {
            this.audioSource.disconnect();
        }
        this.audioSource = this.audioContext.createMediaElementSource(this.audio);
        
        // Connect: source → analyser → destination
        this.audioSource.connect(this.audioAnalyser);
        this.audioAnalyser.connect(this.audioContext.destination);
        
        // Create global 'a' object for Hydra (like detectAudio does)
        window.a = {
            fft: new Array(4).fill(0),
            time: 0
        };
        
        // Start continuous FFT analysis
        this.updateAudioAnalysis();
        
        console.log('✓ Audio analysis setup complete');
    }

    updateAudioAnalysis() {
        if (!this.audioAnalyser) {
            requestAnimationFrame(() => this.updateAudioAnalysis());
            return;
        }
        
        // Get frequency data
        this.audioAnalyser.getByteFrequencyData(this.audioDataArray);
        
        // Map to 4 frequency bands (like Hydra's default)
        // Bass, low-mid, mid-high, treble
        const bands = 4;
        const samplesPerBand = Math.floor(this.audioDataArray.length / bands);
        
        for (let i = 0; i < bands; i++) {
            let sum = 0;
            for (let j = 0; j < samplesPerBand; j++) {
                sum += this.audioDataArray[i * samplesPerBand + j];
            }
            // Normalize to 0-1 range
            window.a.fft[i] = (sum / samplesPerBand) / 255;
        }
        
        // Update time
        if (this.audio.currentTime) {
            window.a.time = this.audio.currentTime;
        }
        
        // Continue loop
        requestAnimationFrame(() => this.updateAudioAnalysis());
    }

    drawWaveform() {
        const canvas = document.getElementById('waveform');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Get audio data with zoom/pan
        const data = this.audioBuffer.getChannelData(0);
        const visibleLength = data.length / this.waveformZoom;
        const startSample = Math.floor(this.waveformOffset * data.length);
        const endSample = Math.min(startSample + visibleLength, data.length);
        
        const step = Math.ceil((endSample - startSample) / canvas.width);
        const amp = (canvas.height / 2) * this.waveformAmplitude;

        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;

        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0;
            let max = -1.0;

            for (let j = 0; j < step; j++) {
                const sampleIndex = startSample + (i * step) + j;
                if (sampleIndex >= data.length) break;
                const datum = data[sampleIndex];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }

            ctx.moveTo(i, (1 + min) * amp);
            ctx.lineTo(i, (1 + max) * amp);
        }

        ctx.stroke();

        // Draw segment markers
        this.drawSegmentMarkers(ctx, canvas);
    }

    drawSegmentMarkers(ctx, canvas) {
        if (!this.audioBuffer) return;

        const duration = this.audioBuffer.duration;
        const visibleStart = this.waveformOffset * duration;
        const visibleEnd = visibleStart + (duration / this.waveformZoom);

        this.segments.forEach(segment => {
            // Skip segments outside visible range
            if (segment.endTime < visibleStart || segment.startTime > visibleEnd) return;
            
            const startX = ((segment.startTime - visibleStart) / (visibleEnd - visibleStart)) * canvas.width;
            const endX = ((segment.endTime - visibleStart) / (visibleEnd - visibleStart)) * canvas.width;

            // Draw segment region
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(startX, 0, endX - startX, canvas.height);

            // Draw start line
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(startX, 0);
            ctx.lineTo(startX, canvas.height);
            ctx.stroke();

            // Draw end line
            ctx.strokeStyle = '#666';
            ctx.beginPath();
            ctx.moveTo(endX, 0);
            ctx.lineTo(endX, canvas.height);
            ctx.stroke();
        });
    }

    updatePlayhead() {
        if (!this.audioBuffer) return;

        const playhead = document.getElementById('playhead');
        const progress = this.audio.currentTime / this.audioBuffer.duration;
        playhead.style.left = `${progress * 100}%`;

        // Update time display
        const current = this.formatTime(this.audio.currentTime);
        const total = this.formatTime(this.audioBuffer.duration);
        document.getElementById('time-display').textContent = `${current} / ${total}`;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (!this.audioBuffer) {
            alert('Please load an audio file first');
            return;
        }

        // Resume audio context (required by browser autoplay policies)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.audio.play();
        this.isPlaying = true;
        document.getElementById('play-pause').textContent = 'Pause';
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        document.getElementById('play-pause').textContent = 'Play';
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.currentSegmentIndex = -1;
        document.getElementById('play-pause').textContent = 'Play';
        this.updatePlayhead();
        this.renderTimeline();
    }

    updateActiveSegment() {
        const currentTime = this.audio.currentTime;
        let activeIndex = -1;

        // Find the active segment
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            if (currentTime >= segment.startTime && currentTime < segment.endTime) {
                activeIndex = i;
                break;
            }
        }

        // If segment changed, execute its code
        if (activeIndex !== this.currentSegmentIndex) {
            if (activeIndex >= 0) {
                this.executeSegment(this.segments[activeIndex], activeIndex);
            }
            this.currentSegmentIndex = activeIndex;
            this.renderTimeline();
        }
    }

    executeSegment(segment, segmentIndex) {
        try {
            console.log(`Executing segment ${segmentIndex}: ${segment.startTime}s - ${segment.endTime}s`);
            
            // LIVE CODING MODE:
            // Execute code without clearing previous state
            // Each segment can reference outputs from previous segments (o0, o1, o2, o3)
            // This creates organic, code-driven transitions
            // Perfect for .modulate(), .blend(), and feedback loops
            
            const executeCode = new Function(segment.code);
            executeCode();
            
            // Clear any previous errors on successful execution
            this.clearError();
            
            console.log('✓ Segment executed - previous outputs preserved for live coding');
            
        } catch (error) {
            console.error('✗ Error executing segment:', error);
            console.error('Code:', segment.code);
            this.showError(error.message, segment, segmentIndex);
        }
    }

    showError(message, segment, index) {
        const errorSection = document.getElementById('error-section');
        const errorDisplay = document.getElementById('error-display');
        
        errorSection.style.display = 'block';
        errorDisplay.innerHTML = `<strong>Segment ${index} (${segment.startTime}s - ${segment.endTime}s):</strong>
${message}

<strong>Code:</strong>
${segment.code}`;
        
        // Scroll error into view
        errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    clearError() {
        const errorSection = document.getElementById('error-section');
        if (errorSection) {
            errorSection.style.display = 'none';
            document.getElementById('error-display').innerHTML = '';
        }
    }

    initUI() {
        // Media source loading
        document.getElementById('video-file').addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                this.addMediaSource('video', file);
            });
        });

        document.getElementById('image-file').addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                this.addMediaSource('image', file);
            });
        });

        // Segment controls
        document.getElementById('add-segment').addEventListener('click', () => {
            this.addSegment();
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.cancelEdit();
        });

        document.getElementById('sort-segments').addEventListener('click', () => {
            this.sortSegments();
        });

        document.getElementById('clear-error').addEventListener('click', () => {
            this.clearError();
        });

        // Waveform click to seek
        document.getElementById('waveform-container').addEventListener('click', (e) => {
            if (!this.audioBuffer || this.isPanning) return;
            
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const progress = x / rect.width;
            this.audio.currentTime = progress * this.audioBuffer.duration;
        });
        
        // Waveform zoom/pan controls
        this.initWaveformControls();
        
        // Project save/load
        document.getElementById('save-project').addEventListener('click', () => {
            this.saveProject();
        });
        
        document.getElementById('load-project').addEventListener('click', () => {
            document.getElementById('project-file').click();
        });
        
        document.getElementById('project-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadProject(file);
            }
        });
    }

    initWaveformControls() {
        const container = document.getElementById('waveform-container');
        
        // Zoom buttons
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.waveformZoom = Math.min(this.waveformZoom * 1.5, 20);
            this.updateZoomDisplay();
            if (this.audioBuffer) this.drawWaveform();
        });
        
        document.getElementById('zoom-out').addEventListener('click', () => {
            this.waveformZoom = Math.max(this.waveformZoom / 1.5, 1);
            this.waveformOffset = Math.max(0, Math.min(this.waveformOffset, 1 - 1/this.waveformZoom));
            this.updateZoomDisplay();
            if (this.audioBuffer) this.drawWaveform();
        });
        
        document.getElementById('reset-view').addEventListener('click', () => {
            this.waveformZoom = 1.0;
            this.waveformOffset = 0;
            this.waveformAmplitude = 1.0;
            this.updateZoomDisplay();
            if (this.audioBuffer) this.drawWaveform();
        });
        
        // Mouse/trackpad pan
        container.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isPanning = true;
                this.lastPanX = e.clientX;
                e.preventDefault();
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isPanning && this.audioBuffer) {
                const deltaX = e.clientX - this.lastPanX;
                const panAmount = deltaX / container.offsetWidth;
                this.waveformOffset -= panAmount / this.waveformZoom;
                this.waveformOffset = Math.max(0, Math.min(this.waveformOffset, 1 - 1/this.waveformZoom));
                this.lastPanX = e.clientX;
                this.drawWaveform();
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.isPanning = false;
        });
        
        // Wheel zoom (trackpad pinch)
        container.addEventListener('wheel', (e) => {
            if (!this.audioBuffer) return;
            e.preventDefault();
            
            // Zoom with ctrl/cmd or vertical scroll
            if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
                this.waveformZoom = Math.max(1, Math.min(this.waveformZoom * zoomDelta, 20));
                this.waveformOffset = Math.max(0, Math.min(this.waveformOffset, 1 - 1/this.waveformZoom));
            }
            // Amplitude with shift
            else if (e.shiftKey) {
                const ampDelta = e.deltaY > 0 ? 0.9 : 1.1;
                this.waveformAmplitude = Math.max(0.1, Math.min(this.waveformAmplitude * ampDelta, 5));
            }
            // Pan horizontally
            else {
                const panAmount = e.deltaX / container.offsetWidth;
                this.waveformOffset += panAmount / this.waveformZoom;
                this.waveformOffset = Math.max(0, Math.min(this.waveformOffset, 1 - 1/this.waveformZoom));
            }
            
            this.updateZoomDisplay();
            this.drawWaveform();
        }, { passive: false });
    }
    
    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoom-level');
        zoomLevel.textContent = `Zoom: ${this.waveformZoom.toFixed(1)}x | Amp: ${this.waveformAmplitude.toFixed(1)}x`;
    }

    addMediaSource(type, file) {
        const url = URL.createObjectURL(file);
        const index = this.mediaSources.length;
        
        this.mediaSources.push({
            type,
            file: file.name,
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

        this.renderMediaSources();
        console.log(`Added ${type} source s${index}: ${file.name}`);
    }

    renderMediaSources() {
        const container = document.getElementById('sources-list');
        container.innerHTML = '';

        this.mediaSources.forEach(source => {
            const div = document.createElement('div');
            div.className = `source-item ${source.type}`;
            
            // Create preview element
            if (source.type === 'video') {
                const video = document.createElement('video');
                video.className = 'source-preview';
                video.src = source.url;
                video.muted = true;
                video.currentTime = 1; // Show frame at 1 second
                div.appendChild(video);
            } else if (source.type === 'image') {
                const img = document.createElement('img');
                img.className = 'source-preview';
                img.src = source.url;
                div.appendChild(img);
            }
            
            // Add label
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

    addSegment() {
        const start = parseFloat(document.getElementById('segment-start').value);
        const end = parseFloat(document.getElementById('segment-end').value);
        const code = document.getElementById('segment-code').value.trim();

        if (!code) {
            alert('Please enter Hydra code for the segment');
            return;
        }

        if (start >= end) {
            alert('Start time must be less than end time');
            return;
        }

        // Check if we're in edit mode
        if (this.editingSegmentIndex >= 0) {
            // UPDATE existing segment
            this.segments[this.editingSegmentIndex] = {
                startTime: start,
                endTime: end,
                code: code
            };
            console.log(`Updated segment ${this.editingSegmentIndex}: ${start}s - ${end}s`);
            this.cancelEdit();
        } else {
            // ADD new segment
            this.segments.push({
                startTime: start,
                endTime: end,
                code: code
            });
            console.log(`Added segment: ${start}s - ${end}s`);
            
            // Clear inputs
            document.getElementById('segment-code').value = '';
            
            // Auto-increment for next segment
            document.getElementById('segment-start').value = end;
            document.getElementById('segment-end').value = end + 6;
        }

        this.sortSegments();
    }

    cancelEdit() {
        // Exit edit mode
        this.editingSegmentIndex = -1;
        
        // Reset UI
        document.getElementById('add-segment').textContent = 'Add Segment';
        document.getElementById('cancel-edit').style.display = 'none';
        document.getElementById('edit-mode-indicator').textContent = '';
        
        // Clear inputs
        document.getElementById('segment-code').value = '';
        document.getElementById('segment-start').value = this.segments.length > 0 
            ? this.segments[this.segments.length - 1].endTime 
            : 0;
        document.getElementById('segment-end').value = this.segments.length > 0 
            ? this.segments[this.segments.length - 1].endTime + 6 
            : 6;
        
        // Re-render timeline to remove editing highlight
        this.renderTimeline();
    }

    sortSegments() {
        this.segments.sort((a, b) => a.startTime - b.startTime);
        this.renderTimeline();
        
        // Redraw waveform to update markers
        if (this.audioBuffer) {
            this.drawWaveform();
        }
    }

    renderTimeline() {
        const container = document.getElementById('timeline');
        container.innerHTML = '';

        this.segments.forEach((segment, index) => {
            const div = document.createElement('div');
            div.className = 'segment';
            
            if (index === this.currentSegmentIndex) {
                div.classList.add('active');
            }
            
            if (index === this.editingSegmentIndex) {
                div.classList.add('editing');
            }

            div.innerHTML = `
                <div class="segment-header">
                    <span class="segment-time">
                        ${segment.startTime.toFixed(1)}s - ${segment.endTime.toFixed(1)}s
                    </span>
                    <button class="segment-delete" data-index="${index}">Delete</button>
                </div>
                <textarea readonly>${segment.code}</textarea>
            `;

            // Delete button
            div.querySelector('.segment-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSegment(index);
            });

            // Single click to edit (not just double-click)
            div.addEventListener('click', () => {
                this.editSegment(index);
            });

            container.appendChild(div);
        });
    }

    deleteSegment(index) {
        if (confirm('Delete this segment?')) {
            this.segments.splice(index, 1);
            this.renderTimeline();
            
            if (this.audioBuffer) {
                this.drawWaveform();
            }
        }
    }

    editSegment(index) {
        const segment = this.segments[index];
        
        // Enter edit mode
        this.editingSegmentIndex = index;
        
        // Load segment data into inputs
        document.getElementById('segment-start').value = segment.startTime;
        document.getElementById('segment-end').value = segment.endTime;
        document.getElementById('segment-code').value = segment.code;
        
        // Update UI to show edit mode
        document.getElementById('add-segment').textContent = 'Update Segment';
        document.getElementById('cancel-edit').style.display = 'inline-block';
        document.getElementById('edit-mode-indicator').textContent = `(Editing segment ${index})`;
        
        // Scroll to inputs
        document.getElementById('segment-code').scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('segment-code').focus();
        
        // Re-render timeline to show editing highlight
        this.renderTimeline();
    }

    initSplitter() {
        const splitter = document.getElementById('splitter');
        const container = document.getElementById('hydra-container');
        const controls = document.getElementById('controls');
        
        let isResizing = false;

        splitter.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'ns-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const totalHeight = window.innerHeight;
            const newContainerHeight = e.clientY;
            const containerPercent = (newContainerHeight / totalHeight) * 100;

            if (containerPercent > 20 && containerPercent < 80) {
                container.style.flex = `0 0 ${containerPercent}%`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
            }
        });
    }
    
    saveProject() {
        const project = {
            version: '1.0',
            name: this.projectName,
            created: new Date().toISOString(),
            audio: {
                path: this.projectAudioPath,
                duration: this.audioBuffer ? this.audioBuffer.duration : 0
            },
            mediaSources: this.mediaSources.map(source => ({
                type: source.type,
                file: source.file,
                index: source.index
                // Note: URLs are local and won't transfer between sessions
            })),
            segments: this.segments.map(segment => ({
                startTime: segment.startTime,
                endTime: segment.endTime,
                code: segment.code
            })),
            waveformView: {
                zoom: this.waveformZoom,
                offset: this.waveformOffset,
                amplitude: this.waveformAmplitude
            }
        };
        
        const json = JSON.stringify(project, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.projectName || 'hydra-project'}_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('✓ Project saved');
    }
    
    async loadProject(file) {
        try {
            const text = await file.text();
            const project = JSON.parse(text);
            
            console.log('Loading project:', project.name);
            
            // Clear current state
            this.segments = [];
            this.mediaSources = [];
            this.currentSegmentIndex = -1;
            this.editingSegmentIndex = -1;
            
            // Restore project name
            this.projectName = project.name || 'loaded-project';
            
            // Load segments
            if (project.segments) {
                this.segments = project.segments.map(seg => ({
                    startTime: seg.startTime,
                    endTime: seg.endTime,
                    code: seg.code
                }));
            }
            
            // Restore waveform view
            if (project.waveformView) {
                this.waveformZoom = project.waveformView.zoom || 1.0;
                this.waveformOffset = project.waveformView.offset || 0;
                this.waveformAmplitude = project.waveformView.amplitude || 1.0;
                this.updateZoomDisplay();
            }
            
            // Render UI
            this.renderTimeline();
            this.renderMediaSources();
            
            if (this.audioBuffer) {
                this.drawWaveform();
            }
            
            console.log(`✓ Project loaded: ${this.segments.length} segments`);
            console.log('⚠ Note: Audio and media files must be reloaded manually');
            
            alert(`Project loaded!\n\nSegments: ${this.segments.length}\n\nPlease reload:\n- Audio file\n- Media sources (videos/images)`);
            
        } catch (error) {
            console.error('Error loading project:', error);
            alert('Error loading project file');
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new HydraVideoEditor();
    console.log('Hydra Video Editor initialized');
    console.log('Available sources: s0-s7 for custom media');
    console.log('Use arrays with .smooth() for transitions');
});
