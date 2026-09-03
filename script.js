(function() {
    'use strict';

    const isProjectPage = window.location.pathname.includes('/projects/');
    const basePath = isProjectPage ? '../' : '';
    
    const DATA_URLS = {
        projects: basePath + 'data/projects.json',
        spend: basePath + 'data/spend.json',
        briefings: basePath + 'data/briefings.json'
    };

    const STAFF_PUBLIC = ['theo', 'poppy', 'clara', 'nora', 'rowan', 'julian', 'maeve'];

    const GITHUB_CONFIG = {
        owner: 'amalgyte',
        repo: 'staff-mission-control',
        branch: 'main',
        dataPath: 'data/projects.json'
    };

    const AUTH_STORAGE_KEY = 'smc_github_auth';
    const AUTH_USER_KEY = 'smc_github_user';

    let projectsCache = null;
    let currentUser = null;

    function getStoredAuth() {
        try {
            const token = localStorage.getItem(AUTH_STORAGE_KEY);
            const user = localStorage.getItem(AUTH_USER_KEY);
            if (token && user) {
                currentUser = JSON.parse(user);
                return { token, user: currentUser };
            }
        } catch (e) {
            console.error('Failed to read auth:', e);
        }
        return null;
    }

    function setStoredAuth(token, user) {
        try {
            localStorage.setItem(AUTH_STORAGE_KEY, token);
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
            currentUser = user;
        } catch (e) {
            console.error('Failed to store auth:', e);
        }
    }

    function clearStoredAuth() {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        currentUser = null;
    }

    function isAuthorizedUser() {
        return currentUser && currentUser.login === GITHUB_CONFIG.owner;
    }

    function updateHeaderClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Europe/London'
        });
        const el = document.getElementById('header-timestamp');
        if (el) el.textContent = timeStr;
    }

    function formatTimestamp(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/London'
            });
        } catch {
            return isoString;
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function updateLastSync(timestamp) {
        const el = document.getElementById('last-update');
        if (el) {
            el.textContent = timestamp ? formatTimestamp(timestamp) : 'UNKNOWN';
        }
    }

    function getPhaseClass(status) {
        switch (status) {
            case 'complete': return 'phase-complete';
            case 'in-progress': return 'phase-active';
            case 'ongoing': return 'phase-ongoing';
            case 'untracked': return 'phase-untracked';
            default: return 'phase-pending';
        }
    }

    function renderProgressBar(progress, color) {
        if (progress === null || progress === undefined) {
            return `<div class="progress-bar" style="--project-color: ${color}">
                <div class="progress-fill ongoing" style="width: 100%"></div>
                <span class="progress-label">ONGOING</span>
            </div>`;
        }
        return `<div class="progress-bar" style="--project-color: ${color}">
            <div class="progress-fill" style="width: ${progress}%"></div>
            <span class="progress-label">${progress}%</span>
        </div>`;
    }

    function renderToggle(projectId, isActive, variant = '') {
        const classes = `active-toggle ${variant} ${isActive ? 'on' : 'off'}`;
        const title = isActive ? 'Active — AI spend enabled. Click to pause.' : 'Inactive — AI spend paused. Click to activate.';
        return `
            <div class="${classes}" data-project-id="${escapeHtml(projectId)}" title="${title}" role="button" tabindex="0" aria-pressed="${isActive}">
                <span class="toggle-track">
                    <span class="toggle-thumb"></span>
                </span>
                <span class="toggle-label">${isActive ? 'ON' : 'OFF'}</span>
                ${variant === 'detail' ? `<span class="toggle-hint">${isActive ? 'AI spend enabled' : 'AI spend paused'}</span>` : ''}
            </div>`;
    }

    function renderProjectCard(project, spendData) {
        const projectSpend = spendData.spend.filter(s => s.projectId === project.id);
        const totalTokens = projectSpend.reduce((sum, s) => sum + (s.tokens || 0), 0);

        const staffHtml = project.staff.slice(0, 4).map(s => 
            `<span class="staff-chip">${escapeHtml(s.name)}</span>`
        ).join('');
        const moreStaff = project.staff.length > 4 ? `<span class="staff-chip more">+${project.staff.length - 4}</span>` : '';

        const roadmapHtml = (project.roadmap || []).map(phase => 
            `<div class="roadmap-phase ${getPhaseClass(phase.status)}" title="${escapeHtml(phase.phase)}"></div>`
        ).join('');

        const isActive = project.active === true;
        const activeClass = isActive ? 'project-active' : 'project-inactive';
        const activeToggle = renderToggle(project.id, isActive);

        return `
            <article class="project-card ${activeClass}" style="--project-color: ${project.color}" data-project-id="${escapeHtml(project.id)}">
                <div class="project-card-header">
                    <div class="project-status-badge ${project.status.phase}">${escapeHtml(project.status.label)}</div>
                    ${activeToggle}
                    <div class="project-token-count">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        ${totalTokens > 0 ? totalTokens.toLocaleString() : '--'}
                    </div>
                </div>
                <h3 class="project-name">${escapeHtml(project.name)}</h3>
                <p class="project-tagline">${escapeHtml(project.tagline)}</p>
                <div class="project-progress-section">
                    ${renderProgressBar(project.status.progress, project.color)}
                    <div class="roadmap-mini">${roadmapHtml}</div>
                </div>
                <div class="project-next-milestone">
                    <span class="milestone-label">NEXT:</span>
                    <span class="milestone-text">${escapeHtml(project.nextMilestone.title)}</span>
                </div>
                <div class="project-staff-row">
                    ${staffHtml}${moreStaff}
                </div>
                <a href="${basePath}projects/${project.id}.html" class="project-link">
                    VIEW PROJECT
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <polyline points="9 18 15 12 9 6"/>
                    </svg>
                </a>
            </article>
        `;
    }

    function renderBoardStaffTile(staff) {
        return `
            <div class="board-staff-tile">
                <span class="board-staff-name">${escapeHtml(staff.name)}</span>
                <span class="board-staff-role">${escapeHtml(staff.role)}</span>
            </div>
        `;
    }

    async function loadDashboard() {
        const projectsContainer = document.getElementById('projects-container');
        const boardStaffContainer = document.getElementById('board-staff-container');
        if (!projectsContainer) return;
        try {
            const [projectsRes, spendRes] = await Promise.all([
                fetch(DATA_URLS.projects, { cache: 'no-cache' }),
                fetch(DATA_URLS.spend, { cache: 'no-cache' })
            ]);
            if (!projectsRes.ok) throw new Error(`HTTP ${projectsRes.status}`);
            if (!spendRes.ok) throw new Error(`HTTP ${spendRes.status}`);
            const projectsData = await projectsRes.json();
            const spendData = await spendRes.json();
            projectsCache = projectsData;
            const projects = projectsData.projects || [];
            const boardStaff = projectsData.boardStaff || [];
            const activeProjects = projects.filter(p => p.active === true);
            document.getElementById('total-projects').textContent = activeProjects.length;
            const uniqueStaff = new Set();
            projects.forEach(p => p.staff.forEach(s => uniqueStaff.add(s.id)));
            boardStaff.forEach(s => uniqueStaff.add(s.id));
            document.getElementById('total-staff').textContent = uniqueStaff.size;
            const totalTokens = spendData.totals?.overall?.tokens || 0;
            document.getElementById('total-tokens').textContent = totalTokens > 0 ? totalTokens.toLocaleString() : 'UNTRACKED';
            projectsContainer.innerHTML = projects.map(p => renderProjectCard(p, spendData)).join('');
            if (boardStaffContainer && boardStaff.length > 0) {
                boardStaffContainer.innerHTML = boardStaff.map(renderBoardStaffTile).join('');
            }
            updateLastSync(projectsData.updated);
            attachToggleListeners();
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            projectsContainer.innerHTML = `<div class="error-state"><span>DATA LOAD FAILED</span></div>`;
        }
    }

    function renderProjectListItem(project, spendData) {
        const projectSpend = spendData.spend.filter(s => s.projectId === project.id);
        const totalTokens = projectSpend.reduce((sum, s) => sum + (s.tokens || 0), 0);
        const isActive = project.active === true;
        const activeClass = isActive ? 'project-active' : 'project-inactive';
        const activeToggle = renderToggle(project.id, isActive, 'compact');
        
        return `
            <div class="project-list-item ${activeClass}" style="--project-color: ${project.color}" data-project-id="${escapeHtml(project.id)}">
                <div class="list-item-main">
                    <div class="list-item-badges">
                        <div class="list-item-status ${project.status.phase}">${escapeHtml(project.status.label)}</div>
                        ${activeToggle}
                    </div>
                    <h3 class="list-item-name">${escapeHtml(project.name)}</h3>
                    <p class="list-item-tagline">${escapeHtml(project.tagline)}</p>
                </div>
                <div class="list-item-meta">
                    <div class="list-item-stat"><span class="stat-value">${project.staff.length}</span><span class="stat-label">STAFF</span></div>
                    <div class="list-item-stat"><span class="stat-value">${totalTokens > 0 ? totalTokens.toLocaleString() : '--'}</span><span class="stat-label">TOKENS</span></div>
                    <div class="list-item-stat"><span class="stat-value">${project.status.progress !== null ? project.status.progress + '%' : '--'}</span><span class="stat-label">PROGRESS</span></div>
                </div>
                <a href="${basePath}projects/${project.id}.html" class="list-item-arrow-link">
                    <div class="list-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
                </a>
            </div>
        `;
    }

    async function loadProjectsList() {
        const container = document.getElementById('projects-list-container');
        if (!container) return;
        try {
            const [projectsRes, spendRes] = await Promise.all([
                fetch(DATA_URLS.projects, { cache: 'no-cache' }),
                fetch(DATA_URLS.spend, { cache: 'no-cache' })
            ]);
            if (!projectsRes.ok) throw new Error(`HTTP ${projectsRes.status}`);
            if (!spendRes.ok) throw new Error(`HTTP ${spendRes.status}`);
            const projectsData = await projectsRes.json();
            const spendData = await spendRes.json();
            projectsCache = projectsData;
            container.innerHTML = (projectsData.projects || []).map(p => renderProjectListItem(p, spendData)).join('');
            updateLastSync(projectsData.updated);
            attachToggleListeners();
        } catch (error) {
            console.error('Failed to load projects list:', error);
            container.innerHTML = `<div class="error-state"><span>DATA LOAD FAILED</span></div>`;
        }
    }

    function renderProjectDetail(project, spendData) {
        const projectSpend = spendData.spend.filter(s => s.projectId === project.id);
        const totalTokens = projectSpend.reduce((sum, s) => sum + (s.tokens || 0), 0);
        const isActive = project.active === true;
        const staffHtml = project.staff.map(s => {
            const staffSpend = projectSpend.find(sp => sp.staffId === s.id);
            const tokens = staffSpend?.tokens || 0;
            const hours = staffSpend?.estimatedHours || 'untracked';
            return `<div class="staff-detail-card"><div class="staff-detail-name">${escapeHtml(s.name)}</div><div class="staff-detail-role">${escapeHtml(s.role)}</div><div class="staff-detail-stats"><span class="staff-stat"><strong>${tokens > 0 ? tokens.toLocaleString() : '--'}</strong> tokens</span><span class="staff-stat"><strong>${hours !== 'untracked' ? hours : '--'}</strong> hours</span></div></div>`;
        }).join('');
        const roadmapHtml = (project.roadmap || []).map(phase => `<div class="roadmap-item ${getPhaseClass(phase.status)}"><div class="roadmap-marker"></div><div class="roadmap-content"><span class="roadmap-phase-name">${escapeHtml(phase.phase)}</span><span class="roadmap-phase-status">${phase.status.replace('-', ' ').toUpperCase()}</span></div></div>`).join('');
        const linksHtml = [];
        if (project.domain) linksHtml.push(`<div class="detail-link-item"><span class="link-label">Domain:</span> <span class="link-value">${escapeHtml(project.domain)}</span></div>`);
        if (project.repoUrl) linksHtml.push(`<div class="detail-link-item"><span class="link-label">Repository:</span> <a href="${escapeHtml(project.repoUrl)}" class="link-value" target="_blank" rel="noopener">${escapeHtml(project.repo)}</a></div>`);
        if (project.demoUrl) linksHtml.push(`<div class="detail-link-item"><span class="link-label">Demo:</span> <a href="${escapeHtml(project.demoUrl)}" class="link-value" target="_blank" rel="noopener">View Demo</a></div>`);
        const activeToggleDetail = renderToggle(project.id, isActive, 'detail');
        return `
            <header class="project-detail-header ${isActive ? 'project-active' : 'project-inactive'}" style="--project-color: ${project.color}" data-project-id="${escapeHtml(project.id)}">
                <div class="project-detail-badges">
                    <div class="project-detail-status ${project.status.phase}">${escapeHtml(project.status.label)}</div>
                    ${activeToggleDetail}
                </div>
                <h1 class="project-detail-name">${escapeHtml(project.name)}</h1>
                <p class="project-detail-tagline">${escapeHtml(project.tagline)}</p>
            </header>
            <div class="project-detail-grid">
                <section class="detail-section status-section">
                    <h2 class="section-heading">Current Status</h2>
                    <p class="status-summary">${escapeHtml(project.status.summary)}</p>
                    <div class="progress-section">${renderProgressBar(project.status.progress, project.color)}</div>
                    <div class="next-milestone-block"><span class="milestone-heading">NEXT MILESTONE</span><span class="milestone-title">${escapeHtml(project.nextMilestone.title)}</span></div>
                </section>
                <section class="detail-section roadmap-section">
                    <h2 class="section-heading">Roadmap</h2>
                    <div class="roadmap-timeline">${roadmapHtml}</div>
                </section>
                <section class="detail-section staff-section">
                    <h2 class="section-heading">Staff (${project.staff.length})</h2>
                    <div class="staff-grid">${staffHtml}</div>
                </section>
                <section class="detail-section spend-section">
                    <h2 class="section-heading">Investment</h2>
                    <div class="spend-overview">
                        <div class="spend-stat"><span class="spend-value">${totalTokens > 0 ? totalTokens.toLocaleString() : 'UNTRACKED'}</span><span class="spend-label">TOKENS USED</span></div>
                    </div>
                </section>
                ${linksHtml.length > 0 ? `<section class="detail-section links-section"><h2 class="section-heading">Links</h2><div class="links-list">${linksHtml.join('')}</div></section>` : ''}
                ${project.stack && project.stack.length > 0 ? `<section class="detail-section tech-section"><h2 class="section-heading">Tech Stack</h2><div class="tech-tags">${project.stack.map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}</div></section>` : ''}
            </div>
        `;
    }

    async function loadProjectDetail() {
        const container = document.getElementById('project-detail');
        const projectId = document.body.dataset.projectId;
        if (!container || !projectId) return;
        try {
            const [projectsRes, spendRes] = await Promise.all([
                fetch(DATA_URLS.projects, { cache: 'no-cache' }),
                fetch(DATA_URLS.spend, { cache: 'no-cache' })
            ]);
            if (!projectsRes.ok) throw new Error(`HTTP ${projectsRes.status}`);
            if (!spendRes.ok) throw new Error(`HTTP ${spendRes.status}`);
            const projectsData = await projectsRes.json();
            const spendData = await spendRes.json();
            projectsCache = projectsData;
            const project = (projectsData.projects || []).find(p => p.id === projectId);
            if (!project) {
                container.innerHTML = `<div class="error-state"><span>PROJECT NOT FOUND</span></div>`;
                return;
            }
            container.innerHTML = renderProjectDetail(project, spendData);
            document.title = `Mission Control — ${project.name}`;
            updateLastSync(projectsData.updated);
            attachToggleListeners();
        } catch (error) {
            console.error('Failed to load project detail:', error);
            container.innerHTML = `<div class="error-state"><span>DATA LOAD FAILED</span></div>`;
        }
    }

    function renderBriefing(briefing) {
        const staffClass = briefing.staff ? briefing.staff.toLowerCase() : '';
        const linksHtml = (briefing.links || []).map(link =>
            `<a href="${escapeHtml(link.url)}" class="briefing-link" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
        ).join('');
        return `
            <article class="briefing-feed-item ${staffClass}" data-staff="${staffClass}">
                <div class="briefing-feed-header">
                    <span class="briefing-staff-badge ${staffClass}">${escapeHtml(briefing.staff?.toUpperCase() || 'UNKNOWN')}</span>
                    <span class="briefing-feed-timestamp">${formatTimestamp(briefing.timestamp)}</span>
                </div>
                <h3 class="briefing-feed-title">${escapeHtml(briefing.title)}</h3>
                <p class="briefing-feed-summary">${escapeHtml(briefing.summary)}</p>
                ${linksHtml ? `<div class="briefing-feed-links">${linksHtml}</div>` : ''}
            </article>
        `;
    }

    async function loadBriefingsFeed() {
        const container = document.getElementById('briefings-feed-container');
        if (!container) return;
        try {
            const response = await fetch(DATA_URLS.briefings, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const briefings = data.briefings || [];
            const sortedBriefings = briefings.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
            container.innerHTML = sortedBriefings.map(renderBriefing).join('') || '<div class="empty-state"><span>NO BRIEFINGS YET</span></div>';
            STAFF_PUBLIC.forEach(staffId => {
                const count = briefings.filter(b => b.staff?.toLowerCase() === staffId).length;
                const countEl = document.getElementById(`${staffId}-count`);
                if (countEl) countEl.textContent = count;
            });
            setupBriefingsFilter();
            updateLastSync(data.updated);
        } catch (error) {
            console.error('Failed to load briefings:', error);
            container.innerHTML = `<div class="error-state"><span>DATA LOAD FAILED</span></div>`;
        }
    }

    function applyBriefingsFilter(staff) {
        const briefingItems = document.querySelectorAll('.briefing-feed-item');
        const container = document.getElementById('briefings-feed-container');
        let visible = 0;
        briefingItems.forEach(item => {
            const show = staff === 'all' || item.dataset.staff === staff;
            item.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        let emptyNote = document.getElementById('briefings-filter-empty');
        if (!emptyNote && container) {
            emptyNote = document.createElement('div');
            emptyNote.id = 'briefings-filter-empty';
            emptyNote.className = 'empty-state';
            emptyNote.innerHTML = '<span>NO BRIEFINGS YET</span>';
            container.appendChild(emptyNote);
        }
        if (emptyNote) {
            emptyNote.style.display = visible === 0 ? '' : 'none';
        }
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.staff === staff);
        });
        document.querySelectorAll('.staff-mini-card').forEach(c => {
            c.classList.toggle('active', c.dataset.staff === staff);
        });
    }

    function setupBriefingsFilter() {
        document.querySelectorAll('.filter-btn, .staff-mini-card').forEach(el => {
            el.addEventListener('click', () => {
                const staff = el.dataset.staff;
                if (!staff) return;
                applyBriefingsFilter(staff);
            });
        });
    }

    function detectPage() {
        const path = window.location.pathname;
        if (path.includes('/projects/') && path.endsWith('.html')) return 'project-detail';
        if (path.endsWith('projects.html')) return 'projects-list';
        if (path.endsWith('briefings.html')) return 'briefings';
        return 'dashboard';
    }

    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 200);
        }, 4000);
    }

    function createDeviceFlowModal() {
        const existing = document.getElementById('device-flow-modal');
        if (existing) return existing;

        const modal = document.createElement('div');
        modal.id = 'device-flow-modal';
        modal.className = 'device-flow-modal';
        modal.innerHTML = `
            <div class="device-flow-content">
                <h2 class="device-flow-title">SIGN IN WITH GITHUB</h2>
                <p class="device-flow-instructions">
                    To toggle project status, sign in with GitHub.<br>
                    Only <strong>@amalgyte</strong> can make changes.
                </p>
                <div class="device-flow-code" id="device-code">--------</div>
                <a href="https://github.com/login/device" target="_blank" class="device-flow-link" id="device-verify-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                    </svg>
                    OPEN GITHUB VERIFICATION
                </a>
                <p class="device-flow-status" id="device-status">Enter the code above at GitHub</p>
                <button class="device-flow-close" id="device-close" title="Cancel">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('device-close').addEventListener('click', () => {
            modal.classList.remove('visible');
            if (window.deviceFlowPollInterval) {
                clearInterval(window.deviceFlowPollInterval);
                window.deviceFlowPollInterval = null;
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('visible');
                if (window.deviceFlowPollInterval) {
                    clearInterval(window.deviceFlowPollInterval);
                    window.deviceFlowPollInterval = null;
                }
            }
        });

        return modal;
    }

    async function startDeviceFlow(clientId) {
        const modal = createDeviceFlowModal();
        modal.classList.add('visible');

        const codeEl = document.getElementById('device-code');
        const statusEl = document.getElementById('device-status');
        const linkEl = document.getElementById('device-verify-link');

        codeEl.textContent = '--------';
        statusEl.textContent = 'Requesting code...';
        statusEl.className = 'device-flow-status';

        try {
            const response = await fetch('https://github.com/login/device/code', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: clientId,
                    scope: 'repo'
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to start device flow: ${response.status}`);
            }

            const data = await response.json();
            const { device_code, user_code, verification_uri, expires_in, interval } = data;

            codeEl.textContent = user_code;
            linkEl.href = verification_uri;
            statusEl.textContent = 'Enter this code at GitHub, then return here';

            pollForToken(clientId, device_code, interval || 5, expires_in || 900, modal);

        } catch (error) {
            console.error('Device flow error:', error);
            statusEl.textContent = 'Failed to start sign-in. Check console.';
            statusEl.className = 'device-flow-status error';
        }
    }

    function pollForToken(clientId, deviceCode, interval, expiresIn, modal) {
        const statusEl = document.getElementById('device-status');
        const startTime = Date.now();
        const pollInterval = Math.max(interval, 5) * 1000;

        if (window.deviceFlowPollInterval) {
            clearInterval(window.deviceFlowPollInterval);
        }

        window.deviceFlowPollInterval = setInterval(async () => {
            if (Date.now() - startTime > expiresIn * 1000) {
                clearInterval(window.deviceFlowPollInterval);
                window.deviceFlowPollInterval = null;
                statusEl.textContent = 'Code expired. Please try again.';
                statusEl.className = 'device-flow-status error';
                return;
            }

            try {
                const response = await fetch('https://github.com/login/oauth/access_token', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        client_id: clientId,
                        device_code: deviceCode,
                        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                    })
                });

                const data = await response.json();

                if (data.access_token) {
                    clearInterval(window.deviceFlowPollInterval);
                    window.deviceFlowPollInterval = null;

                    statusEl.textContent = 'Verifying identity...';

                    const userResponse = await fetch('https://api.github.com/user', {
                        headers: {
                            'Authorization': `Bearer ${data.access_token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    if (!userResponse.ok) {
                        throw new Error('Failed to verify user');
                    }

                    const user = await userResponse.json();

                    if (user.login !== GITHUB_CONFIG.owner) {
                        statusEl.textContent = `Signed in as @${user.login}, but only @${GITHUB_CONFIG.owner} can make changes.`;
                        statusEl.className = 'device-flow-status error';
                        setTimeout(() => modal.classList.remove('visible'), 3000);
                        return;
                    }

                    setStoredAuth(data.access_token, user);
                    statusEl.textContent = `Signed in as @${user.login}!`;
                    statusEl.className = 'device-flow-status success';
                    
                    setTimeout(() => {
                        modal.classList.remove('visible');
                        updateAuthUI();
                        showToast(`Signed in as @${user.login}`, 'success');
                    }, 1500);

                } else if (data.error === 'authorization_pending') {
                    // Keep waiting
                } else if (data.error === 'slow_down') {
                    // Slow down polling
                } else if (data.error === 'expired_token') {
                    clearInterval(window.deviceFlowPollInterval);
                    window.deviceFlowPollInterval = null;
                    statusEl.textContent = 'Code expired. Please try again.';
                    statusEl.className = 'device-flow-status error';
                } else if (data.error === 'access_denied') {
                    clearInterval(window.deviceFlowPollInterval);
                    window.deviceFlowPollInterval = null;
                    statusEl.textContent = 'Access denied.';
                    statusEl.className = 'device-flow-status error';
                }

            } catch (error) {
                console.error('Poll error:', error);
            }
        }, pollInterval);
    }

    function updateAuthUI() {
        const auth = getStoredAuth();
        const authSection = document.querySelector('.auth-section');
        
        if (!authSection) return;

        if (auth && auth.user) {
            authSection.innerHTML = `
                <span class="auth-user">
                    <span class="auth-user-dot"></span>
                    @${escapeHtml(auth.user.login)}
                </span>
                <button class="auth-btn signed-in" id="auth-signout">Sign out</button>
            `;
            document.getElementById('auth-signout').addEventListener('click', () => {
                clearStoredAuth();
                updateAuthUI();
                showToast('Signed out', 'info');
            });
        } else {
            authSection.innerHTML = `
                <button class="auth-btn" id="auth-signin">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                    </svg>
                    Sign in
                </button>
            `;
            document.getElementById('auth-signin').addEventListener('click', () => {
                const clientId = window.SMC_GITHUB_CLIENT_ID;
                if (!clientId) {
                    showToast('GitHub OAuth not configured. See console for setup instructions.', 'error');
                    console.error(
                        'GitHub OAuth Setup Required:\n' +
                        '1. Go to https://github.com/settings/developers\n' +
                        '2. Click "New OAuth App"\n' +
                        '3. Set:\n' +
                        '   - Application name: Staff Mission Control\n' +
                        '   - Homepage URL: https://amalgyte.github.io/staff-mission-control/\n' +
                        '   - Authorization callback URL: https://amalgyte.github.io/staff-mission-control/\n' +
                        '4. Enable "Device Flow" in the app settings\n' +
                        '5. Copy the Client ID\n' +
                        '6. Add to index.html before script.js:\n' +
                        '   <script>window.SMC_GITHUB_CLIENT_ID = "your-client-id-here";</script>'
                    );
                    return;
                }
                startDeviceFlow(clientId);
            });
        }
    }

    function createAuthSection() {
        const statusSection = document.querySelector('.status-section');
        if (!statusSection) return;

        const existingAuth = statusSection.querySelector('.auth-section');
        if (existingAuth) return;

        const authSection = document.createElement('div');
        authSection.className = 'auth-section';
        statusSection.insertBefore(authSection, statusSection.firstChild);

        updateAuthUI();
    }

    async function updateProjectActive(projectId, newActive) {
        const auth = getStoredAuth();
        if (!auth || !isAuthorizedUser()) {
            showToast('Sign in as @amalgyte to change project status', 'error');
            return false;
        }

        const fileResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataPath}?ref=${GITHUB_CONFIG.branch}`,
            {
                headers: {
                    'Authorization': `Bearer ${auth.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file: ${fileResponse.status}`);
        }

        const fileData = await fileResponse.json();
        const content = atob(fileData.content);
        const projectsData = JSON.parse(content);

        const project = projectsData.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        project.active = newActive;
        projectsData.updated = new Date().toISOString();

        const newContent = JSON.stringify(projectsData, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(newContent)));

        const updateResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataPath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${auth.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Toggle ${project.name} to ${newActive ? 'active' : 'inactive'}`,
                    content: encodedContent,
                    sha: fileData.sha,
                    branch: GITHUB_CONFIG.branch
                })
            }
        );

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.message || `Failed to update: ${updateResponse.status}`);
        }

        projectsCache = projectsData;
        return true;
    }

    function updateToggleUI(toggle, isActive) {
        toggle.classList.remove('on', 'off');
        toggle.classList.add(isActive ? 'on' : 'off');
        toggle.setAttribute('aria-pressed', isActive);
        toggle.title = isActive 
            ? 'Active — AI spend enabled. Click to pause.' 
            : 'Inactive — AI spend paused. Click to activate.';
        
        const label = toggle.querySelector('.toggle-label');
        if (label) label.textContent = isActive ? 'ON' : 'OFF';

        const hint = toggle.querySelector('.toggle-hint');
        if (hint) hint.textContent = isActive ? 'AI spend enabled' : 'AI spend paused';

        const card = toggle.closest('.project-card, .project-list-item, .project-detail-header');
        if (card) {
            card.classList.remove('project-active', 'project-inactive');
            card.classList.add(isActive ? 'project-active' : 'project-inactive');
        }
    }

    function updateActiveProjectCount() {
        const countEl = document.getElementById('total-projects');
        if (countEl && projectsCache) {
            const activeCount = projectsCache.projects.filter(p => p.active === true).length;
            countEl.textContent = activeCount;
        }
    }

    async function handleToggleClick(toggle) {
        const projectId = toggle.dataset.projectId;
        if (!projectId) return;

        const auth = getStoredAuth();
        if (!auth) {
            const clientId = window.SMC_GITHUB_CLIENT_ID;
            if (!clientId) {
                showToast('GitHub OAuth not configured. Admin setup required.', 'error');
                console.error('See console for GitHub OAuth setup instructions.');
                return;
            }
            startDeviceFlow(clientId);
            return;
        }

        if (!isAuthorizedUser()) {
            showToast(`Only @${GITHUB_CONFIG.owner} can toggle project status`, 'error');
            return;
        }

        const currentlyActive = toggle.classList.contains('on');
        const newActive = !currentlyActive;

        toggle.classList.add('loading');

        updateToggleUI(toggle, newActive);
        document.querySelectorAll(`.active-toggle[data-project-id="${projectId}"]`).forEach(t => {
            if (t !== toggle) updateToggleUI(t, newActive);
        });

        try {
            await updateProjectActive(projectId, newActive);
            updateActiveProjectCount();
            showToast(`${projectId} is now ${newActive ? 'active' : 'inactive'}`, 'success');
        } catch (error) {
            console.error('Failed to update project:', error);
            updateToggleUI(toggle, currentlyActive);
            document.querySelectorAll(`.active-toggle[data-project-id="${projectId}"]`).forEach(t => {
                if (t !== toggle) updateToggleUI(t, currentlyActive);
            });
            showToast(`Failed to update: ${error.message}`, 'error');
        } finally {
            toggle.classList.remove('loading');
        }
    }

    function attachToggleListeners() {
        document.querySelectorAll('.active-toggle').forEach(toggle => {
            if (toggle.dataset.listenerAttached) return;
            toggle.dataset.listenerAttached = 'true';

            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleClick(toggle);
            });

            toggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleClick(toggle);
                }
            });
        });
    }

    function init() {
        updateHeaderClock();
        setInterval(updateHeaderClock, 1000);

        createAuthSection();
        getStoredAuth();

        switch (detectPage()) {
            case 'dashboard': loadDashboard(); break;
            case 'projects-list': loadProjectsList(); break;
            case 'project-detail': loadProjectDetail(); break;
            case 'briefings': loadBriefingsFeed(); break;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
