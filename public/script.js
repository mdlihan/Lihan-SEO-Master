let settings = { 
    geminiKeys: [], 
    mistralKeys: [], 
    apiKeys: [], 
    aiProvider: 'gemini', 
    aiModel: 'auto', 
    imageType: 'Photography', 
    titleWords: 10, 
    descWords: 30, 
    tagCount: 25, 
    batchSize: 4, 
    customPrompt: '' 
};

let filesData = [];
let isProcessing = false;
let stopRequested = false;
let currentLoadedProvider = 'gemini'; // Kon provider-er key box-e ache ta track korbe

const dropArea = document.getElementById('dropArea');
const imageInput = document.getElementById('imageInput');
const fileList = document.getElementById('fileList');
const statusText = document.getElementById('statusText');
const apiKeysContainer = document.getElementById('apiKeysContainer');
const liveApiKeyStatus = document.getElementById('liveApiKeyStatus');

const providerModels = {
    gemini: [
        { value: 'auto', label: '⚡ Auto (Smart Fallback)' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8B' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
    ],
    mistral: [
        { value: 'auto', label: '⚡ Auto (Pixtral Fallback)' },
        { value: 'pixtral-12b-2409', label: 'Pixtral 12B (Fast Vision)' },
        { value: 'pixtral-large-latest', label: 'Pixtral Large (High Quality)' }
    ]
};

function populateModels(provider) {
    const aiModelSelect = document.getElementById('aiModel');
    if (!aiModelSelect) return;
    aiModelSelect.innerHTML = '';
    const models = providerModels[provider] || providerModels.gemini;
    models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.value;
        opt.textContent = m.label;
        aiModelSelect.appendChild(opt);
    });
}

