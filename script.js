const updateName = () => {
    const url = new URL(window.location.href);
    const encodedName = url.searchParams.get("name") || '';
    const name = decodeURIComponent(atob(encodedName)); // Decode the name from Base64 and URI component
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    document.getElementById('namePlaceholder').textContent = displayName ? `, ${displayName}` : '';
};

const nextPage = () => window.location.href = "yes.html";

const moveButton = () => {
    const noButton = document.getElementById('noButton');
    const x = Math.random() * (window.innerWidth - noButton.offsetWidth);
    const y = Math.random() * (window.innerHeight - noButton.offsetHeight);
    noButton.style.left = `${x}px`;
    noButton.style.top = `${y}px`;
};

const forwardWithName = () => {
    const loverName = document.getElementById('loverName').value;
    const encodedName = btoa(encodeURIComponent(loverName)); // Encode the name using Base64 and URI component
    window.location.href = `index.html?name=${encodedName}`;
};

window.addEventListener('load', updateName);
