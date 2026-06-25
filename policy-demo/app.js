// Library Policy Demo — app.js
// Uses jQuery 3.7.0 (version-pinned by admin policy)

$(function () {
  let count = 0;
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
  let colorIdx = 0;

  // ── Counter ────────────────────────────────────────────────────────────────
  $('#btn-increment').on('click', function () {
    count++;
    const $display = $('#counter-display');
    $display.text(count);
    $display.addClass('bump');
    setTimeout(() => $display.removeClass('bump'), 150);
  });

  $('#btn-reset').on('click', function () {
    count = 0;
    $('#counter-display').text(0);
  });

  // ── Color box ──────────────────────────────────────────────────────────────
  $('#btn-change-color').on('click', function () {
    colorIdx = (colorIdx + 1) % COLORS.length;
    $('#color-box').css('background', COLORS[colorIdx]);
  });

  // ── Status badges ──────────────────────────────────────────────────────────
  // Bootstrap loaded → $.fn exists and window.bootstrap exists
  if (window.bootstrap && typeof $.fn === 'object') {
    $('#badge-bootstrap').text('Loaded ✓').removeClass('bg-danger').addClass('bg-success');
  } else {
    $('#badge-bootstrap').text('BLOCKED ✗').removeClass('bg-success').addClass('bg-danger');
  }

  // jQuery itself running → $ works
  if (typeof $ === 'function') {
    $('#badge-jquery').text('Loaded ✓').removeClass('bg-danger').addClass('bg-success');
  } else {
    document.getElementById('badge-jquery').textContent = 'BLOCKED ✗';
  }
});
