let quizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
let currentQuiz = [];
let currentPairs = [];
let timerInterval;
let audio = null;
let countdownAudio = null;
let tapSound = null;
let timeLeft = 0;
let paused = false;
let currentBackgroundImage = null;
let currentBackgroundSound = null;
let currentCountdownSound = null;

// Initialize tap sound
function initTapSound() {
    tapSound = new Audio('tap.mp3');
    tapSound.volume = 0.3; // Reduce volume to 30%
}

// Play tap sound function
function playTapSound() {
    if (tapSound) {
        tapSound.currentTime = 0; // Reset to start
        tapSound.play().catch(err => console.log('Tap sound play prevented'));
    }
}

// Initialize tap sound when page loads
document.addEventListener('DOMContentLoaded', initTapSound);

function goPage(id) {
  playTapSound();
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  if (id === "savedQuizPage") {
    refreshQuizList();
    loadSavedSettings();
  }
}

// --- New Quiz ---
function makeQuiz() {
  playTapSound();
  const lines = document.getElementById("quizInput").value.trim().split("\n");
  currentQuiz = lines.map(l => {
    const [left, right] = l.split(",");
    return { left: left.trim(), right: right.trim() };
  });
  alert("Quiz created. You can Save now.");
}
function editQuiz() {
  playTapSound();
  document.getElementById("quizInput").value = currentQuiz.map(p => `${p.left},${p.right}`).join("\n");
}
function saveQuiz() {
  playTapSound();
  const name = prompt("Enter quiz name:", "Quiz" + Object.keys(quizzes).length);
  if (!name) return;
  quizzes[name] = currentQuiz;
  localStorage.setItem("quizzes", JSON.stringify(quizzes));
  alert("Quiz saved!");
}
function importCSV() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".csv";
  fileInput.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      currentQuiz = text.trim().split("\n").map(l => {
        const [left, right] = l.split(",");
        return { left, right };
      });
      alert("Imported CSV. Now save it.");
    };
    reader.readAsText(file);
  };
  fileInput.click();
}
function exportCSV() {
  const csv = currentQuiz.map(p => `${p.left},${p.right}`).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quiz.csv";
  a.click();
}

// --- Saved Quizzes ---
function refreshQuizList() {
  const list = document.getElementById("quizList");
  list.innerHTML = "";
  Object.keys(quizzes).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    list.appendChild(opt);
  });
}
function editSavedQuiz() {
  const name = document.getElementById("quizList").value;
  if (!name) return;
  currentQuiz = quizzes[name];
  document.getElementById("quizInput").value = currentQuiz.map(p => `${p.left},${p.right}`).join("\n");
  goPage("newQuizPage");
}
function deleteQuiz() {
  playTapSound();
  const name = document.getElementById("quizList").value;
  if (!name) return;
  delete quizzes[name];
  localStorage.setItem("quizzes", JSON.stringify(quizzes));
  refreshQuizList();
}
function setBackgroundImage(event) {
  const file = event.target.files[0];
  if (file) {
    // Store the file for later saving
    currentBackgroundImage = file;
    const url = URL.createObjectURL(file);
    document.body.style.backgroundImage = `url(${url})`;
    document.body.style.backgroundSize = "cover";
  }
}

function setBackgroundSound(event) {
  const file = event.target.files[0];
  if (file) {
    // Store the file for later saving
    currentBackgroundSound = file;
    if (audio) audio.pause();
    const url = URL.createObjectURL(file);
    audio = new Audio(url);
    audio.loop = true;
    // Don't play automatically, will play during quiz
  }
}

function setCountdownSound(event) {
  const file = event.target.files[0];
  if (file) {
    // Store the file for later saving
    currentCountdownSound = file;
    if (countdownAudio) countdownAudio.pause();
    const url = URL.createObjectURL(file);
    countdownAudio = new Audio(url);
    countdownAudio.loop = true;
  }
}

async function saveSettings() {
  playTapSound();
  try {
    const settings = {
      countdown: document.getElementById("countdownInput").value
    };

    // Convert files to base64 using promises
    const processFile = async (file) => {
      return new Promise((resolve, reject) => {
        if (!file) resolve(null);
        const reader = new FileReader();
        reader.onload = e => resolve({
          data: e.target.result,
          type: file.type,
          name: file.name
        });
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
      });
    };

    // Process all files in parallel
    const [imageData, soundData, countdownSoundData] = await Promise.all([
      currentBackgroundImage ? processFile(currentBackgroundImage) : Promise.resolve(null),
      currentBackgroundSound ? processFile(currentBackgroundSound) : Promise.resolve(null),
      currentCountdownSound ? processFile(currentCountdownSound) : Promise.resolve(null)
    ]);

    if (imageData) settings.backgroundImage = imageData;
    if (soundData) settings.backgroundSound = soundData;
    if (countdownSoundData) settings.countdownSound = countdownSoundData;

    // Save to localStorage
    localStorage.setItem("quizSettings", JSON.stringify(settings));
    alert("Settings saved successfully!");
  } catch (error) {
    console.error('Error saving settings:', error);
    alert("Failed to save settings. Please try again.");
  }
}

