const API_BASE_URL = 'http://localhost:8000';

// State
let jobs = [];
let selectedDashboardJobId = null;

// DOM Elements
const views = {
    dashboard: document.getElementById('view-dashboard'),
    upload: document.getElementById('view-upload'),
    jobs: document.getElementById('view-jobs')
};

const navItems = {
    dashboard: document.getElementById('nav-dashboard'),
    upload: document.getElementById('nav-upload'),
    jobs: document.getElementById('nav-jobs')
};

// Navigation Logic
function switchView(viewName) {
    // Update active nav
    Object.values(navItems).forEach(item => item.classList.remove('active'));
    navItems[viewName].classList.add('active');

    // Update view visibility
    Object.values(views).forEach(view => view.classList.add('hidden'));
    views[viewName].classList.remove('hidden');

    // Reload data if needed
    if (viewName === 'dashboard') {
        loadCandidates();
    }
}

Object.keys(navItems).forEach(key => {
    navItems[key].addEventListener('click', (e) => {
        e.preventDefault();
        switchView(key);
    });
});

// Fetch Jobs
async function fetchJobs() {
    try {
        const response = await fetch(`${API_BASE_URL}/jobs/`);
        jobs = await response.json();
        populateJobSelects();
    } catch (error) {
        console.error('Error fetching jobs:', error);
    }
}

function populateJobSelects() {
    const dashboardSelect = document.getElementById('dashboard-job-select');
    const uploadSelect = document.getElementById('upload-job-select');
    
    const optionsHtml = jobs.length === 0 
        ? '<option value="">-- No Jobs Available --</option>'
        : '<option value="">-- Select a Job --</option>' + jobs.map(job => `<option value="${job.id}">${job.title}</option>`).join('');

    dashboardSelect.innerHTML = optionsHtml;
    uploadSelect.innerHTML = optionsHtml;

    if (jobs.length > 0 && !selectedDashboardJobId) {
        selectedDashboardJobId = jobs[0].id;
        dashboardSelect.value = selectedDashboardJobId;
        loadCandidates();
    }
}

// Job Creation
document.getElementById('job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('job-title').value;
    const description = document.getElementById('job-description').value;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);

    try {
        const response = await fetch(`${API_BASE_URL}/jobs/`, {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            alert('Job created successfully!');
            document.getElementById('job-form').reset();
            fetchJobs();
            switchView('dashboard');
        }
    } catch (error) {
        console.error('Error creating job:', error);
    }
});

// Dashboard Logic
document.getElementById('dashboard-job-select').addEventListener('change', (e) => {
    selectedDashboardJobId = e.target.value;
    loadCandidates();
});

async function loadCandidates() {
    if (!selectedDashboardJobId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/candidates/${selectedDashboardJobId}`);
        const candidates = await response.json();
        
        renderCandidatesTable(candidates);
        updateMetrics(candidates);
    } catch (error) {
        console.error('Error loading candidates:', error);
    }
}

function getScoreBadgeClass(score) {
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-med';
    return 'score-low';
}

function renderCandidatesTable(candidates) {
    const tbody = document.querySelector('#candidates-table tbody');
    const noMsg = document.getElementById('no-candidates-msg');
    
    if (candidates.length === 0) {
        tbody.innerHTML = '';
        noMsg.style.display = 'block';
        return;
    }
    
    noMsg.style.display = 'none';
    tbody.innerHTML = candidates.map((c, index) => `
        <tr>
            <td>#${index + 1}</td>
            <td><strong>${c.name}</strong></td>
            <td>${c.email}</td>
            <td><span class="score-badge ${getScoreBadgeClass(c.match_score)}">${c.match_score.toFixed(1)}%</span></td>
            <td>
                <button class="btn" style="padding: 6px 12px; background: var(--border-color); color: var(--text-main);" onclick="alert('Viewing profile for ${c.name}')">View</button>
            </td>
        </tr>
    `).join('');
}

function updateMetrics(candidates) {
    document.getElementById('total-screened').innerText = candidates.length;
    document.getElementById('top-matches').innerText = candidates.filter(c => c.match_score >= 80).length;
}

// Upload Logic
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('resume-file');
const fileInfo = document.getElementById('file-info');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        updateFileInfo();
    }
});

fileInput.addEventListener('change', updateFileInfo);

function updateFileInfo() {
    if (fileInput.files.length > 0) {
        fileInfo.innerText = `Selected file: ${fileInput.files[0].name}`;
    }
}

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const jobId = document.getElementById('upload-job-select').value;
    const name = document.getElementById('candidate-name').value;
    const email = document.getElementById('candidate-email').value;
    const file = fileInput.files[0];

    if (!jobId || !file) {
        alert('Please select a job and a file.');
        return;
    }

    const formData = new FormData();
    formData.append('job_id', jobId);
    formData.append('name', name);
    formData.append('email', email);
    formData.append('file', file);

    const btn = document.getElementById('upload-btn');
    const statusMsg = document.getElementById('upload-status');
    const resultMsg = document.getElementById('upload-result');

    btn.disabled = true;
    statusMsg.classList.remove('hidden');
    resultMsg.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/upload/`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            statusMsg.classList.add('hidden');
            resultMsg.classList.remove('hidden');
            resultMsg.innerHTML = `
                <h3>Analysis Complete!</h3>
                <div class="big-score ${getScoreBadgeClass(data.score)}">${data.score.toFixed(1)}% Match</div>
                <p>Candidate ${data.name} has been added to the dashboard.</p>
                <button class="btn btn-primary" style="margin-top: 15px;" onclick="document.getElementById('upload-form').reset(); fileInfo.innerText=''; resultMsg.classList.add('hidden'); document.getElementById('upload-btn').disabled=false;">Screen Another</button>
            `;
            // Switch to dashboard after 3 seconds maybe?
            // setTimeout(() => switchView('dashboard'), 3000);
        } else {
            throw new Error(data.detail || 'Upload failed');
        }
    } catch (error) {
        console.error('Error uploading:', error);
        alert('Upload failed: ' + error.message);
        btn.disabled = false;
        statusMsg.classList.add('hidden');
    }
});

// Initialize
fetchJobs();
