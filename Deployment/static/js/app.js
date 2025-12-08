/**
 * Land Classification Dashboard
 * Frontend JavaScript for image upload, prediction, and visualization
 */

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImage = document.getElementById('removeImage');
const predictBtn = document.getElementById('predictBtn');
const compareBtn = document.getElementById('compareBtn');
const emptyState = document.getElementById('emptyState');
const resultsContent = document.getElementById('resultsContent');
const comparisonContent = document.getElementById('comparisonContent');
const predictedClass = document.getElementById('predictedClass');
const confidenceFill = document.getElementById('confidenceFill');
const confidenceValue = document.getElementById('confidenceValue');
const modelUsed = document.getElementById('modelUsed');
const predictionsGrid = document.getElementById('predictionsGrid');
const comparisonGrid = document.getElementById('comparisonGrid');
const consensusClass = document.getElementById('consensusClass');
const agreementValue = document.getElementById('agreementValue');
const heatmapToggle = document.getElementById('heatmapToggle');
const heatmapContainer = document.getElementById('heatmapContainer');
const heatmapOverlay = document.getElementById('heatmapOverlay');
const heatmapOnly = document.getElementById('heatmapOnly');

// State
let selectedFile = null;
let probabilityChart = null;
let comparisonChart = null;
let heatmapLoaded = false;

// Color palette for chart
const chartColors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'
];

const modelColors = {
    'rgb': '#6366f1',
    'rgb_nir': '#8b5cf6',
    'ndvi': '#10b981'
};

// Display name mapping (renames model class names for UI)
function displayName(className) {
    return className; // No renaming
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeUploadZone();
    initializeModelSelector();
});

// Upload Zone Handlers
function initializeUploadZone() {
    uploadZone.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    removeImage.addEventListener('click', (e) => {
        e.stopPropagation();
        clearImage();
    });

    predictBtn.addEventListener('click', runPrediction);
    compareBtn.addEventListener('click', runComparison);
    heatmapToggle.addEventListener('click', toggleHeatmap);
}

// Model Selector
function initializeModelSelector() {
    const modelOptions = document.querySelectorAll('.model-option');
    modelOptions.forEach(option => {
        option.addEventListener('click', () => {
            modelOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
        });
    });
}

// File handling
function handleFileSelect(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/tif'];
    const validExtensions = /\.(png|jpg|jpeg|tif|tiff)$/i;

    if (!validTypes.includes(file.type) && !file.name.match(validExtensions)) {
        alert('Please select a valid image file (PNG, JPG, or TIFF)');
        return;
    }

    selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadZone.style.display = 'none';
        imagePreview.style.display = 'block';
        predictBtn.disabled = false;
        compareBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    selectedFile = null;
    imageInput.value = '';
    previewImg.src = '';
    uploadZone.style.display = 'flex';
    imagePreview.style.display = 'none';
    predictBtn.disabled = true;
    compareBtn.disabled = true;

    // Reset views
    emptyState.style.display = 'flex';
    resultsContent.style.display = 'none';
    comparisonContent.style.display = 'none';
}

// Single Prediction
async function runPrediction() {
    if (!selectedFile) return;

    const selectedModel = document.querySelector('input[name="model"]:checked');
    if (!selectedModel) {
        alert('Please select a model');
        return;
    }

    setLoadingState(predictBtn, true, 'Analyzing...');

    try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('model', selectedModel.value);

        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            displayResults(result);
        } else {
            alert('Prediction failed: ' + result.error);
        }
    } catch (error) {
        console.error('Prediction error:', error);
        alert('An error occurred during prediction');
    } finally {
        setLoadingState(predictBtn, false, 'Analyze');
    }
}

// Compare All Models
async function runComparison() {
    if (!selectedFile) return;

    setLoadingState(compareBtn, true, 'Comparing...');

    try {
        const formData = new FormData();
        formData.append('image', selectedFile);

        const response = await fetch('/compare', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            displayComparisonResults(result);
        } else {
            alert('Comparison failed: ' + result.error);
        }
    } catch (error) {
        console.error('Comparison error:', error);
        alert('An error occurred during comparison');
    } finally {
        setLoadingState(compareBtn, false, 'Compare All');
    }
}

function setLoadingState(button, loading, text) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');

    if (loading) {
        btnText.textContent = text;
        btnLoader.style.display = 'block';
        button.disabled = true;
    } else {
        btnText.textContent = text;
        btnLoader.style.display = 'none';
        button.disabled = false;
    }
}

