/**
 * Conditional visual loader. Three.js is the largest JavaScript asset on the
 * page and is only used by the ambient background, so compact/data-saver
 * browsers never download it. Core content and interactions do not depend on
 * this file.
 */
(function () {
  'use strict';

  var saveData = navigator.connection && navigator.connection.saveData;
  var lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2;
  var compact = window.matchMedia && window.matchMedia('(max-width: 759px)').matches;
  var canvas = document.getElementById('glCanvas');

  if (saveData || lowMemory || compact) {
    document.body.classList.add('mobile-lite');
    if (canvas) canvas.style.display = 'none';
    return;
  }

  function load(src, done) {
    var script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = done || null;
    script.onerror = function () {
      if (canvas) canvas.style.display = 'none';
    };
    document.head.appendChild(script);
  }

  load('assets/js/vendor/three.min.js', function () {
    load('assets/js/background.js');
  });
})();
