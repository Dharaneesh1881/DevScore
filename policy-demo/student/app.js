// Student submission — Task Manager (incomplete)

$(function () {
  const tasks = [];

  function renderTasks() {
    const $list = $('#task-list');
    $list.empty();
    $('#empty-msg').toggle(tasks.length === 0);
    // student forgot to update the task count badge

    tasks.forEach(function (task, idx) {
      const $item = $('<li class="task-item list-group-item px-2"></li>');
      const $text = $('<span class="task-text"></span>').text(task.text);

      // student forgot checkbox for marking tasks done

      const $del = $('<button class="btn-delete" title="Delete">✕</button>')
        .on('click', function () {
          tasks.splice(idx, 1);
          renderTasks();
        });

      $item.append($text, $del);
      $list.append($item);
    });
  }

  $('#btn-add').on('click', function () {
    const text = $('#task-input').val().trim();
    if (!text) return; // student has no visible error message
    tasks.push({ text, done: false });
    $('#task-input').val('');
    renderTasks();
  });

  // student forgot Enter key support

  renderTasks();
});
