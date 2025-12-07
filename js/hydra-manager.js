/**
 * Hydra Manager Module
 * Handles Hydra synth initialization and visual rendering
 */

export class HydraManager {
    constructor() {
        this.hydra = null;
    }

    /**
     * Initialize Hydra synth with custom configuration
     */
    init() {
        this.hydra = new Hydra({
            canvas: document.getElementById('hydra-canvas'),
            detectAudio: false,
            autoLoop: true,
            numSources: 8,
            numOutputs: 4,
            makeGlobal: true,
            enableStreamCapture: true
        });

        console.log('Hydra initialized with 8 sources');
        
        // Load default visual after initialization
        setTimeout(() => {
            try {
                solid().out();
                console.log('Default visual loaded');
            } catch (error) {
                console.error('Error loading default visual:', error);
            }
        }, 100);
    }

    /**
     * Execute Hydra code segment
     * @param {string} code - Hydra code to execute
     * @throws {Error} If code execution fails
     */
    executeCode(code) {
        const executeCode = new Function(code);
        executeCode();
    }

    /**
     * Set canvas size
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Function} callback - Callback after canvas is resized
     */
    setCanvasSize(width, height, callback) {
        const canvas = document.getElementById('hydra-canvas');
        
        // Set canvas resolution
        canvas.width = width;
        canvas.height = height;
        
        // Update Hydra's internal resolution if Hydra is already initialized
        if (this.hydra && this.hydra.setResolution) {
            this.hydra.setResolution(width, height);
        }
        
        console.log(`Canvas size set to ${width}×${height}`);
        
        // Call callback immediately since no reinitialization needed
        if (callback) {
            setTimeout(callback, 50);
        }
    }
}
