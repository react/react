// Portal target container.
window.container = document.getElementById('container');

let hasInjectedStyles = false;

// DevTools styles are injected into the top-level document head (where the main React app is rendered).
// This method copies those styles to the child window where each panel (e.g. Elements, Profiler) is portaled.
window.injectStyles = getLinkTags => {
  if (!hasInjectedStyles) {
    hasInjectedStyles = true;

    const linkTags = getLinkTags();

    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const linkTag of linkTags) {
      document.head.appendChild(linkTag);
    }
  }
};

// Remove the banner if the user has closed the banner before
// eslint-disable-next-line no-undef
chrome.storage.local.get(['bannerClosed']).then(result => {
  if (result.bannerClosed) {
    const banner = document.querySelector('.dismissable-banner');
    banner.remove();
  }
});

// Remove the banner if the date is after the conference is over
// (May 16, 2024)
const currentDate = new Date();
const may162024 = new Date('May 16, 2024');
if (currentDate > may162024) {
  const banner = document.querySelector('.dismissable-banner');
  banner.remove();
}

// Banner event listener to close the banner when "X" button is clicked
const closeButton = document.querySelector('.dismissable-banner .close');
closeButton.addEventListener('click', () => {
  // Get the parent element of the "X" (the banner) and remove it
  const banner = closeButton.parentElement;
  banner.remove();
  // Save the state to local storage
  // eslint-disable-next-line no-undef
  chrome.storage.local.set({bannerClosed: true});
});
