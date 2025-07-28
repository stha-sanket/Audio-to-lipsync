const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const mouth = document.getElementById('mouth');

let audioContext;
let analyser;
let mediaRecorder;
let recordedChunks = [];

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
    }
}

recordButton.addEventListener('click', () => {
    initAudio();
    recordedChunks = []; // Clear previous recordings

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
                const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(blob);
                const audio = new Audio(audioUrl);

                const source = audioContext.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(audioContext.destination);

                audio.play();
                setInterval(updateMouth, 100);
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

function updateMouth() {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const avg = sum / dataArray.length;

    const scale = Math.min(1, avg / 100);
    mouth.style.transform = `scaleY(${scale})`;
}