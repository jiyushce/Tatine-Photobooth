const video = document.getElementById('webcam');
const captureBtn = document.getElementById('capture-btn');
const canvas = document.getElementById('canvas');

// 1. Request access to user's webcam
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = stream;
    } catch (err) {
        console.error("Error accessing webcam: ", err);
        alert("Could not open webcam. Make sure to grant browser permissions!");
    }
}

// 2. Capture frame and send to local backend
captureBtn.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame onto the hidden canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas image to base64 format string
    const imageData = canvas.toDataURL('image/png');
    
    // Send it to your FastAPI local backend
    fetch('/save-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
    })
    .then(res => res.json())
    .then(data => alert("✨ Photo saved successfully to your photos/ folder! ✨"))
    .catch(err => console.error(err));
});

// Start webcam when page loads
startWebcam();