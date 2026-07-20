class TatinePhotobooth {
    constructor() {
        this.video = document.getElementById('video');
        this.captureBtn = document.getElementById('captureBtn');
        this.switchBtn = document.getElementById('switchCamera');
        this.galleryBtn = document.getElementById('galleryBtn');
        this.previewSection = document.getElementById('previewSection');
        this.gallerySection = document.getElementById('gallerySection');
        this.capturedImage = document.getElementById('capturedImage');
        this.galleryGrid = document.getElementById('galleryGrid');
        this.stream = null;
        this.currentPhoto = null;
        this.usingFrontCamera = true;
        
        this.init();
    }
    
    async init() {
        try {
            await this.startCamera();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing photobooth:', error);
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
            
            // Flip video horizontally for mirror effect
            this.video.style.transform = 'scaleX(-1)';
        } catch (error) {
            console.error('Camera error:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.switchBtn.addEventListener('click', () => this.switchCamera());
        this.galleryBtn.addEventListener('click', () => this.showGallery());
        document.getElementById('retakeBtn').addEventListener('click', () => this.retakePhoto());
        document.getElementById('saveBtn').addEventListener('click', () => this.savePhoto());
        document.getElementById('shareBtn').addEventListener('click', () => this.sharePhoto());
        document.getElementById('closeGalleryBtn').addEventListener('click', () => this.hideGallery());
    }
    
    async capturePhoto() {
        try {
            // Create canvas and capture image
            const canvas = document.createElement('canvas');
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            // Flip image for mirror effect
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
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
            
        } catch (error) {
            console.error('Error capturing photo:', error);
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
            
            // Store URL for later use
            this.currentPhotoUrl = data.photo_url;
            
        } catch (error) {
            console.error('Error saving photo:', error);
            alert('Failed to save photo. Please try again.');
        }
    }
    
    async switchCamera() {
        this.usingFrontCamera = !this.usingFrontCamera;
        await this.startCamera();
    }
    
    retakePhoto() {
        this.previewSection.style.display = 'none';
        this.captureBtn.style.display = 'flex';
        this.currentPhoto = null;
        this.currentPhotoUrl = null;
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
            } else {
                // Fallback: copy link
                const url = window.location.origin + this.currentPhotoUrl;
                await navigator.clipboard.writeText(url);
                alert('Photo link copied to clipboard! You can share it with your friends.');
            }
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
            this.galleryGrid.innerHTML = '<p style="text-align: center; color: #ad1457;">No photos yet! Take your first photo! 📸</p>';
            return;
        }
        
        photos.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = photo.filename;
            img.title = new Date(photo.created).toLocaleString();
            
            // Add delete button overlay
            const container = document.createElement('div');
            container.style.position = 'relative';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✖';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '5px';
            deleteBtn.style.right = '5px';
            deleteBtn.style.background = 'rgba(233, 30, 99, 0.8)';
            deleteBtn.style.color = 'white';
            deleteBtn.style.border = 'none';
            deleteBtn.style.borderRadius = '50%';
            deleteBtn.style.width = '25px';
            deleteBtn.style.height = '25px';
            deleteBtn.style.cursor = 'pointer';
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