// Box-e thaka key-gulo sothik provider-er array-te save korbe
function saveCurrentInputsToProvider(providerName) {
    const currentInputs = document.querySelectorAll('.api-key-input');
    // যেকোনো বাড়তি স্পেস বা কোটেশন অটোমেটিক পরিষ্কার করবে
    const currentKeys = Array.from(currentInputs)
        .map(inp => inp.value.replace(/['"\s]+/g, '').trim())
        .filter(v => v);
    
    if (providerName === 'mistral') {
        // Mistral-এর ঘরে ভুলে Gemini Key (AIza...) থাকলে তা বাদ দিয়ে দেবে
        settings.mistralKeys = currentKeys.filter(k => !k.startsWith('AIza'));
    } else {
        settings.geminiKeys = currentKeys;
    }
    updateBadgeNumbersOnly();
}

function updateBadgeNumbersOnly() {
    const gemBadge = document.getElementById('geminiKeyCount');
    const misBadge = document.getElementById('mistralKeyCount');
    if (gemBadge) gemBadge.textContent = (settings.geminiKeys || []).length;
    if (misBadge) misBadge.textContent = (settings.mistralKeys || []).length;
}

function renderApiKeysForProvider(provider) {
    if (!apiKeysContainer) return;
    apiKeysContainer.innerHTML = '';
    currentLoadedProvider = provider;
    
    const labelEl = document.getElementById('activeProviderLabel');
    if (labelEl) labelEl.textContent = provider === 'gemini' ? 'Gemini' : 'Mistral';

    const keysToLoad = provider === 'gemini' ? (settings.geminiKeys || []) : (settings.mistralKeys || []);
    
    if (keysToLoad.length === 0) {
        apiKeysContainer.appendChild(createApiKeyRow('', provider));
    } else {
        keysToLoad.forEach(key => apiKeysContainer.appendChild(createApiKeyRow(key, provider)));
    }
    updateBadgeNumbersOnly();
}

function createApiKeyRow(val = '', provider = 'gemini') {
    const div = document.createElement('div');
    div.className = 'api-key-row';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '8px';
    div.style.marginBottom = '10px';

    const placeholderText = provider === 'mistral' ? 'Mistral API Key' : 'Gemini API Key';

    div.innerHTML = `
    <div style="position: relative; flex-grow: 1;">
        <input type="password" class="api-key-input" placeholder="${placeholderText}" value="${val}" required style="width: 100%; padding-right: 50px; box-sizing: border-box; height: 42px; border: 1px solid #ccc; border-radius: 6px; padding-left: 10px;">
        <button type="button" class="toggle-password-btn" style="position: absolute; right: 0px; top: 0px; height: 100%; background: transparent; border: none; cursor: pointer; font-size: 18px; color: #64748b; padding: 0 15px; z-index: 10; touch-action: manipulation; outline: none;">
            <i class="fa-solid fa-eye"></i>
        </button>
    </div>
    <button type="button" class="btn-icon remove-key-btn" title="Remove Key" style="color:red; background: none; border: none; cursor: pointer; font-size: 20px; padding: 10px; touch-action: manipulation;">
        <i class="fa-solid fa-xmark"></i>
    </button>`;

    const toggleBtn = div.querySelector('.toggle-password-btn');
    const inputField = div.querySelector('.api-key-input');
    const removeBtn = div.querySelector('.remove-key-btn');
    
    inputField.addEventListener('input', () => {
        saveCurrentInputsToProvider(currentLoadedProvider);
    });

    removeBtn.addEventListener('click', () => {
        if (document.querySelectorAll('.api-key-row').length > 1) {
            div.remove();
        } else {
            inputField.value = '';
        }
        saveCurrentInputsToProvider(currentLoadedProvider);
    });

    const toggleAction = (e) => {
        e.preventDefault(); 
        if (inputField.type === 'password') {
            inputField.type = 'text';
            toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>'; 
        } else {
            inputField.type = 'password';
            toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>'; 
        }
    };

    toggleBtn.addEventListener('click', toggleAction);
    toggleBtn.addEventListener('touchstart', toggleAction, { passive: false });

    return div;
}

const addApiKeyBtn = document.getElementById('addApiKeyBtn');
if(addApiKeyBtn && apiKeysContainer) {
    addApiKeyBtn.addEventListener('click', () => {
        apiKeysContainer.appendChild(createApiKeyRow('', currentLoadedProvider));
        saveCurrentInputsToProvider(currentLoadedProvider);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebarPanel') || document.getElementById('sidebar') || document.querySelector('.sidebar');
    const closeSidebarBtn = document.querySelector('.sidebar-close-btn');
    
    if (mobileMenuBtn) {
        const toggleMenu = (e) => { e.preventDefault(); if (sidebar) sidebar.classList.add('active', 'show', 'mobile-open'); };
        mobileMenuBtn.addEventListener('click', toggleMenu);
        mobileMenuBtn.addEventListener('touchstart', toggleMenu, { passive: false });
    }

    if (closeSidebarBtn) {
        const closeMenu = (e) => { e.preventDefault(); if (sidebar) sidebar.classList.remove('active', 'show', 'mobile-open'); };
        closeSidebarBtn.addEventListener('click', closeMenu);
        closeSidebarBtn.addEventListener('touchstart', closeMenu, { passive: false });
    }

    const savedSettings = localStorage.getItem('stockSeoSettingsProMax');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
        if (settings.apiKeys && settings.apiKeys.length > 0 && (!settings.geminiKeys || settings.geminiKeys.length === 0)) {
            settings.geminiKeys = [...settings.apiKeys];
        }
    }

    currentLoadedProvider = settings.aiProvider || 'gemini';

    const aiProviderEl = document.getElementById('aiProvider');
    if (aiProviderEl) {
        aiProviderEl.value = currentLoadedProvider;
        populateModels(currentLoadedProvider);

        aiProviderEl.addEventListener('change', (e) => {
            // Age purono provider-er key save korbe, tarpor notun provider load korbe
            saveCurrentInputsToProvider(currentLoadedProvider);
            
            const newProvider = e.target.value;
            settings.aiProvider = newProvider;
            settings.aiModel = 'auto'; // Provider change korle model auto-te reset hobe
            
            populateModels(newProvider);
            renderApiKeysForProvider(newProvider);
            localStorage.setItem('stockSeoSettingsProMax', JSON.stringify(settings));
        });
    } else {
        populateModels('gemini');
    }

    const selectElements = ['imageType', 'aiModel', 'csvPlatform'];
    selectElements.forEach(id => {
        const el = document.getElementById(id);
        if (el && settings[id]) {
            // Check if saved model exists in current provider dropdown
            const optionExists = Array.from(el.options).some(opt => opt.value === settings[id]);
            el.value = optionExists ? settings[id] : el.options[0]?.value;
        }
    });

    ['titleWords', 'descWords', 'tagCount', 'batchSize'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = settings[id];
            const valEl = document.getElementById(id.replace('Words', 'Val').replace('Count', 'Val').replace('Size', 'SizeVal'));
            if (valEl) valEl.textContent = settings[id];
        }
    });
    
    const batchStatEl = document.getElementById('batchCountStatas');
    if(batchStatEl) batchStatEl.innerHTML = settings.batchSize;

    if (settings.customPrompt) {
        const customPromptCheck = document.getElementById('enableCustomPrompt');
        const customPromptArea = document.getElementById('customPrompt');
        if(customPromptCheck) customPromptCheck.checked = true;
        if(customPromptArea) { customPromptArea.style.display = 'block'; customPromptArea.value = settings.customPrompt; }
    }

    renderApiKeysForProvider(currentLoadedProvider);
});

const settingsForm = document.getElementById('settingsForm');
if(settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCurrentInputsToProvider(currentLoadedProvider);

        const activeProvider = document.getElementById('aiProvider')?.value || 'gemini';
        const activeKeys = activeProvider === 'gemini' ? settings.geminiKeys : settings.mistralKeys;

        if (!activeKeys || activeKeys.length === 0) {
            return alert(`Please add at least one ${activeProvider.toUpperCase()} API key.`);
        }

        settings.aiProvider = activeProvider;
        const imgTypeEl = document.getElementById('imageType'); if(imgTypeEl) settings.imageType = imgTypeEl.value;
        const aiModelEl = document.getElementById('aiModel'); if(aiModelEl) settings.aiModel = aiModelEl.value;
        const titleEl = document.getElementById('titleWords'); if(titleEl) settings.titleWords = parseInt(titleEl.value);
        const descEl = document.getElementById('descWords'); if(descEl) settings.descWords = parseInt(descEl.value);
        const tagEl = document.getElementById('tagCount'); if(tagEl) settings.tagCount = parseInt(tagEl.value);
        const batchEl = document.getElementById('batchSize'); if(batchEl) settings.batchSize = parseInt(batchEl.value); 
        
        const customPromptCheck = document.getElementById('enableCustomPrompt');
        const customPromptArea = document.getElementById('customPrompt');
        settings.customPrompt = customPromptCheck && customPromptCheck.checked ? customPromptArea.value : '';
        
        localStorage.setItem('stockSeoSettingsProMax', JSON.stringify(settings));
        
        const msg = document.getElementById('saveMsg');
        if(msg) { msg.textContent = "✅ Saved Permanently!"; msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 3000); }
    });
}

