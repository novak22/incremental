export default function renderPayoutPanel(video, { formatCurrency } = {}) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';

  const title = document.createElement('h3');
  title.textContent = 'Latest payout breakdown';
  panel.appendChild(title);

  if (!video.payoutBreakdown?.entries?.length) {
    const empty = document.createElement('p');
    empty.className = 'videotube-panel__note';
    empty.textContent = 'No payout history yet — run a day to gather data.';
    panel.appendChild(empty);
    return panel;
  }

  const total = document.createElement('p');
  total.className = 'videotube-panel__lead';
  total.textContent = `Total ${formatCurrency?.(video.payoutBreakdown.total)}`;
  panel.appendChild(total);

  const list = document.createElement('ul');
  list.className = 'videotube-list videotube-list--payout';
  video.payoutBreakdown.entries.forEach(entry => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = entry.label;
    const value = document.createElement('span');
    value.textContent = `${entry.percent ? `${Math.round(entry.percent * 100)}% • ` : ''}${formatCurrency?.(entry.amount)}`;
    item.append(label, value);
    list.appendChild(item);
  });
  panel.appendChild(list);

  return panel;
}
