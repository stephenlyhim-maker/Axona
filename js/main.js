// --- Active Nav Link Highlighting ---
const allNavItems = document.querySelectorAll('.nav-item');
const currentPath = window.location.pathname.split('/').pop();

let activePage = 'index'; // Default to index
if (currentPath === 'about.html') {
    activePage = 'about';
} else if (currentPath === 'product-detail.html') {
    activePage = 'index'; 
} else if (currentPath === 'index.html' || currentPath === '') {
    activePage = 'index';
}

allNavItems.forEach(item => {
    item.classList.remove('nav-link-active', 'text-gray-900');
    item.classList.add('text-gray-500');

    if (item.dataset.page === activePage) {
        item.classList.add('nav-link-active', 'text-gray-900');
        item.classList.remove('text-gray-500');
    }
});

// --- SCROLL ANIMATIONS (Intersection Observer) ---
// This watches for elements with 'animate-on-scroll' entering the viewport

const observerOptions = {
    root: null, // use the viewport
    rootMargin: '0px',
    threshold: 0.1 // trigger when 10% of the element is visible
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target); // Stop watching once animated
        }
    });
}, observerOptions);

// Start watching all elements with the animation class
document.querySelectorAll('.animate-on-scroll').forEach((element) => {
    observer.observe(element);
});