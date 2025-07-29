const speakButton = document.getElementById('speakButton');
const textToSpeak = document.getElementById('text-to-speak');
const mouth = document.querySelector('.mouth');
const phonemeDisplay = document.getElementById('phoneme-display');

const phonemeMap = {
    'sh': 'mouth-s', 'ch': 'mouth-chj', 'th': 'mouth-fv',
    'a': 'mouth-ah', 'e': 'mouth-ee', 'i': 'mouth-ee', 'o': 'mouth-oo', 'u': 'mouth-oo',
    'm': 'mouth-mbp', 'b': 'mouth-mbp', 'p': 'mouth-mbp',
    'f': 'mouth-fv', 'v': 'mouth-fv',
    's': 'mouth-s', 'z': 'mouth-s', 'c': 'mouth-s',
    'l': 'mouth-ltd', 't': 'mouth-ltd', 'd': 'mouth-ltd', 'n': 'mouth-ltd',
    'g': 'mouth-chj', 'j': 'mouth-chj', 'k': 'mouth-chj', 'r': 'mouth-ee', 'y': 'mouth-ee',
    'w': 'mouth-oo', 'q': 'mouth-oo',
    'h': 'mouth-fv'
};
const phonemeKeys = Object.keys(phonemeMap).sort((a, b) => b.length - a.length);

const visemeClasses = ['mouth-closed', 'mouth-ah', 'mouth-ee', 'mouth-oo', 'mouth-fv', 'mouth-s', 'mouth-mbp', 'mouth-ltd', 'mouth-chj'];

function setMouthShape(shape) {
    if (!shape) return;
    visemeClasses.forEach(className => mouth.classList.remove(className));
    mouth.classList.add(shape);
    phonemeDisplay.innerText = shape;
}

function wordToVisemes(word) {
    const visemes = [];
    let i = 0;
    while (i < word.length) {
        let foundPhoneme = false;
        for (const key of phonemeKeys) {
            if (word.substring(i, i + key.length).toLowerCase() === key) {
                visemes.push(phonemeMap[key]);
                i += key.length;
                foundPhoneme = true;
                break;
            }
        }
        if (!foundPhoneme) {
            i++;
        }
    }
    return visemes;
}

let wordAnimationInterval;
let phonemeAnimationInterval;

function animateWord(word) {
    const visemes = wordToVisemes(word);
    if (visemes.length === 0) {
        setMouthShape('mouth-fv');
        return;
    }

    if (phonemeAnimationInterval) clearInterval(phonemeAnimationInterval);

    let visemeIndex = 0;
    const phonemeInterval = 120; // Time per phoneme

    phonemeAnimationInterval = setInterval(() => {
        if (visemeIndex >= visemes.length) {
            clearInterval(phonemeAnimationInterval);
            return;
        }
        setMouthShape(visemes[visemeIndex]);
        visemeIndex++;
    }, phonemeInterval);
}

function speakAndAnimate(text) {
    const speechSynth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);

    // Stop any previous speaking or animating
    speechSynth.cancel();
    if (wordAnimationInterval) clearInterval(wordAnimationInterval);
    if (phonemeAnimationInterval) clearInterval(phonemeAnimationInterval);

    const words = text.trim().split(/\s+/);
    let wordIndex = 0;

    // Estimate time per word based on a natural speaking rate
    const timePerWord = 300; // ms

    utterance.onstart = () => {
        // Start our own timer to animate words
        wordAnimationInterval = setInterval(() => {
            if (wordIndex >= words.length) {
                clearInterval(wordAnimationInterval);
                return;
            }
            animateWord(words[wordIndex]);
            wordIndex++;
        }, timePerWord);
    };

    utterance.onend = () => {
        if (wordAnimationInterval) clearInterval(wordAnimationInterval);
        if (phonemeAnimationInterval) clearInterval(phonemeAnimationInterval);
        setMouthShape('mouth-closed');
    };

    utterance.onerror = (event) => {
        console.error("SpeechSynthesis Error", event);
        if (wordAnimationInterval) clearInterval(wordAnimationInterval);
        if (phonemeAnimationInterval) clearInterval(phonemeAnimationInterval);
        setMouthShape('mouth-closed');
    };

    speechSynth.speak(utterance);
}

speakButton.addEventListener('click', () => {
    const text = textToSpeak.value;
    if (text) {
        speakAndAnimate(text);
    }
});