// Display Single Results
function displayResults(result) {
    emptyState.style.display = 'none';
    resultsContent.style.display = 'block';
    comparisonContent.style.display = 'none';

    predictedClass.textContent = displayName(result.predicted_class);
    modelUsed.textContent = result.model_used;

    setTimeout(() => {
        confidenceFill.style.width = `${result.confidence}%`;
        confidenceValue.textContent = `${result.confidence.toFixed(1)}%`;
    }, 100);

    updatePredictionsGrid(result.probabilities, result.predicted_class);
    updateChart(result.probabilities);
}

// Display Comparison Results
function displayComparisonResults(result) {
    emptyState.style.display = 'none';
    resultsContent.style.display = 'none';
    comparisonContent.style.display = 'block';

    // Update consensus
    consensusClass.textContent = displayName(result.consensus) || 'No consensus';
    agreementValue.textContent = `${result.agreement}% agreement`;

    // Build comparison cards
    comparisonGrid.innerHTML = '';
    const models = result.models;

    Object.entries(models).forEach(([key, data]) => {
        const isWinner = data.predicted_class === result.consensus;
        const card = document.createElement('div');
        card.className = `comparison-card ${isWinner ? 'winner' : ''}`;

        if (data.error) {
            card.innerHTML = `
                <span class="model-name">${data.model_name}</span>
                <span class="predicted-class">Error</span>
                <span class="confidence">${data.error}</span>
            `;
        } else {
            card.innerHTML = `
                <span class="model-name">${data.model_name}</span>
                <span class="predicted-class">${displayName(data.predicted_class)}</span>
                <span class="confidence">${data.confidence.toFixed(1)}%</span>
            `;
        }

        comparisonGrid.appendChild(card);
    });

    // Update comparison chart
    updateComparisonChart(models, result.consensus);
}

function updatePredictionsGrid(probabilities, topClass) {
    predictionsGrid.innerHTML = '';

    Object.entries(probabilities).forEach(([className, probability]) => {
        const item = document.createElement('div');
        item.className = `prediction-item ${className === topClass ? 'top' : ''}`;
        item.innerHTML = `
            <div class="item-class" title="${displayName(className)}">${displayName(className)}</div>
            <div class="item-prob">${probability.toFixed(1)}%</div>
        `;
        predictionsGrid.appendChild(item);
    });
}

function updateChart(probabilities) {
    const ctx = document.getElementById('probabilityChart').getContext('2d');

    if (probabilityChart) {
        probabilityChart.destroy();
    }

    const labels = Object.keys(probabilities).map(displayName);
    const data = Object.values(probabilities);

    probabilityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Probability (%)',
                data: data,
                backgroundColor: chartColors.map(c => c + '80'),
                borderColor: chartColors,
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 15, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#a1a1aa',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        label: (context) => `${context.parsed.x.toFixed(2)}%`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#71717a', font: { family: 'Inter' }, callback: (v) => v + '%' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#a1a1aa', font: { family: 'Inter', size: 11 } }
                }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });
}

function updateComparisonChart(models, consensus) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');

    if (comparisonChart) {
        comparisonChart.destroy();
    }

    const labels = [];
    const confidences = [];
    const colors = [];

    Object.entries(models).forEach(([key, data]) => {
        if (!data.error) {
            labels.push(data.model_name);
            confidences.push(data.confidence);
            colors.push(data.predicted_class === consensus ? '#10b981' : modelColors[key] || '#6366f1');
        }
    });

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Confidence (%)',
                data: confidences,
                backgroundColor: colors.map(c => c + '80'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 15, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#a1a1aa',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: (context) => `${context.parsed.y.toFixed(1)}% confidence`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#71717a', callback: (v) => v + '%' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#a1a1aa', font: { family: 'Inter' } }
                }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });
}

// Heatmap Functions
function toggleHeatmap() {
    if (heatmapContainer.style.display === 'none') {
        if (!heatmapLoaded) {
            fetchHeatmap();
        } else {
            heatmapContainer.style.display = 'block';
            heatmapToggle.classList.add('active');
            heatmapToggle.querySelector('span').textContent = 'Hide Heatmap';
            heatmapToggle.querySelector('i').className = 'fa-solid fa-eye-slash';
        }
    } else {
        heatmapContainer.style.display = 'none';
        heatmapToggle.classList.remove('active');
        heatmapToggle.querySelector('span').textContent = 'Show Heatmap';
        heatmapToggle.querySelector('i').className = 'fa-solid fa-eye';
    }
}