function loadSavedSettings() {
  try {
    const settingsJson = localStorage.getItem("quizSettings");
    if (!settingsJson) return;

    const settings = JSON.parse(settingsJson);
    
    // Restore countdown
    if (settings.countdown) {
      document.getElementById("countdownInput").value = settings.countdown;
    }
    
    // Restore background image
    if (settings.backgroundImage?.data) {
      document.body.style.backgroundImage = `url(${settings.backgroundImage.data})`;
      document.body.style.backgroundSize = "cover";
    }
    
    // Setup background sound but don't play
    if (settings.backgroundSound?.data) {
      if (audio) {
        audio.pause();
        audio = null;
      }
      audio = new Audio(settings.backgroundSound.data);
      audio.loop = true;
      // Don't play here - will play when quiz starts
    }

    // Setup countdown sound
    if (settings.countdownSound?.data) {
      if (countdownAudio) {
        countdownAudio.pause();
        countdownAudio = null;
      }
      countdownAudio = new Audio(settings.countdownSound.data);
      countdownAudio.loop = true;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    // Don't alert here as it's not user-initiated
  }
}

// --- Play Quiz ---
function playQuiz() {
  const name = document.getElementById("quizList").value;
  if (!name) return;
  currentQuiz = quizzes[name];
  currentPairs = [...currentQuiz]; // clone

  goPage("playPage");
  renderQuiz();

  // Start background sound if available
  if (audio) {
    audio.currentTime = 0; // Reset to beginning
    audio.play();
  }

  // timer
  timeLeft = parseInt(document.getElementById("countdownInput").value);
  document.getElementById("timer").textContent = `Time: ${timeLeft}`;
  timerInterval = setInterval(updateTimer, 1000);
  paused = false;
}

function updateTimer() {
  if (paused) return;
  
  timeLeft--;
  const timerElement = document.getElementById("timer");
  
  // Handle last 10 seconds
  if (timeLeft <= 10) {
    timerElement.classList.add("warning");
    timerElement.textContent = timeLeft; // Show only the number for dramatic effect
    
    // Start countdown sound at 10 seconds if available
    if (timeLeft === 10) {
      if (countdownAudio) {
        if (audio) audio.pause(); // Pause background music
        countdownAudio.currentTime = 0;
        countdownAudio.play();
      }
      // Create a persistent timer for mobile devices
      document.body.style.paddingBottom = '120px'; // Add space for floating timer
    }
  } else {
    timerElement.classList.remove("warning");
    timerElement.textContent = `Time: ${timeLeft}`;
    document.body.style.paddingBottom = '0';
  }
  
  if (timeLeft <= 0) {
    if (countdownAudio) {
      countdownAudio.pause();
      countdownAudio.currentTime = 0;
    }
    document.body.style.paddingBottom = '0';
    endQuiz();
  }
}

function renderQuiz() {
  const leftCol = document.getElementById("leftColumn");
  const rightCol = document.getElementById("rightColumn");
  leftCol.innerHTML = "";
  rightCol.innerHTML = "";

  const leftItems = shuffle(currentPairs.map(p => p.left));
  const rightItems = shuffle(currentPairs.map(p => p.right));

  leftItems.forEach(l => {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = l;
    div.dataset.value = l;
    div.onclick = () => selectItem(div, "left");
    leftCol.appendChild(div);
  });

  rightItems.forEach(r => {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = r;
    div.dataset.value = r;
    div.onclick = () => selectItem(div, "right");
    rightCol.appendChild(div);
  });
}

let selectedLeft = null;
let selectedRight = null;
let matched = []; // store {left,right} chosen by user

function selectItem(div, side) {
  playTapSound();
  if (side === "left") {
    if (selectedLeft) selectedLeft.style.background = "rgba(255,255,255,0.1)";
    selectedLeft = div;
    div.style.background = "rgba(255,255,255,0.3)";
  } else {
    if (selectedRight) selectedRight.style.background = "rgba(255,255,255,0.1)";
    selectedRight = div;
    div.style.background = "rgba(255,255,255,0.3)";
  }
  if (selectedLeft && selectedRight) {
    // store user's chosen pair but don't mark correct/wrong yet
    matched.push({ left: selectedLeft.dataset.value, right: selectedRight.dataset.value });
    selectedLeft.style.background = "#444";
    selectedRight.style.background = "#444";
    selectedLeft = null;
    selectedRight = null;

    if (matched.length === currentPairs.length) {
      endQuiz();
    }
  }
}

function endQuiz() {
  clearInterval(timerInterval);
  if (audio) audio.pause();
  if (countdownAudio) {
    countdownAudio.pause();
    countdownAudio.currentTime = 0;
  }

  // Reveal correct/wrong answers
  const leftItems = document.querySelectorAll("#leftColumn .item");
  const rightItems = document.querySelectorAll("#rightColumn .item");

  let score = 0;
  matched.forEach(choice => {
    const correct = currentPairs.find(p => p.left === choice.left && p.right === choice.right);
    if (correct) {
      score++;
      // color matched pair green with transparency
      [...leftItems].find(i => i.dataset.value === choice.left).style.background = "rgba(0,255,0,0.3)";
      [...rightItems].find(i => i.dataset.value === choice.right).style.background = "rgba(0,255,0,0.3)";
    } else {
      // wrong pair red with transparency
      [...leftItems].find(i => i.dataset.value === choice.left).style.background = "rgba(255,0,0,0.3)";
      [...rightItems].find(i => i.dataset.value === choice.right).style.background = "rgba(255,0,0,0.3)";
    }
  });

  document.getElementById("score").textContent = `Score: ${score} / ${currentPairs.length}`;
}

function togglePause() {
  playTapSound();
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "Resume" : "Pause";
  if (audio) {
    if (paused) audio.pause();
    else audio.play();
  }
}

function backToSaved() {
  playTapSound();
  clearInterval(timerInterval);
  if (audio) audio.pause();
  goPage("savedQuizPage");
  document.getElementById("score").textContent = "";
  matched = [];
  selectedLeft = null;
  selectedRight = null;
}

// Utility
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker registered successfully"))
    .catch(err => console.error("Service Worker registration failed:", err));
}
