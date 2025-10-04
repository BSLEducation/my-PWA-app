let quizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
let currentQuiz = [];
let currentPairs = [];
let timerInterval;
let audio = null;
let timeLeft = 0;
let paused = false;

function goPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  if (id === "savedQuizPage") refreshQuizList();
}

// --- New Quiz ---
function makeQuiz() {
  const lines = document.getElementById("quizInput").value.trim().split("\n");
  currentQuiz = lines.map(l => {
    const [left, right] = l.split(",");
    return { left: left.trim(), right: right.trim() };
  });
  alert("Quiz created. You can Save now.");
}
function editQuiz() {
  document.getElementById("quizInput").value = currentQuiz.map(p => `${p.left},${p.right}`).join("\n");
}
function saveQuiz() {
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
  const name = document.getElementById("quizList").value;
  if (!name) return;
  delete quizzes[name];
  localStorage.setItem("quizzes", JSON.stringify(quizzes));
  refreshQuizList();
}
function setBackgroundImage(event) {
  const file = event.target.files[0];
  if (file) {
    document.body.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
    document.body.style.backgroundSize = "cover";
  }
}
function setBackgroundSound(event) {
  const file = event.target.files[0];
  if (file) {
    if (audio) audio.pause();
    audio = new Audio(URL.createObjectURL(file));
    audio.loop = true;
    audio.play();
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

  // timer
  timeLeft = parseInt(document.getElementById("countdownInput").value);
  document.getElementById("timer").textContent = `Time: ${timeLeft}`;
  timerInterval = setInterval(updateTimer, 1000);
  paused = false;
}

function updateTimer() {
  if (paused) return;
  timeLeft--;
  document.getElementById("timer").textContent = `Time: ${timeLeft}`;
  if (timeLeft <= 0) endQuiz();
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
  if (side === "left") {
    if (selectedLeft) selectedLeft.style.background = "#333";
    selectedLeft = div;
    div.style.background = "#666";
  } else {
    if (selectedRight) selectedRight.style.background = "#333";
    selectedRight = div;
    div.style.background = "#666";
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

  // Reveal correct/wrong answers
  const leftItems = document.querySelectorAll("#leftColumn .item");
  const rightItems = document.querySelectorAll("#rightColumn .item");

  let score = 0;
  matched.forEach(choice => {
    const correct = currentPairs.find(p => p.left === choice.left && p.right === choice.right);
    if (correct) {
      score++;
      // color matched pair green
      [...leftItems].find(i => i.dataset.value === choice.left).style.background = "green";
      [...rightItems].find(i => i.dataset.value === choice.right).style.background = "green";
    } else {
      // wrong pair red
      [...leftItems].find(i => i.dataset.value === choice.left).style.background = "red";
      [...rightItems].find(i => i.dataset.value === choice.right).style.background = "red";
    }
  });

  document.getElementById("score").textContent = `Score: ${score} / ${currentPairs.length}`;
}

function togglePause() {
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "Resume" : "Pause";
  if (audio) {
    if (paused) audio.pause();
    else audio.play();
  }
}

function backToSaved() {
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