['titleWords', 'descWords', 'tagCount', 'batchSize'].forEach(id => {
    const slider = document.getElementById(id);
    const badge = document.getElementById(id.replace('Words', 'Val').replace('Count', 'Val').replace('Size', 'SizeVal'));
    if(slider && badge) {
        slider.addEventListener('input', () => {
            badge.textContent = slider.value;
            if(id === 'batchSize') {
                const batchStatEl = document.getElementById('batchCountStatas');
                if(batchStatEl) batchStatEl.innerHTML = slider.value;
            }
        });
    }
});

const enableCustomPromptEl = document.getElementById('enableCustomPrompt');
if(enableCustomPromptEl) {
    enableCustomPromptEl.addEventListener('change', (e) => {
        const cp = document.getElementById('customPrompt');
        if(cp) cp.style.display = e.target.checked ? 'block' : 'none';
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const isVideo = ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext);
        if (isVideo) return resolve(file); 

        const isVector = ['eps', 'ai'].includes(ext);
        if (isVector) {
            const reader = new FileReader();
            const slice = file.slice(0, 5 * 1024 * 1024); 
            reader.onload = (e) => {
                const content = e.target.result;
                const match = content.match(/<xapGImg:image>(.*?)<\/xapGImg:image>/s) || content.match(/<xmpGImg:image>(.*?)<\/xmpGImg:image>/s);
                if (match && match[1]) {
                    try {
                        const base64Data = match[1].replace(/&#xA;/g, '').replace(/\s/g, '');
                        const byteString = atob(base64Data);
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                        const blob = new Blob([ab], { type: 'image/jpeg' });
                        resolve(new File([blob], file.name + ".jpg", { type: 'image/jpeg' }));
                    } catch(err) { resolve(file); }
                } else { resolve(file); }
            };
            reader.onerror = () => resolve(file);
            reader.readAsText(slice);
            return;
        }

        if (file.size < 150 * 1024 || ext === 'svg') return resolve(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                const MAX = 800; 
                if (width > height && width > MAX) { height = Math.round((height * MAX) / width); width = MAX; } 
                else if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, width, height); 
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => resolve(blob ? new File([blob], file.name + ".jpg", { type: 'image/jpeg' }) : file), 'image/jpeg', 0.6);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
    document.body.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); });
    if(dropArea) dropArea.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); });
});
if(dropArea) {
    dropArea.addEventListener('dragover', () => dropArea.classList.add('active'));
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('active'));
    dropArea.addEventListener('drop', (e) => {
        dropArea.classList.remove('active');
        if (e.dataTransfer.files.length > 0) handleFiles(Array.from(e.dataTransfer.files));
    });
    dropArea.addEventListener('click', () => imageInput.click());
}
if(imageInput) {
    imageInput.addEventListener('change', function() { if (this.files.length > 0) handleFiles(Array.from(this.files)); this.value = ''; });
}