async function fetchHeatmap() {
    if (!selectedFile) return;

    const selectedModel = document.querySelector('input[name="model"]:checked');
    if (!selectedModel) return;

    heatmapToggle.classList.add('loading');
    heatmapToggle.querySelector('span').textContent = 'Loading...';

    try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('model', selectedModel.value);

        const response = await fetch('/heatmap', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            heatmapOverlay.src = result.heatmap_overlay;
            heatmapOnly.src = result.heatmap_only;
            heatmapLoaded = true;
            heatmapContainer.style.display = 'block';
            heatmapToggle.classList.add('active');
            heatmapToggle.querySelector('span').textContent = 'Hide Heatmap';
            heatmapToggle.querySelector('i').className = 'fa-solid fa-eye-slash';
        } else {
            alert('Heatmap generation failed: ' + result.error);
        }
    } catch (error) {
        console.error('Heatmap error:', error);
        alert('Error generating heatmap');
    } finally {
        heatmapToggle.classList.remove('loading');
    }
}

function resetHeatmap() {
    heatmapLoaded = false;
    heatmapContainer.style.display = 'none';
    heatmapOverlay.src = '';
    heatmapOnly.src = '';
    heatmapToggle.classList.remove('active');
    heatmapToggle.querySelector('span').textContent = 'Show Heatmap';
    heatmapToggle.querySelector('i').className = 'fa-solid fa-eye';
}

// ========================================
// Time-Series Analysis Functions
// ========================================

// DOM Elements for Time-Series
const seriesUploadZone = document.getElementById('seriesUploadZone');
const seriesInput = document.getElementById('seriesInput');
const seriesFiles = document.getElementById('seriesFiles');
const seriesCount = document.getElementById('seriesCount');
const clearSeries = document.getElementById('clearSeries');
const analyzeSeriesBtn = document.getElementById('analyzeSeriesBtn');
const timeseriesContent = document.getElementById('timeseriesContent');
const seriesModelUsed = document.getElementById('seriesModelUsed');
const totalImages = document.getElementById('totalImages');
const changeCount = document.getElementById('changeCount');
const changesList = document.getElementById('changesList');
const timelineGrid = document.getElementById('timelineGrid');

let seriesFilesList = [];
let timelineChart = null;

// Initialize Series Upload
if (seriesUploadZone) {
    seriesUploadZone.addEventListener('click', () => seriesInput.click());

    seriesInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleSeriesFiles(Array.from(e.target.files));
        }
    });

    seriesUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        seriesUploadZone.classList.add('dragover');
    });

    seriesUploadZone.addEventListener('dragleave', () => {
        seriesUploadZone.classList.remove('dragover');
    });

    seriesUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        seriesUploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleSeriesFiles(Array.from(e.dataTransfer.files));
        }
    });

    clearSeries.addEventListener('click', clearSeriesFiles);
    analyzeSeriesBtn.addEventListener('click', runSeriesAnalysis);
}

function handleSeriesFiles(files) {
    const validFiles = files.filter(f => {
        const validExtensions = /\.(png|jpg|jpeg|tif|tiff)$/i;
        return f.name.match(validExtensions);
    });

    seriesFilesList = [...seriesFilesList, ...validFiles];

    if (seriesFilesList.length > 0) {
        // Keep upload zone visible but smaller
        seriesUploadZone.classList.add('compact');
        seriesFiles.style.display = 'flex';
        updateSeriesPreview();
        analyzeSeriesBtn.disabled = seriesFilesList.length < 2;
    }
}

function updateSeriesPreview() {
    // Update count
    seriesCount.textContent = `${seriesFilesList.length} images selected`;

    // Show thumbnails
    let previewContainer = document.getElementById('seriesPreviewContainer');
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'seriesPreviewContainer';
        previewContainer.className = 'series-preview-container';
        seriesFiles.insertBefore(previewContainer, seriesFiles.firstChild);
    }
    previewContainer.innerHTML = '';

    seriesFilesList.forEach((file, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'series-thumbnail';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = `Image ${index + 1}`;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-thumb';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeSeriesFile(index);
        };
        thumb.appendChild(img);
        thumb.appendChild(removeBtn);
        previewContainer.appendChild(thumb);
    });
}

function removeSeriesFile(index) {
    seriesFilesList.splice(index, 1);
    if (seriesFilesList.length === 0) {
        clearSeriesFiles();
    } else {
        updateSeriesPreview();
        analyzeSeriesBtn.disabled = seriesFilesList.length < 2;
    }
}

