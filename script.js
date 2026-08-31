(function() {
    'use strict';

    const DATA_URL = 'data/briefings.json';
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

    function renderBriefing(briefing) {
        const linksHtml = (briefing.links || []).map(link =>
            `<a href="${escapeHtml(link.url)}" class="briefing-link" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
        ).join('');

        return `
            <article class="briefing-item">
                <h3 class="briefing-title">${escapeHtml(briefing.title)}</h3>
                <p class="briefing-summary">${escapeHtml(briefing.summary)}</p>
                <div class="briefing-meta">
                    <span class="briefing-timestamp">${formatTimestamp(briefing.timestamp)}</span>
                    ${linksHtml ? `<div class="briefing-links">${linksHtml}</div>` : ''}
                </div>
            </article>
        `;
    }

    function renderEmptyState() {
        return `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span>NO BRIEFINGS AVAILABLE</span>
            </div>
        `;
    }

    function renderErrorState(message) {
        return `
            <div class="error-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderStationContent(staffId, briefings) {
        const contentEl = document.getElementById(`${staffId}-content`);
        if (!contentEl) return;

        const staffBriefings = briefings.filter(b => 
            b.staff && b.staff.toLowerCase() === staffId.toLowerCase()
        );

        if (staffBriefings.length === 0) {
            contentEl.innerHTML = renderEmptyState();
            return;
        }

        const sortedBriefings = staffBriefings.sort((a, b) => {
            const dateA = new Date(a.timestamp || 0);
            const dateB = new Date(b.timestamp || 0);
            return dateB - dateA;
        });

        const html = `
            <div class="briefing-list">
                ${sortedBriefings.map(renderBriefing).join('')}
            </div>
        `;
        contentEl.innerHTML = html;
    }

    function showLoadError(message) {
        STAFF_PUBLIC.forEach(staffId => {
            const contentEl = document.getElementById(`${staffId}-content`);
            if (contentEl) {
                contentEl.innerHTML = renderErrorState(message);
            }
        });
    }

    function updateLastSync(timestamp) {
        const el = document.getElementById('last-update');
        if (el) {
            el.textContent = timestamp ? formatTimestamp(timestamp) : 'UNKNOWN';
        }
    }

    async function loadBriefings() {
        try {
            const response = await fetch(DATA_URL, {
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (!data || !Array.isArray(data.briefings)) {
                throw new Error('Invalid data format');
            }

            STAFF_PUBLIC.forEach(staffId => {
                renderStationContent(staffId, data.briefings);
            });

            updateLastSync(data.updated);

        } catch (error) {
            console.error('Failed to load briefings:', error);
            showLoadError('DATA LOAD FAILED');
            updateLastSync(null);
        }
    }

    function init() {
        updateHeaderClock();
        setInterval(updateHeaderClock, 1000);
        loadBriefings();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();