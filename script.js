// Centralized API Configuration Setup
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz4kKFWfP1-dP5bFRBYyOBKmmOOSimpD65dYPFKIZt4b13pWkYnQVG9326obLnn_G0D/exec";

function isYouTube(url) {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
}

function extractYouTubeId(url) {
    try {
        if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        if (url.includes('embed/')) return url.split('embed/')[1].split('?')[0];
    } catch (e) {
        console.error("Failed to isolate YouTube ID:", e);
    }
    return null;
}

async function fetchSheetData() {
    try {
        const response = await fetch("data.json?v=${Date.now()}");
        const data = await response.json();
        console.log("🚀 API Fetch Success:", data);
        return data;
    } catch (error) {
        console.error("🚨 API Connection Broken:", error);
        return [];
    }
}

function formatTimestamp(isoString) {
    try {
        if (!isoString) return "Recently";
        const itemDate = new Date(isoString);
        const today = new Date();
        
        const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const diffTime = todayDay - itemDay;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const timeString = String(itemDate.getHours()).padStart(2, '0') + ":" + String(itemDate.getMinutes()).padStart(2, '0');

        if (diffDays === 0) return `Today at ${timeString}`;
        if (diffDays === 1) return `Yesterday at ${timeString}`;
        if (diffDays < 7) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return `${days[itemDate.getDay()]} at ${timeString}`;
        }
        return `${itemDate.getMonth() + 1}-${itemDate.getDate()} at ${timeString}`;
    } catch (e) {
        return "Recently";
    }
}

function hideArticle(link) {
    const hiddenArticles = JSON.parse(localStorage.getItem('hiddenArticles') || '[]');
    hiddenArticles.push(link);
    localStorage.setItem('hiddenArticles', JSON.stringify(hiddenArticles));

    const card = document.querySelector(`[data-link="${link}"]`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9) translateY(10px)';
        setTimeout(() => card.remove(), 300);
    }
}

async function renderNews() {
    const rawData = await fetchSheetData();
    const hiddenArticles = JSON.parse(localStorage.getItem('hiddenArticles') || '[]');
    
    // Filter out locally dismissed elements
    const data = rawData.filter(item => !hiddenArticles.includes(item.link));
    
    const grid = document.getElementById("newsGrid");
    const loading = document.getElementById("loading");

    if (data.length === 0) {
        loading.textContent = "All caught up! No matching entries in the archive.";
        return;
    }

    loading.style.display = "none";
    
    grid.innerHTML = data.map(item => {
        const isVideo = isYouTube(item.link);
        const videoId = isVideo ? extractYouTubeId(item.link) : null;
        const audioUrl = item.audioLink;
        const hasAudio = audioUrl && audioUrl.toString().trim() !== "";
        const archiveUrl = `https://archive.is/?run=1&url=${encodeURIComponent(item.link || '')}`;

        // 🎬 1. VIDEO LAYOUT PROFILE
        if (isVideo && videoId) {
            return `
                <div class="card video-card" data-link="${item.link}">
                    <button class="btn-hide" onclick="hideArticle('${item.link}')" title="Dismiss">×</button>
                    <div class="video-container">
                        <iframe src="https://www.youtube.com/embed/${videoId}" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen>
                        </iframe>
                    </div>
                </div>`;
        }

        // 📰 2. TEXT ARTICLE & PODCAST AUDIO LAYOUT PROFILE
        return `
            <div class="card ${hasAudio ? 'podcast-card' : 'article-card'}" data-link="${item.link}">
                <button class="btn-hide" onclick="hideArticle('${item.link}')" title="Dismiss">×</button>
                
                <div class="card-content">
                    <h3><a href="${item.link}" target="_blank" class="title-link">${item.title || "Untitled Entry"}</a></h3>
                    
                    <div class="meta">
                        <span class="source-tag">${item.source || "Feed"}</span>
                        ${item.keyword ? `<span class="keyword-tag"># ${item.keyword}</span>` : ''}
                        <span>• ${formatTimestamp(item.timestamp)}</span>
                    </div>
                    
                    <div class="summary">${item.summary || "No summary text captured."}</div>
                </div>

                <div class="card-media">
                    ${hasAudio ? `
                        <div class="audio-container">
                            <audio controls preload="none">
                                <source src="${audioUrl}" type="audio/mpeg">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    ` : `
                        <div class="action-buttons">
                            <a href="${archiveUrl}" class="btn-archive" target="_blank">Read on Archive</a>
                        </div>
                    `}
                </div>
            </div>`;
    }).join("");
}

// Initialize Engine
renderNews();