async function handleFiles(filesArray) {
    if (!filesArray.length) return;
    if(statusText) statusText.textContent = `Loading ${filesArray.length} files... ⏳`;
    const startBtn = document.getElementById('startProcessBtn');
    if(startBtn) startBtn.disabled = true;

    for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        let fileToUpload = await compressImage(file);
        let url = URL.createObjectURL(fileToUpload);
        
        let compressedSizeStr = file.size === fileToUpload.size ? 
            `${formatBytes(file.size)} (Original)` : 
            `${formatBytes(file.size)} ➔ ${formatBytes(fileToUpload.size)}`;

        filesData.push({
            id: Date.now() + Math.random(), 
            file: fileToUpload, 
            originalName: file.name, 
            url: url,
            sizeInfo: compressedSizeStr, 
            status: 'pending', 
            usedKeyInfo: '',
            seo: { title: '', description: '', tags: [] }
        });
    }
    
    if(statusText) statusText.textContent = "";
    if(startBtn) startBtn.disabled = false;
    updateCounters(); renderFileList();
}

function updateCounters() {
    const totalCount = document.getElementById('totalCount');
    const doneCount = document.getElementById('doneCount');
    const failCount = document.getElementById('failCount');
    
    if(totalCount) totalCount.textContent = filesData.length;
    if(doneCount) doneCount.textContent = filesData.filter(f => f.status === 'success').length;
    
    const failCountNum = filesData.filter(f => f.status === 'failed').length;
    const pendingCountNum = filesData.filter(f => f.status === 'pending').length;
    if(failCount) failCount.textContent = failCountNum;
    
    const retryBtn = document.getElementById('retryFailedBtn');
    const startBtn = document.getElementById('startProcessBtn');
    if (retryBtn) { retryBtn.style.display = failCountNum > 0 && !isProcessing ? 'inline-block' : 'none'; retryBtn.disabled = false; }
    if (startBtn && !isProcessing) startBtn.disabled = (pendingCountNum === 0 && failCountNum > 0);
}

