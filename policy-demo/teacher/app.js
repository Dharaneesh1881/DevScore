// Teacher reference implementation — Task Manager
// Uses jQuery 3.7.0 (version-pinned by admin policy)

$(function () {
  const tasks = [];

  function renderTasks() {
    const $list = $('#task-list');
    $list.empty();
    $('#empty-msg').toggle(tasks.length === 0);
    $('#task-count').text(tasks.length + (tasks.length === 1 ? ' task' : ' tasks'));

    tasks.forEach(function (task, idx) {
      const $item = $('<li class="task-item list-group-item px-2"></li>');

      const $cb = $('<input type="checkbox" />')
        .prop('checked', task.done)
        .on('change', function () {
          tasks[idx].done = this.checked;
          renderTasks();
        });

      const $text = $('<span class="task-text"></span>').text(task.text);
      const $del = $('<button class="btn-delete" title="Delete">✕</button>')
        .on('click', function () {
          tasks.splice(idx, 1);
          renderTasks();
        });

      if (task.done) $item.addClass('done');
      $item.append($cb, $text, $del);
      $list.append($item);
    });
  }

  $('#btn-add').on('click', function () {
    const text = $('#task-input').val().trim();
    if (!text) {
      $('#error-msg').removeClass('d-none');
      return;
    }
    $('#error-msg').addClass('d-none');
    tasks.push({ text, done: false });
    $('#task-input').val('');
    renderTasks();
  });

  // Allow Enter key to add task
  $('#task-input').on('keypress', function (e) {
    if (e.which === 13) $('#btn-add').trigger('click');
  });

  renderTasks();
});
