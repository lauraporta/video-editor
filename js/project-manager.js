/**
 * Project Manager Module
 * Handles project save/load functionality
 */

export class ProjectManager {
    constructor() {
        this.projectName = 'untitled';
        this.projectAudioPath = '';
    }

    /**
     * Save project to JSON file
     * @param {Object} data - Project data
     */
    save(data) {
        const project = {
            version: '1.0',
            name: this.projectName,
            created: new Date().toISOString(),
            audio: {
                path: this.projectAudioPath,
                duration: data.audioDuration || 0
            },
            mediaSources: data.mediaSources || [],
            segments: data.segments || [],
            waveformView: data.waveformView || {
                zoom: 1.0,
                offset: 0,
                amplitude: 1.0
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

    /**
     * Load project from JSON file
     * @param {File} file - Project file
     * @returns {Promise<Object>} Project data
     */
    async load(file) {
        const text = await file.text();
        const project = JSON.parse(text);
        
        console.log('Loading project:', project.name);
        
        this.projectName = project.name || 'loaded-project';
        this.projectAudioPath = project.audio?.path || '';
        
        return {
            name: project.name,
            segments: project.segments || [],
            mediaSources: project.mediaSources || [],
            waveformView: project.waveformView || {
                zoom: 1.0,
                offset: 0,
                amplitude: 1.0
            }
        };
    }

    /**
     * Set project name
     * @param {string} name - Project name
     */
    setProjectName(name) {
        this.projectName = name;
    }

    /**
     * Set audio path
     * @param {string} path - Audio file path
     */
    setAudioPath(path) {
        this.projectAudioPath = path;
    }
}
