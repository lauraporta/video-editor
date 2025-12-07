/**
 * Project Manager Module
 * Handles project save/load functionality with File System Access API
 */

export class ProjectManager {
    constructor() {
        this.projectName = 'untitled';
        this.projectAudioPath = '';
        this.audioFileHandle = null;
        this.mediaFileHandles = [];
    }

    /**
     * Save project to JSON file
     * @param {Object} data - Project data
     */
    async save(data) {
        // Store file handles in IndexedDB for persistence
        await this.storeHandlesInIndexedDB().catch(err => {
            console.warn('Could not store file handles in IndexedDB:', err);
        });
        
        const project = {
            version: '1.2',
            name: this.projectName,
            created: new Date().toISOString(),
            audio: {
                name: this.audioFileHandle?.name || '',
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
        
        // Create meaningful filename with date
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
        const projectName = this.projectName || 'my_project';
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}_${dateStr}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('✓ Project saved');
    }

    /**
     * Serialize a file handle for storage (uses IndexedDB serialization)
     * @param {FileSystemFileHandle} handle - File handle
     * @returns {Object} Serialized handle data
     */
    async serializeFileHandle(handle) {
        if (!handle) return null;
        // Store the handle directly - it's serializable in IndexedDB format
        // But for JSON we can only store metadata
        return {
            name: handle.name,
            kind: handle.kind,
            // Store handle reference if browser supports it (won't survive JSON serialization)
            _handle: handle
        };
    }
    
    /**
     * Store file handles in IndexedDB for persistence
     */
    async storeHandlesInIndexedDB() {
        if (!window.indexedDB) return;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('HydraVideoEditor', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['fileHandles'], 'readwrite');
                const store = transaction.objectStore('fileHandles');
                
                // Store audio handle
                if (this.audioFileHandle) {
                    store.put({ id: 'audio', handle: this.audioFileHandle });
                }
                
                // Store media handles
                this.mediaFileHandles.forEach((handle, index) => {
                    store.put({ id: `media_${index}`, handle: handle });
                });
                
                transaction.oncomplete = () => {
                    db.close();
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles', { keyPath: 'id' });
                }
            };
        });
    }
    
    /**
     * Restore file handles from IndexedDB
     */
    async restoreHandlesFromIndexedDB() {
        if (!window.indexedDB) return { audio: null, media: [] };
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('HydraVideoEditor', 1);
            
            request.onerror = () => resolve({ audio: null, media: [] });
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['fileHandles'], 'readonly');
                const store = transaction.objectStore('fileHandles');
                
                const audioRequest = store.get('audio');
                const mediaHandles = [];
                
                audioRequest.onsuccess = () => {
                    const audioHandle = audioRequest.result?.handle || null;
                    
                    // Get all media handles
                    const cursorRequest = store.openCursor();
                    cursorRequest.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            if (cursor.key.startsWith('media_')) {
                                mediaHandles.push(cursor.value.handle);
                            }
                            cursor.continue();
                        } else {
                            db.close();
                            resolve({ audio: audioHandle, media: mediaHandles });
                        }
                    };
                };
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles', { keyPath: 'id' });
                }
            };
        });
    }
    /**
     * Load project from JSON file
     * @param {File} file - Project file
     * @returns {Promise<Object>} Project data including file handles
     */
    async load(file) {
        const text = await file.text();
        const project = JSON.parse(text);
        
        console.log('Loading project:', project.name);
        
        this.projectName = project.name || 'loaded-project';
        this.projectAudioPath = project.audio?.path || '';
        
        // Try to restore file handles from IndexedDB
        const handles = await this.restoreHandlesFromIndexedDB().catch(() => ({ audio: null, media: [] }));
        
        return {
            name: project.name,
            audioName: project.audio?.name || '',
            segments: project.segments || [],
            mediaSources: project.mediaSources || [],
            waveformView: project.waveformView || {
                zoom: 1.0,
                offset: 0,
                amplitude: 1.0
            },
            storedHandles: handles
        };
    }

    /**
     * Request audio file access using File System Access API
     * @returns {Promise<File>} Audio file
     */
    async requestAudioFileAccess() {
        try {
            if (!window.showOpenFilePicker) {
                throw new Error('File System Access API not supported');
            }

            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Audio Files',
                    accept: {
                        'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']
                    }
                }],
                multiple: false
            });

            this.audioFileHandle = fileHandle;
            const file = await fileHandle.getFile();
            console.log('✓ Audio file handle stored:', file.name);
            return file;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('File selection cancelled');
            } else {
                console.error('Error accessing audio file:', error);
            }
            throw error;
        }
    }

    /**
     * Request media files access using File System Access API
     * @returns {Promise<Array<File>>} Media files
     */
    async requestMediaFilesAccess(type = 'all') {
        try {
            if (!window.showOpenFilePicker) {
                throw new Error('File System Access API not supported');
            }

            const acceptTypes = type === 'video' 
                ? { 'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv'] }
                : type === 'image'
                ? { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] }
                : { 
                    'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
                    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
                  };

            const fileHandles = await window.showOpenFilePicker({
                types: [{
                    description: type === 'video' ? 'Video Files' : type === 'image' ? 'Image Files' : 'Media Files',
                    accept: acceptTypes
                }],
                multiple: true
            });

            this.mediaFileHandles = fileHandles;
            const files = await Promise.all(fileHandles.map(h => h.getFile()));
            console.log(`✓ ${files.length} media file handle(s) stored`);
            return files;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('File selection cancelled');
            } else {
                console.error('Error accessing media files:', error);
            }
            throw error;
        }
    }

    /**
     * Get audio file from stored handle with permission request
     * @returns {Promise<File>} Audio file
     */
    async getAudioFile() {
        if (!this.audioFileHandle) {
            throw new Error('No audio file handle available');
        }

        try {
            // Request permission to read the file
            const permission = await this.audioFileHandle.queryPermission({ mode: 'read' });
            
            if (permission === 'granted') {
                const file = await this.audioFileHandle.getFile();
                return file;
            } else if (permission === 'prompt') {
                // Request permission - this will show a prompt
                const newPermission = await this.audioFileHandle.requestPermission({ mode: 'read' });
                if (newPermission === 'granted') {
                    const file = await this.audioFileHandle.getFile();
                    return file;
                }
            }
            
            throw new Error('Permission denied');
        } catch (error) {
            console.error('Error accessing stored audio file:', error);
            throw error;
        }
    }

    /**
     * Get media files from stored handles with permission requests
     * @returns {Promise<Array<File>>} Media files
     */
    async getMediaFiles() {
        if (!this.mediaFileHandles || this.mediaFileHandles.length === 0) {
            return [];
        }

        const files = [];
        for (const handle of this.mediaFileHandles) {
            try {
                // Request permission for each file
                const permission = await handle.queryPermission({ mode: 'read' });
                
                if (permission === 'granted') {
                    files.push(await handle.getFile());
                } else if (permission === 'prompt') {
                    const newPermission = await handle.requestPermission({ mode: 'read' });
                    if (newPermission === 'granted') {
                        files.push(await handle.getFile());
                    }
                }
            } catch (error) {
                console.warn('Could not access media file:', handle.name, error);
            }
        }
        
        return files;
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

    /**
     * Set audio file handle
     * @param {FileSystemFileHandle} handle - Audio file handle
     */
    setAudioFileHandle(handle) {
        this.audioFileHandle = handle;
    }

    /**
     * Add media file handle
     * @param {FileSystemFileHandle} handle - Media file handle
     */
    addMediaFileHandle(handle) {
        this.mediaFileHandles.push(handle);
    }

    /**
     * Clear media file handles
     */
    clearMediaFileHandles() {
        this.mediaFileHandles = [];
    }
}
