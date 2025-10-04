export default function renderStatsGrid(video, { formatCurrency } = {}) {
  const stats = document.createElement('dl');
  stats.className = 'videotube-stats-grid';

  const entries = [
    { label: 'Latest payout', value: formatCurrency?.(video.latestPayout) ?? '' },
    { label: 'Daily average', value: formatCurrency?.(video.averagePayout) ?? '' },
    { label: 'Lifetime earned', value: formatCurrency?.(video.lifetimeIncome) ?? '' },
    {
      label: 'ROI',
      value:
        typeof video.roi === 'number'
          ? `${video.roi >= 0 ? '+' : ''}${Math.round(video.roi * 100)}%`
          : 'N/A'
    }
  ];

  entries.forEach(entry => {
    const dt = document.createElement('dt');
    dt.textContent = entry.label;
    const dd = document.createElement('dd');
    dd.textContent = entry.value;
    stats.append(dt, dd);
  });

  return stats;
}
