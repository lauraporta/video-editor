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
                osc(10, 0.1, 1).out();
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
     * Set canvas size and reinitialize Hydra
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    setCanvasSize(width, height) {
        const canvas = document.getElementById('hydra-canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'contain';
        
        // Reinitialize Hydra with new canvas size
        this.init();
        
        console.log(`Canvas size set to ${width}×${height}`);
    }
}
