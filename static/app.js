class TatinePhotobooth {
    constructor() {
        this.video = document.getElementById('video');
        this.captureBtn = document.getElementById('captureBtn');
        this.switchBtn = document.getElementById('switchCamera');
        this.galleryBtn = document.getElementById('galleryBtn');
        this.mirrorBtn = document.getElementById('mirrorBtn');
        this.previewSection = document.getElementById('previewSection');
        this.gallerySection = document.getElementById('gallerySection');
        this.capturedImage = document.getElementById('capturedImage');
        this.galleryGrid = document.getElementById('galleryGrid');
        this.cameraStatus = document.getElementById('cameraStatus');
        this.stream = null;
        this.currentPhoto = null;
        this.currentPhotoUrl = null;
        this.usingFrontCamera = true;
        this.isMirrored = true; // Start with mirror on for selfie view
        
        this.init();
    }
    
    async init() {
        try {
            await this.startCamera();
            this.setupEventListeners();
            this.cameraStatus.textContent = '✅ Camera Ready!';
            this.cameraStatus.style.color = '#4caf50';
        } catch (error) {
            console.error('Error initializing photobooth:', error);
            this.cameraStatus.textContent = '❌ Camera access denied. Please allow camera permissions.';
            this.cameraStatus.style.color = '#f44336';
            alert('Please allow camera access to use the photobooth!');
        }
    }
    
    async startCamera() {
        // Stop any existing stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        try {
            const constraints = {
                video: {
                    facingMode: this.usingFrontCamera ? 'user' : 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            await this.video.play();
            
            // Apply mirror effect
            this.applyMirrorEffect();
            
        } catch (error) {
            console.error('Camera error:', error);
            throw error;
        }
    }
    
    applyMirrorEffect() {
        if (this.isMirrored) {
            this.video.style.transform = 'scaleX(-1)';
        } else {
            this.video.style.transform = 'scaleX(1)';
        }
    }
    
    setupEventListeners() {
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.switchBtn.addEventListener('click', () => this.switchCamera());
        this.galleryBtn.addEventListener('click', () => this.showGallery());
        this.mirrorBtn.addEventListener('click', () => this.toggleMirror());
        document.getElementById('retakeBtn').addEventListener('click', () => this.retakePhoto());
        document.getElementById('saveBtn').addEventListener('click', () => this.savePhoto());
        document.getElementById('shareBtn').addEventListener('click', () => this.sharePhoto());
        document.getElementById('closeGalleryBtn').addEventListener('click', () => this.hideGallery());
    }
    
    toggleMirror() {
        this.isMirrored = !this.isMirrored;
        this.applyMirrorEffect();
        this.mirrorBtn.classList.toggle('active');
        this.mirrorBtn.textContent = this.isMirrored ? '🪞 Mirror ON' : '🪞 Mirror OFF';
    }
    
    async capturePhoto() {
        try {
            this.cameraStatus.textContent = '📸 Capturing...';
            this.cameraStatus.style.color = '#ff9800';
            
            // Create canvas and capture image
            const canvas = document.createElement('canvas');
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            // Apply mirror effect if enabled
            if (this.isMirrored) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            
            ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
            
            // Convert to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            this.currentPhoto = blob;
            
            // Display in preview
            const url = URL.createObjectURL(blob);
            this.capturedImage.src = url;
            
            // Save to server
            await this.saveToServer(blob);
            
            // Show preview section
            this.previewSection.style.display = 'block';
            this.gallerySection.style.display = 'none';
            this.captureBtn.style.display = 'none';
            
            this.cameraStatus.textContent = '✅ Photo captured!';
            this.cameraStatus.style.color = '#4caf50';
            
        } catch (error) {
            console.error('Error capturing photo:', error);
            this.cameraStatus.textContent = '❌ Failed to capture photo';
            this.cameraStatus.style.color = '#f44336';
            alert('Failed to capture photo. Please try again.');
        }
    }
    
    async saveToServer(blob) {
        try {
            const formData = new FormData();
            formData.append('file', blob, 'photo.jpg');
            
            const response = await fetch('/capture', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to save photo');
            }
            
            const data = await response.json();
            console.log('Photo saved:', data);
            this.currentPhotoUrl = data.photo_url;
            
        } catch (error) {
            console.error('Error saving photo:', error);
            alert('Failed to save photo. Please try again.');
        }
    }
    
    async switchCamera() {
        this.cameraStatus.textContent = '🔄 Switching camera...';
        this.cameraStatus.style.color = '#ff9800';
        this.usingFrontCamera = !this.usingFrontCamera;
        await this.startCamera();
        this.cameraStatus.textContent = '✅ Camera switched!';
        this.cameraStatus.style.color = '#4caf50';
    }
    
    retakePhoto() {
        this.previewSection.style.display = 'none';
        this.captureBtn.style.display = 'flex';
        this.currentPhoto = null;
        this.currentPhotoUrl = null;
        this.cameraStatus.textContent = '📷 Ready for new photo';
        this.cameraStatus.style.color = '#4caf50';
    }
    
    async savePhoto() {
        if (!this.currentPhotoUrl) {
            alert('No photo to save!');
            return;
        }
        
        try {
            // Create download link
            const a = document.createElement('a');
            const response = await fetch(this.currentPhotoUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            a.href = url;
            a.download = `tatine-photo-${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.cameraStatus.textContent = '💾 Photo saved!';
            this.cameraStatus.style.color = '#4caf50';
        } catch (error) {
            console.error('Error saving photo:', error);
            alert('Failed to save photo. Please try again.');
        }
    }
    
    async sharePhoto() {
        if (!this.currentPhotoUrl) {
            alert('No photo to share!');
            return;
        }
        
        try {
            const response = await fetch(this.currentPhotoUrl);
            const blob = await response.blob();
            
            if (navigator.share) {
                await navigator.share({
                    title: 'Tatine Photobooth Photo',
                    text: 'Look at this cute photo from Tatine Photobooth! 📸',
                    files: [new File([blob], 'tatine-photo.jpg', { type: 'image/jpeg' })]
                });
                this.cameraStatus.textContent = '📤 Photo shared!';
            } else {
                // Fallback: copy link
                const url = window.location.origin + this.currentPhotoUrl;
                await navigator.clipboard.writeText(url);
                alert('Photo link copied to clipboard! You can share it with your friends.');
                this.cameraStatus.textContent = '📋 Link copied!';
            }
            this.cameraStatus.style.color = '#4caf50';
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error sharing photo:', error);
                alert('Failed to share photo. Please try again.');
            }
        }
    }
    
    async showGallery() {
        try {
            const response = await fetch('/photos');
            if (!response.ok) throw new Error('Failed to fetch gallery');
            
            const data = await response.json();
            this.renderGallery(data.photos);
            
            this.gallerySection.style.display = 'block';
            this.previewSection.style.display = 'none';
        } catch (error) {
            console.error('Error loading gallery:', error);
            alert('Failed to load gallery. Please try again.');
        }
    }
    
    renderGallery(photos) {
        this.galleryGrid.innerHTML = '';
        
        if (photos.length === 0) {
            this.galleryGrid.innerHTML = '<p style="text-align: center; color: #ad1457; padding: 20px;">No photos yet! Take your first photo! 📸</p>';
            return;
        }
        
        photos.forEach(photo => {
            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.margin = '5px';
            
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = photo.filename;
            img.title = new Date(photo.created).toLocaleString();
            img.style.width = '100%';
            img.style.aspectRatio = '1';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '10px';
            img.style.cursor = 'pointer';
            
            // Click to view full size
            img.onclick = () => {
                window.open(photo.url, '_blank');
            };
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✖';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '5px';
            deleteBtn.style.right = '5px';
            deleteBtn.style.background = 'rgba(233, 30, 99, 0.9)';
            deleteBtn.style.color = 'white';
            deleteBtn.style.border = 'none';
            deleteBtn.style.borderRadius = '50%';
            deleteBtn.style.width = '30px';
            deleteBtn.style.height = '30px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.fontSize = '14px';
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('Delete this photo?')) {
                    await this.deletePhoto(photo.filename);
                    this.showGallery(); // Refresh gallery
                }
            };
            
            container.appendChild(img);
            container.appendChild(deleteBtn);
            this.galleryGrid.appendChild(container);
        });
    }
    
    async deletePhoto(filename) {
        try {
            const response = await fetch(`/photos/${filename}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete photo');
            alert('Photo deleted!');
        } catch (error) {
            console.error('Error deleting photo:', error);
            alert('Failed to delete photo.');
        }
    }
    
    hideGallery() {
        this.gallerySection.style.display = 'none';
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TatinePhotobooth();
});