function renderFileList() {
    if(!fileList) return;
    fileList.innerHTML = '';
    filesData.forEach(item => {
        const ext = item.originalName.split('.').pop().toLowerCase();
        
        let thumbHtml = '';
        if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) {
            thumbHtml = `<video src="${item.url}" style="width:100%; height:100%; object-fit:cover;" muted loop playsinline></video>`;
        } else {
            thumbHtml = `<img src="${item.url}" style="width:100%; height:100%; object-fit:cover;">`;
        }
        
        const tagCountNum = item.seo.tags ? item.seo.tags.length : 0;
        const div = document.createElement('div');
        div.className = `file-item ${item.status}`;
        div.id = `item-${item.id}`;
        
        let contentHtml = item.status === 'success' || item.status === 'failed' ? `
            <div class="field-wrapper"><label class="field-label">📌 Title:</label><input type="text" class="edit-input" value="${(item.seo.title || '').replace(/"/g, '&quot;')}" onchange="updateData(${item.id}, 'title', this.value)"></div>
            <div class="field-wrapper"><label class="field-label">📝 Description:</label><textarea class="edit-textarea" rows="2" onchange="updateData(${item.id}, 'description', this.value)">${item.seo.description || ''}</textarea></div>
            <div class="field-wrapper"><label class="field-label">🏷️ Keywords / Tags <span class="tag-counter">(${tagCountNum} tags)</span>:</label><input type="text" class="edit-input" value="${(item.seo.tags || []).join(', ')}" onchange="updateData(${item.id}, 'tags', this.value)"></div>` 
            : `<p style="color:#64748b; font-size:13px; margin:0;">Awaiting Processing...</p>`;

        const keyBadgeHtml = item.usedKeyInfo ? `<span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:10px; font-size:11px; margin-left:8px; font-weight:600;">🔑 ${item.usedKeyInfo}</span>` : '';

        div.innerHTML = `<div class="item-thumb">${thumbHtml}</div>
            <div class="item-content">
                <div class="item-header"><span>${item.originalName} ${keyBadgeHtml}</span><span class="item-status ${item.status === 'success' ? 'status-success' : item.status === 'failed' ? 'status-failed' : ''}" id="status-${item.id}">${item.status === 'failed' ? 'FAILED (Click Retry)' : item.status.toUpperCase()}</span></div>
                <div class="file-meta-info">📦 ${item.sizeInfo}</div>${contentHtml}
            </div><button class="remove-item" onclick="removeItem(${item.id})">✖</button>`;
        fileList.appendChild(div);
    });
}

window.updateData = (id, field, value) => {
    const item = filesData.find(f => f.id === id);
    if (item) { field === 'tags' ? item.seo.tags = value.split(',').map(t => t.trim()).filter(t => t) : item.seo[field] = value; renderFileList(); }
};
window.removeItem = (id) => { filesData = filesData.filter(f => f.id !== id); updateCounters(); renderFileList(); };

function renderSpecificItem(item) {
    const div = document.getElementById(`item-${item.id}`);
    if(!div) return renderFileList();
    div.className = `file-item ${item.status}`;
    const statusSpan = document.getElementById(`status-${item.id}`);
    if(statusSpan) { statusSpan.textContent = item.status === 'failed' ? "FAILED (Click Retry)" : item.status.toUpperCase(); statusSpan.className = `item-status ${item.status === 'success' ? 'status-success' : item.status === 'failed' ? 'status-failed' : ''}`; }
    if(item.status === 'success' || item.status === 'failed') renderFileList(); 
}

