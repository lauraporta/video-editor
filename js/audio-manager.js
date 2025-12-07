/**
 * Audio Manager Module
 * Handles audio loading, playback, and analysis
 */

export class AudioManager {
    constructor() {
        this.audio = new Audio();
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.audioAnalyser = null;
        this.audioDataArray = null;
        this.isPlaying = false;
    }

    /**
     * Load an audio file
     * @param {File} file - Audio file to load
     * @returns {Promise<string>} Audio file name
     */
    async loadFile(file) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const arrayBuffer = await file.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        const url = URL.createObjectURL(file);
        this.audio.src = url;

        this.setupAudioAnalysis();

        console.log(`Audio loaded: ${file.name}, duration: ${this.audioBuffer.duration}s`);
        console.log('🎵 Audio reactivity enabled - use a.fft[] in your Hydra code');

        return file.name;
    }

    /**
     * Set up audio analysis for FFT reactivity
     */
    setupAudioAnalysis() {
        this.audioAnalyser = this.audioContext.createAnalyser();
        this.audioAnalyser.fftSize = 2048;
        this.audioAnalyser.smoothingTimeConstant = 0.8;
        
        const bufferLength = this.audioAnalyser.frequencyBinCount;
        this.audioDataArray = new Uint8Array(bufferLength);
        
        // Only create media element source if it doesn't exist
        if (!this.audioSource) {
            this.audioSource = this.audioContext.createMediaElementSource(this.audio);
        }
        
        this.audioSource.connect(this.audioAnalyser);
        this.audioAnalyser.connect(this.audioContext.destination);
        
        // Create global 'a' object for Hydra
        window.a = {
            fft: new Array(4).fill(0),
            time: 0
        };
        
        this.updateAudioAnalysis();
        console.log('✓ Audio analysis setup complete');
    }

    /**
     * Continuously update audio analysis data
     */
    updateAudioAnalysis() {
        if (!this.audioAnalyser) {
            requestAnimationFrame(() => this.updateAudioAnalysis());
            return;
        }
        
        this.audioAnalyser.getByteFrequencyData(this.audioDataArray);
        
        const bands = 4;
        const samplesPerBand = Math.floor(this.audioDataArray.length / bands);
        
        for (let i = 0; i < bands; i++) {
            let sum = 0;
            for (let j = 0; j < samplesPerBand; j++) {
                sum += this.audioDataArray[i * samplesPerBand + j];
            }
            window.a.fft[i] = (sum / samplesPerBand) / 255;
        }
        
        if (this.audio.currentTime) {
            window.a.time = this.audio.currentTime;
        }
        
        requestAnimationFrame(() => this.updateAudioAnalysis());
    }

    /**
     * Play audio
     */
    async play() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        await this.audio.play();
        this.isPlaying = true;
    }

    /**
     * Pause audio
     */
    pause() {
        this.audio.pause();
        this.isPlaying = false;
    }

    /**
     * Stop audio and reset to beginning
     */
    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
    }

    /**
     * Get audio duration
     * @returns {number} Duration in seconds
     */
    getDuration() {
        return this.audioBuffer ? this.audioBuffer.duration : 0;
    }

    /**
     * Get current playback time
     * @returns {number} Current time in seconds
     */
    getCurrentTime() {
        return this.audio.currentTime;
    }

    /**
     * Set current playback time
     * @param {number} time - Time in seconds
     */
    setCurrentTime(time) {
        this.audio.currentTime = time;
    }

    /**
     * Add event listener to audio element
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    on(event, callback) {
        this.audio.addEventListener(event, callback);
    }
}