function clearSeriesFiles() {
    seriesFilesList = [];
    seriesInput.value = '';
    seriesUploadZone.classList.remove('compact');
    seriesFiles.style.display = 'none';
    const previewContainer = document.getElementById('seriesPreviewContainer');
    if (previewContainer) previewContainer.innerHTML = '';
    analyzeSeriesBtn.disabled = true;
}

async function runSeriesAnalysis() {
    if (seriesFilesList.length < 2) return;

    const selectedModel = document.querySelector('input[name="model"]:checked');
    if (!selectedModel) {
        alert('Please select a model first');
        return;
    }

    setLoadingState(analyzeSeriesBtn, true, 'Analyzing...');

    try {
        const formData = new FormData();
        seriesFilesList.forEach((file, i) => {
            formData.append('images', file);
            formData.append('dates', `T${i + 1}`);
        });
        formData.append('model', selectedModel.value);

        const response = await fetch('/analyze-series', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            displayTimeSeriesResults(result);
        } else {
            alert('Analysis failed: ' + result.error);
        }
    } catch (error) {
        console.error('Series analysis error:', error);
        alert('Error during analysis');
    } finally {
        setLoadingState(analyzeSeriesBtn, false, 'Analyze Changes');
    }
}

function displayTimeSeriesResults(result) {
    // Hide other views
    emptyState.style.display = 'none';
    resultsContent.style.display = 'none';
    comparisonContent.style.display = 'none';
    timeseriesContent.style.display = 'block';

    // Update summary
    seriesModelUsed.textContent = result.model_used;
    totalImages.textContent = result.total_images;
    changeCount.textContent = result.change_count;

    // Build changes list
    changesList.innerHTML = '';
    if (result.changes.length === 0) {
        changesList.innerHTML = '<div class="no-changes"><i class="fa-solid fa-check-circle"></i> No land use changes detected</div>';
    } else {
        result.changes.forEach(change => {
            const item = document.createElement('div');
            item.className = 'change-item';
            item.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation change-icon"></i>
                <div class="change-details">
                    <div class="change-period">${change.from_date} → ${change.to_date}</div>
                    <div class="change-transition">
                        <span class="from-class">${displayName(change.from_class)}</span>
                        →
                        <span class="to-class">${displayName(change.to_class)}</span>
                    </div>
                </div>
            `;
            changesList.appendChild(item);
        });
    }

    // Build timeline grid with images
    timelineGrid.innerHTML = '';
    const classes = result.timeline.classes;
    result.results.forEach((r, i) => {
        const changed = i > 0 && classes[i] !== classes[i - 1];
        const item = document.createElement('div');
        item.className = `timeline-item ${changed ? 'changed' : ''}`;

        // Create image thumbnail from uploaded file
        let imgHtml = '';
        if (seriesFilesList[i]) {
            imgHtml = `<img src="${URL.createObjectURL(seriesFilesList[i])}" alt="T${i + 1}" class="timeline-img">`;
        }

        item.innerHTML = `
            ${imgHtml}
            <div class="time-label">${r.date}</div>
            <div class="time-class">${displayName(r.predicted_class)}</div>
            <div class="time-conf">${r.confidence.toFixed(1)}%</div>
        `;
        timelineGrid.appendChild(item);
    });

    // Update timeline chart
    updateTimelineChart(result);
}

function updateTimelineChart(result) {
    const ctx = document.getElementById('timelineChart').getContext('2d');

    if (timelineChart) {
        timelineChart.destroy();
    }

    // Create numeric representation for classes
    const uniqueClasses = [...new Set(result.timeline.classes)];
    const classToNum = {};
    uniqueClasses.forEach((c, i) => classToNum[c] = i);

    const data = result.timeline.classes.map(c => classToNum[c]);

    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: result.timeline.dates,
            datasets: [{
                label: 'Land Class',
                data: result.timeline.confidences,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: result.timeline.classes.map((c, i) =>
                    i > 0 && c !== result.timeline.classes[i - 1] ? '#f59e0b' : '#6366f1'
                ),
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 15, 0.9)',
                    callbacks: {
                        label: (context) => {
                            const idx = context.dataIndex;
                            return `${result.timeline.classes[idx]}: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Confidence %', color: '#a1a1aa' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#71717a' }
                },
                x: {
                    title: { display: true, text: 'Time Period', color: '#a1a1aa' },
                    grid: { display: false },
                    ticks: { color: '#a1a1aa' }
                }
            }
        }
    });
}
