export default function renderRenameForm(video, { onRename } = {}) {
  const form = document.createElement('form');
  form.className = 'videotube-rename';
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = form.querySelector('input');
    onRename?.(video.id, input.value);
  });

  const label = document.createElement('label');
  label.textContent = 'Video title';

  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 60;
  input.className = 'videotube-input';
  input.placeholder = video.fallbackLabel;
  input.value = video.customName || '';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'videotube-button videotube-button--secondary';
  submit.textContent = 'Save title';

  form.append(label, input, submit);
  return form;
}
