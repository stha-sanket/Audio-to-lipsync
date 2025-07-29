const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const mouth = document.querySelector('.mouth');
const phonemeDisplay = document.getElementById('phoneme-display');

let audioContext;
let analyser;
let mediaRecorder;
let recordedChunks = [];
let animationFrameId;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;
    }
}

recordButton.addEventListener('click', () => {
    initAudio();
    recordedChunks = [];

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }

                const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(blob);
                const audio = new Audio(audioUrl);

                const source = audioContext.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(audioContext.destination);

                audio.onended = () => {
                    cancelAnimationFrame(animationFrameId);
                    setMouthShape('mouth-closed');
                };

                audio.play();
                updateMouth();
            };

            mediaRecorder.start();
            recordButton.disabled = true;
            stopButton.disabled = false;
        }).catch(err => console.error('Error getting media:', err));
});

stopButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordButton.disabled = false;
        stopButton.disabled = true;
    }
});

const visemeClasses = ['mouth-closed', 'mouth-ah', 'mouth-ee', 'mouth-oo', 'mouth-fv', 'mouth-s', 'mouth-mbp', 'mouth-ltd', 'mouth-chj'];

function setMouthShape(shape) {
    visemeClasses.forEach(className => {
        mouth.classList.remove(className);
    });
    mouth.classList.add(shape);
    phonemeDisplay.innerText = shape;
}

// Helper to get average energy in a frequency band
function getAverage(data, start, end) {
    const slice = data.slice(start, end);
    return slice.reduce((acc, val) => acc + val, 0) / slice.length;
}

function updateMouth() {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const overallAvg = getAverage(dataArray, 0, 256);

    if (overallAvg < 12) { // Lowered silence threshold slightly
        setMouthShape('mouth-closed');
        animationFrameId = requestAnimationFrame(updateMouth);
        return;
    }

    const bassAvg = getAverage(dataArray, 1, 4);
    const lowMidAvg = getAverage(dataArray, 5, 15);
    const midAvg = getAverage(dataArray, 16, 40);
    const highMidAvg = getAverage(dataArray, 41, 60);
    const highAvg = getAverage(dataArray, 61, 120);

    let newShape = 'mouth-fv'; // Default

    // Check from most specific/highest frequency to most general
    if (highAvg > 45 && highAvg > highMidAvg * 1.5) { // 's' needs to be clearly dominant
        newShape = 'mouth-s';
    } else if (highMidAvg > 40 && highMidAvg > midAvg) {
        newShape = 'mouth-chj';
    } else if (bassAvg > midAvg * 1.8 && bassAvg > 50) { // 'oo' needs very strong, dominant bass
        newShape = 'mouth-oo';
    } else if (lowMidAvg > midAvg && lowMidAvg > 30) {
        newShape = 'mouth-ltd';
    } else if (bassAvg > 25 && overallAvg < 40) { // 'mbp' is a quiet, low-energy bass sound
        newShape = 'mouth-mbp';
    } else {
        // General vowels based on volume
        if (overallAvg > 65) { // Slightly lowered 'ah' threshold
            newShape = 'mouth-ah';
        } else if (overallAvg > 30) {
            newShape = 'mouth-ee';
        }
    }

    setMouthShape(newShape);

    animationFrameId = requestAnimationFrame(updateMouth);
}
