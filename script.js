(function() {
    'use strict';

    const isProjectPage = window.location.pathname.includes('/projects/');
    const basePath = isProjectPage ? '../' : '';
    
    const DATA_URLS = {
        projects: basePath + 'data/projects.json',
        spend: basePath + 'data/spend.json',
        briefings: basePath + 'data/briefings.json'
    };

    const STAFF_PUBLIC = ['theo', 'poppy', 'clara'];

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

    function renderProjectCard(project, spendData) {
        const projectSpend = spendData.spend.filter(s => s.projectId === project.id);
        const totalTokens = projectSpend.reduce((sum, s) => sum + (s.tokens || 0), 0);
        const staffCount = project.staff.length;

        const staffHtml = project.staff.slice(0, 4).map(s => 
            `<span class="staff-chip">${escapeHtml(s.name)}</span>`
        ).join('');
        const moreStaff = project.staff.length > 4 ? `<span class="staff-chip more">+${project.staff.length - 4}</span>` : '';

        const roadmapHtml = project.roadmap.map(phase => 
            `<div class="roadmap-phase ${getPhaseClass(phase.status)}" title="${escapeHtml(phase.phase)}"></div>`
        ).join('');

        return `
            <article class="project-card" style="--project-color: ${project.color}">
                <div class="project-card-header">
                    <div class="project-status-badge ${project.status.phase}">${escapeHtml(project.status.label)}</div>
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

            const projects = projectsData.projects || [];
            const boardStaff = projectsData.boardStaff || [];

            document.getElementById('total-projects').textContent = projects.length;
            
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

        } catch (error) {
            console.error('Failed to load dashboard:', error);
            projectsContainer.innerHTML = `
                <div class="error-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>DATA LOAD FAILED</span>
                </div>
            `;
        }
    }

    function renderProjectListItem(project, spendData) {
        const projectSpend = spendData.spend.filter(s => s.projectId === project.id);
        const totalTokens = projectSpend.reduce((sum, s) => sum + (s.tokens || 0), 0);

        return `
            <a href="${basePath}projects/${project.id}.html" class="project-list-item" style="--project-color: ${project.color}">
                <div class="list-item-main">
                    <div class="list-item-status ${project.status.phase}">${escapeHtml(project.status.label)}</div>
                    <h3 class="list-item-name">${escapeHtml(project.name)}</h3>
                    <p class="list-item-tagline">${escapeHtml(project.tagline)}</p>
                </div>
                <div class="list-item-meta">
                    <div class="list-item-stat">
                        <span class="stat-value">${project.staff.length}</span>
                        <span class="stat-label">STAFF</span>
                    </div>
                    <div class="list-item-stat">
                        <span class="stat-value">${totalTokens > 0 ? totalTokens.toLocaleString() : '--'}</span>
                        <span class="stat-label">TOKENS</span>
                    </div>
                    <div class="list-item-stat">
                        <span class="stat-value">${project.status.progress !== null ? project.status.progress + '%' : '--'}</span>
                        <span class="stat-label">PROGRESS</span>
                    </div>
                </div>
                <div class="list-item-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"/>
                    </svg>
                </div>
            </a>
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

            const projects = projectsData.projects || [];

            container.innerHTML = projects.map(p => renderProjectListItem(p, spendData)).join('');
            updateLastSync(projectsData.updated);

        } catch (error) {
            console.error('Failed to load projects list:', error);
            container.innerHTML = `
                <div class="error-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>DATA LOAD FAILED</span>
                </div>
            `;
        }
    }

    function renderProjectDetail(project, spendData) {
        const projectSpend = spendData.spend.filter(s => s.projectId === project.id);
        const totalTokens = projectSpend.reduce((sum, s) => sum + (s.tokens || 0), 0);

        const staffHtml = project.staff.map(s => {
            const staffSpend = projectSpend.find(sp => sp.staffId === s.id);
            const tokens = staffSpend?.tokens || 0;
            const hours = staffSpend?.estimatedHours || 'untracked';
            return `
                <div class="staff-detail-card">
                    <div class="staff-detail-name">${escapeHtml(s.name)}</div>
                    <div class="staff-detail-role">${escapeHtml(s.role)}</div>
                    <div class="staff-detail-stats">
                        <span class="staff-stat"><strong>${tokens > 0 ? tokens.toLocaleString() : '--'}</strong> tokens</span>
                        <span class="staff-stat"><strong>${hours !== 'untracked' ? hours : '--'}</strong> hours</span>
                    </div>
                </div>
            `;
        }).join('');

        const roadmapHtml = project.roadmap.map(phase => `
            <div class="roadmap-item ${getPhaseClass(phase.status)}">
                <div class="roadmap-marker"></div>
                <div class="roadmap-content">
                    <span class="roadmap-phase-name">${escapeHtml(phase.phase)}</span>
                    <span class="roadmap-phase-status">${phase.status.replace('-', ' ').toUpperCase()}</span>
                </div>
            </div>
        `).join('');

        const linksHtml = [];
        if (project.domain) {
            linksHtml.push(`<div class="detail-link-item"><span class="link-label">Domain:</span> <span class="link-value">${escapeHtml(project.domain)}</span></div>`);
        }
        if (project.repoUrl) {
            linksHtml.push(`<div class="detail-link-item"><span class="link-label">Repository:</span> <a href="${escapeHtml(project.repoUrl)}" class="link-value" target="_blank" rel="noopener">${escapeHtml(project.repo)}</a></div>`);
        }
        if (project.demoUrl) {
            linksHtml.push(`<div class="detail-link-item"><span class="link-label">Demo:</span> <a href="${escapeHtml(project.demoUrl)}" class="link-value" target="_blank" rel="noopener">View Demo</a></div>`);
        }

        return `
            <header class="project-detail-header" style="--project-color: ${project.color}">
                <div class="project-detail-status ${project.status.phase}">${escapeHtml(project.status.label)}</div>
                <h1 class="project-detail-name">${escapeHtml(project.name)}</h1>
                <p class="project-detail-tagline">${escapeHtml(project.tagline)}</p>
            </header>

            <div class="project-detail-grid">
                <section class="detail-section status-section">
                    <h2 class="section-heading">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        Current Status
                    </h2>
                    <p class="status-summary">${escapeHtml(project.status.summary)}</p>
                    <div class="progress-section">
                        ${renderProgressBar(project.status.progress, project.color)}
                    </div>
                    <div class="next-milestone-block">
                        <span class="milestone-heading">NEXT MILESTONE</span>
                        <span class="milestone-title">${escapeHtml(project.nextMilestone.title)}</span>
                    </div>
                </section>

                <section class="detail-section roadmap-section">
                    <h2 class="section-heading">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Roadmap
                    </h2>
                    <div class="roadmap-timeline">
                        ${roadmapHtml}
                    </div>
                </section>

                <section class="detail-section staff-section">
                    <h2 class="section-heading">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        Staff (${project.staff.length})
                    </h2>
                    <div class="staff-grid">
                        ${staffHtml}
                    </div>
                </section>

                <section class="detail-section spend-section">
                    <h2 class="section-heading">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        Investment
                    </h2>
                    <div class="spend-overview">
                        <div class="spend-stat">
                            <span class="spend-value">${totalTokens > 0 ? totalTokens.toLocaleString() : 'UNTRACKED'}</span>
                            <span class="spend-label">TOKENS USED</span>
                        </div>
                        <div class="spend-chart-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48" opacity="0.3">
                                <line x1="18" y1="20" x2="18" y2="10"/>
                                <line x1="12" y1="20" x2="12" y2="4"/>
                                <line x1="6" y1="20" x2="6" y2="14"/>
                            </svg>
                            <span class="chart-placeholder-text">Spend chart will appear when data is tracked</span>
                        </div>
                    </div>
                </section>

                ${linksHtml.length > 0 ? `
                <section class="detail-section links-section">
                    <h2 class="section-heading">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        Links
                    </h2>
                    <div class="links-list">
                        ${linksHtml.join('')}
                    </div>
                </section>
                ` : ''}

                ${project.stack && project.stack.length > 0 ? `
                <section class="detail-section tech-section">
                    <h2 class="section-heading">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <polyline points="16 18 22 12 16 6"/>
                            <polyline points="8 6 2 12 8 18"/>
                        </svg>
                        Tech Stack
                    </h2>
                    <div class="tech-tags">
                        ${project.stack.map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}
                    </div>
                </section>
                ` : ''}
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

            const project = (projectsData.projects || []).find(p => p.id === projectId);

            if (!project) {
                container.innerHTML = `
                    <div class="error-state">
                        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span>PROJECT NOT FOUND</span>
                    </div>
                `;
                return;
            }

            container.innerHTML = renderProjectDetail(project, spendData);
            document.title = `Mission Control — ${project.name}`;
            updateLastSync(projectsData.updated);

        } catch (error) {
            console.error('Failed to load project detail:', error);
            container.innerHTML = `
                <div class="error-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>DATA LOAD FAILED</span>
                </div>
            `;
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

            const sortedBriefings = briefings.sort((a, b) => {
                const dateA = new Date(a.timestamp || 0);
                const dateB = new Date(b.timestamp || 0);
                return dateB - dateA;
            });

            container.innerHTML = sortedBriefings.map(renderBriefing).join('');

            STAFF_PUBLIC.forEach(staffId => {
                const count = briefings.filter(b => b.staff?.toLowerCase() === staffId).length;
                const countEl = document.getElementById(`${staffId}-count`);
                if (countEl) countEl.textContent = count;
            });

            setupBriefingsFilter();
            updateLastSync(data.updated);

        } catch (error) {
            console.error('Failed to load briefings:', error);
            container.innerHTML = `
                <div class="error-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>DATA LOAD FAILED</span>
                </div>
            `;
        }
    }

    function setupBriefingsFilter() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const briefingItems = document.querySelectorAll('.briefing-feed-item');

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const staff = btn.dataset.staff;
                briefingItems.forEach(item => {
                    if (staff === 'all' || item.dataset.staff === staff) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }

    function detectPage() {
        const path = window.location.pathname;
        if (path.includes('/projects/') && path.endsWith('.html')) {
            return 'project-detail';
        }
        if (path.endsWith('projects.html')) {
            return 'projects-list';
        }
        if (path.endsWith('briefings.html')) {
            return 'briefings';
        }
        return 'dashboard';
    }

    function init() {
        updateHeaderClock();
        setInterval(updateHeaderClock, 1000);

        const page = detectPage();
        
        switch (page) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'projects-list':
                loadProjectsList();
                break;
            case 'project-detail':
                loadProjectDetail();
                break;
            case 'briefings':
                loadBriefingsFeed();
                break;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
