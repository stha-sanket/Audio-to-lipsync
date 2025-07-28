const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const mouth = document.querySelector('.mouth'); // Use querySelector for class

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
        analyser.smoothingTimeConstant = 0.5;
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
        });
});

stopButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordButton.disabled = false;
        stopButton.disabled = true;
    }
});

const visemeClasses = ['mouth-closed', 'mouth-ah', 'mouth-ee', 'mouth-oo', 'mouth-fv', 'mouth-s'];

function setMouthShape(shape) {
    visemeClasses.forEach(className => {
        mouth.classList.remove(className);
    });
    mouth.classList.add(shape);
}

function updateMouth() {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const overallAvg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;

    let newShape = 'mouth-closed';

    if (overallAvg > 15) { // Lowered threshold slightly
        const lowFreq = dataArray.slice(0, 50).reduce((acc, val) => acc + val, 0) / 50;
        const highFreq = dataArray.slice(100, 200).reduce((acc, val) => acc + val, 0) / 100;

        if (lowFreq > highFreq * 1.2) {
            newShape = 'mouth-oo';
        } else if (highFreq > lowFreq * 1.5) {
            newShape = 'mouth-s';
        } else {
            if (overallAvg > 60) {
                newShape = 'mouth-ah';
            } else if (overallAvg > 30) {
                newShape = 'mouth-ee';
            } else {
                newShape = 'mouth-fv';
            }
        }
    }

    setMouthShape(newShape);

    animationFrameId = requestAnimationFrame(updateMouth);
}