function showLimitWaitPopup(seconds = 45) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('limitPopupOverlay');
        const countdownEl = document.getElementById('limitCountdownText');
        const resumeNowBtn = document.getElementById('resumeNowBtn');
        const stopWaitingBtn = document.getElementById('stopWaitingBtn');

        if (!overlay) {
            setTimeout(() => resolve(true), seconds * 1000);
            return;
        }

        let remaining = seconds;
        if (countdownEl) countdownEl.textContent = remaining;
        overlay.style.display = 'flex';

        const timer = setInterval(() => {
            remaining--;
            if (countdownEl) countdownEl.textContent = remaining;
            if (remaining <= 0) {
                cleanup(true);
            }
        }, 1000);

        function cleanup(shouldContinue) {
            clearInterval(timer);
            overlay.style.display = 'none';
            if (resumeNowBtn) resumeNowBtn.onclick = null;
            if (stopWaitingBtn) stopWaitingBtn.onclick = null;
            resolve(shouldContinue);
        }

        if (resumeNowBtn) resumeNowBtn.onclick = () => cleanup(true);
        if (stopWaitingBtn) stopWaitingBtn.onclick = () => cleanup(false);
    });
}

async function processQueue(filesToProcess) {
    stopRequested = false;
    saveCurrentInputsToProvider(currentLoadedProvider);

    const activeProvider = document.getElementById('aiProvider')?.value || settings.aiProvider || 'gemini';
    const selectedModel = document.getElementById('aiModel')?.value || 'auto';
    const CONCURRENT_UPLOADS = parseInt(document.getElementById('batchSize')?.value || settings.batchSize || 4);

    let queue = [...filesToProcess];

    while (queue.length > 0 && !stopRequested) {
        saveCurrentInputsToProvider(currentLoadedProvider);
        const keysToSend = activeProvider === 'mistral' ? settings.mistralKeys : settings.geminiKeys;
        const batch = queue.slice(0, CONCURRENT_UPLOADS);

        if(statusText) statusText.textContent = `Processing ${batch.length} files with ${activeProvider.toUpperCase()}... ⚡`;

        const batchStatEl = document.getElementById('batchCountStatas');
        if(batchStatEl) batchStatEl.innerHTML = batch.length;

        let rateLimitHitInBatch = false;

        await Promise.all(batch.map(async (item) => {
            item.status = 'processing'; 
            renderSpecificItem(item);

            try {
                const formData = new FormData();
                formData.append('image', item.file); 
                formData.append('originalName', item.originalName); 
                formData.append('aiProvider', activeProvider);
                formData.append('apiKeys', keysToSend.join(','));
                formData.append('imageType', document.getElementById('imageType')?.value || settings.imageType);
                formData.append('aiModel', selectedModel); 
                formData.append('titleWords', document.getElementById('titleWords')?.value || settings.titleWords);
                formData.append('descWords', document.getElementById('descWords')?.value || settings.descWords);
                formData.append('tagCount', document.getElementById('tagCount')?.value || settings.tagCount);
                formData.append('customPrompt', settings.customPrompt);

                const response = await fetch('/api/generate-seo', { method: 'POST', body: formData });
                const data = await response.json();
                
                if (response.ok && data.title) { 
                    item.seo = {
                        title: data.title,
                        description: data.description,
                        tags: Array.isArray(data.tags) ? data.tags : []
                    };
                    item.status = 'success'; 

                    if (data.usedKeyNumber) {
                        item.usedKeyInfo = `Key #${data.usedKeyNumber}`;
                        if (liveApiKeyStatus) {
                            liveApiKeyStatus.innerHTML = `🔑 Using Key #${data.usedKeyNumber} (${data.usedKeyHint})`;
                            liveApiKeyStatus.style.background = '#dcfce7';
                            liveApiKeyStatus.style.color = '#15803d';
                        }
                    }
                } else if (response.status === 429) {
                    rateLimitHitInBatch = true;
                    item.status = 'pending';
                } else { 
                    console.error("SEO Error Details:", data);
                    item.status = 'failed'; 
                }
            } catch (error) { 
                console.error("Network Error:", error);
                item.status = 'failed'; 
            }
            
            updateCounters(); 
            renderSpecificItem(item);
        }));

        queue = filesToProcess.filter(f => f.status === 'pending');

        if (rateLimitHitInBatch && queue.length > 0) {
            if (liveApiKeyStatus) {
                liveApiKeyStatus.innerHTML = `⏳ All Keys Limit Reached (Waiting...)`;
                liveApiKeyStatus.style.background = '#fef3c7';
                liveApiKeyStatus.style.color = '#b45309';
            }
            if (statusText) statusText.textContent = `⏳ API Limit reached! Waiting for quota reset to resume automatically...`;

            const shouldResume = await showLimitWaitPopup(45);
            if (!shouldResume) {
                stopRequested = true;
                break;
            }
        }
    }
}

