// Sermon audio, saved by the GitHub robot in assets/data/sermons.json (newest
// first). Fills #sermon-latest (big card) and #sermon-list (the rest) if the
// page has them. data-src on the card or list gives the path to the JSON file.
(function () {
  var card = document.getElementById('sermon-latest');
  var list = document.getElementById('sermon-list');
  if (!card && !list) return;
  function nice(date) {
    return new Date(date + 'T12:00').toLocaleDateString('en-US',
      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  function player(s) {
    return '<audio controls preload="none" src="' + s.mp3 + '"></audio>' +
      '<a class="link-small" href="' + s.mp3 + '" download>Download MP3</a>';
  }
  fetch((card || list).getAttribute('data-src'), { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (all) {
      if (!all.length) return;
      var s = all[0];
      if (card) card.querySelector('.sl-body').innerHTML =
        '<p class="sl-date">' + nice(s.date) + '</p>' +
        '<p class="sl-meta">' + s.minutes + ' minutes</p>' + player(s);
      if (list) list.innerHTML = all.slice(1).map(function (p) {
        return '<li><span class="sr-date">' + nice(p.date) + '</span>' +
          '<span class="sr-meta">' + p.minutes + ' min</span>' + player(p) + '</li>';
      }).join('');
    })
    .catch(function () {});
})();
