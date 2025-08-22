/*!
* Start Bootstrap - Business Casual v7.0.9 (https://startbootstrap.com/theme/business-casual)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-business-casual/blob/master/LICENSE)
*/
// Highlights current date on contact page
window.addEventListener('DOMContentLoaded', event => {
    const listHoursArray = document.body.querySelectorAll('.list-hours li');
    listHoursArray[new Date().getDay()].classList.add(('today'));
})


//revela/oculta contenido
function toggleContent(contentId, button) {
  const content = document.getElementById(contentId);
  const isHidden = content.classList.contains('hidden-content');

  if (isHidden) {
    content.classList.remove('hidden-content');
    content.style.display = 'block';
    button.textContent = 'Show less';
  } else {
    content.classList.add('hidden-content');
    content.style.display = 'none';
    button.textContent = 'Read more';
  }
}

// Ensure all hidden content starts hidden
document.addEventListener('DOMContentLoaded', function() {
  const hiddenElements = document.querySelectorAll('.hidden-content');
  hiddenElements.forEach(function(element) {
    element.style.display = 'none';
  });
});

window.toggleContent = toggleContent;