const startProcessBtn = document.getElementById('startProcessBtn');
if(startProcessBtn) {
    startProcessBtn.addEventListener('click', async () => {
        saveCurrentInputsToProvider(currentLoadedProvider);
        const activeProvider = document.getElementById('aiProvider')?.value || settings.aiProvider || 'gemini';
        const activeKeys = activeProvider === 'mistral' ? settings.mistralKeys : settings.geminiKeys;

        if (!activeKeys || activeKeys.length === 0) return alert(`Add ${activeProvider.toUpperCase()} API Key first!`);
        if (filesData.length === 0) return alert("Upload files first.");
        if (isProcessing) return;

        let pendingFiles = filesData.filter(f => f.status === 'pending');
        if (pendingFiles.length === 0) return alert("⚠️ Please click 'Retry Failed' to process failed files.");

        isProcessing = true; 
        startProcessBtn.disabled = true; 
        const retryBtn = document.getElementById('retryFailedBtn');
        if(retryBtn) retryBtn.style.display = 'none';
        
        await processQueue(pendingFiles);

        isProcessing = false; 
        startProcessBtn.disabled = false;
        updateCounters(); renderFileList();
        if(statusText) {
            statusText.textContent = stopRequested 
                ? "⏹️ Processing paused by user." 
                : (filesData.filter(f => f.status === 'failed').length === 0 ? "✅ All files processed successfully!" : `⚠️ Finished with errors. Click 'Retry Failed'.`);
        }
    });
}

const retryFailedBtn = document.getElementById('retryFailedBtn');
if(retryFailedBtn) {
    retryFailedBtn.addEventListener('click', async () => {
        if (isProcessing) return;
        let failedFiles = filesData.filter(f => f.status === 'failed');
        if (failedFiles.length === 0) return;

        failedFiles.forEach(f => f.status = 'pending');
        renderFileList();

        isProcessing = true; 
        retryFailedBtn.disabled = true; 
        if(startProcessBtn) startProcessBtn.disabled = true;

        await processQueue(failedFiles);

        isProcessing = false; 
        if(startProcessBtn) startProcessBtn.disabled = false; 
        retryFailedBtn.disabled = false; 
        updateCounters(); renderFileList();
        if(statusText) statusText.textContent = filesData.filter(f => f.status === 'failed').length === 0 ? "✅ All retried files successful!" : `⚠️ Files still failed. Click Retry again.`;
    });
}

const downloadCsvBtn = document.getElementById('downloadCsvBtn');
if(downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', () => {
        const successFiles = filesData.filter(f => f.status === 'success');
        if (successFiles.length === 0) return alert("No success files to export.");
        const p = document.getElementById('csvPlatform')?.value || 'adobe', escape = (str) => '"' + (str || '').replace(/"/g, '""') + '"';
        let csv = p === 'adobe' ? "Filename,Title,Description,Keywords,Category\n" : "Filename,Description,Keywords,Categories\n";
        successFiles.forEach(i => csv += p === 'adobe' ? `${escape(i.originalName)},${escape(i.seo.title)},${escape(i.seo.description)},${escape(i.seo.tags.join(', '))},""\n` : `${escape(i.originalName)},${escape(i.seo.description)},${escape(i.seo.tags.join(', '))},""\n`);
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${p}_seo_data.csv`; a.click();
    });
}
